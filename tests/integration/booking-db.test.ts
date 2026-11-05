/**
 * Reglas de reserva en Postgres (public.create_booking / cancel_booking) contra el Supabase LOCAL.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { book, booked, futureDate, MON, pool, resetData, SAT, SUN, TUE } from '../helpers/db';
import { T } from '../helpers/env';

beforeAll(async () => { await resetData(); });
afterAll(async () => { await pool.end(); });

describe('create_booking: casos válidos', () => {
  it('reserva válida: referencia, servicio y hora de inicio en Madrid', async () => {
    const day = futureDate(0, TUE);
    const r = await book({ day, time: '13:30', party: 4 });
    expect(r.ok).toBe(true);
    expect(r.reference).toMatch(/^LX-[A-HJ-NP-Z2-9]{6}$/);
    expect(r.service).toBe('comida');
    expect(new Date(r.starts_at!).toISOString()).toBe(`${day}T12:30:00.000Z`); // enero: UTC+1
    expect(r.remaining).toBe(76);
    const cena = await book({ day, time: '21:00', party: 2 });
    expect(cena.service).toBe('cena');
  });
  it('normaliza email y guarda consentimiento', async () => {
    const day = futureDate(0, TUE);
    const r = await book({ day, time: '14:00', email: '  ANA@Example.COM ' });
    const { rows } = await pool.query('select email, consent_at, privacy_version from public.bookings where id = $1', [r.id]);
    expect(rows[0].email).toBe('ana@example.com');
    expect(rows[0].consent_at).toBeTruthy();
  });
});

describe('aforo: 80 personas por servicio', () => {
  it('exactamente 80 llena el servicio y la persona 81 se rechaza', async () => {
    const day = futureDate(1, TUE);
    for (let i = 0; i < 6; i++) expect((await book({ day, time: '13:30', party: 12 })).ok).toBe(true); // 72
    expect((await book({ day, time: '14:00', party: 8 })).ok).toBe(true); // 80
    expect(await booked(day, 'comida')).toBe(80);
    const r = await book({ day, time: '14:30', party: 1 });
    expect(r).toMatchObject({ ok: false, error: 'full', remaining: 0 });
    // la cena del mismo día es otro servicio con su propio aforo
    expect((await book({ day, time: '20:30', party: 12 })).ok).toBe(true);
  });
  it('con 79 reservadas: 2 personas no caben (quedan 1), 1 sí', async () => {
    const day = futureDate(2, TUE);
    for (let i = 0; i < 6; i++) await book({ day, time: '13:30', party: 12 });
    await book({ day, time: '13:30', party: 7 }); // 79
    expect(await book({ day, time: '15:00', party: 2 })).toMatchObject({ ok: false, error: 'full', remaining: 1 });
    expect((await book({ day, time: '15:00', party: 1 })).ok).toBe(true);
    expect(await booked(day, 'comida')).toBe(80);
  });
  it('aforo modificado por el restaurante para un día/servicio', async () => {
    const day = futureDate(3, TUE);
    await pool.query(`insert into public.service_exceptions (day, service, closed, capacity) values ($1, 'cena', false, 10)`, [day]);
    expect((await book({ day, time: '21:00', party: 10 })).ok).toBe(true);
    expect(await book({ day, time: '21:00', party: 1 })).toMatchObject({ ok: false, error: 'full' });
    expect((await book({ day, time: '13:30', party: 12 })).ok).toBe(true); // la comida mantiene 80
  });
  it('aforo general configurable (settings.default_capacity) y por día de la semana', async () => {
    const day = futureDate(4, SUN);
    await pool.query(`update public.opening_hours set capacity = 5 where weekday = 7 and service = 'comida'`);
    try {
      expect((await book({ day, time: '13:00', party: 5 })).ok).toBe(true);
      expect(await book({ day, time: '13:00', party: 1 })).toMatchObject({ ok: false, error: 'full' });
    } finally {
      await pool.query(`update public.opening_hours set capacity = null where weekday = 7`);
    }
  });
});

describe('número de personas', () => {
  const day = futureDate(5, SAT);
  it('12 ok, 13 rechazado, 0 y negativos rechazados, 1 ok', async () => {
    expect((await book({ day, time: '13:00', party: 12 })).ok).toBe(true);
    expect(await book({ day, time: '13:00', party: 13 })).toMatchObject({ ok: false, error: 'party_too_large', max: 12 });
    expect(await book({ day, time: '13:00', party: 0 })).toMatchObject({ ok: false, error: 'party_too_small' });
    expect(await book({ day, time: '13:00', party: -4 })).toMatchObject({ ok: false, error: 'party_too_small' });
    expect((await book({ day, time: '13:00', party: 1 })).ok).toBe(true);
  });
});

describe('fechas y horas', () => {
  it('fecha pasada y hora pasada de hoy', async () => {
    expect(await book({ day: '2020-01-07', time: '13:30' })).toMatchObject({ ok: false, error: 'past' });
    // "ahora" = martes 6/1/2032 14:00 en Madrid (13:00 UTC)
    const now = '2032-01-06T13:00:00Z';
    expect(await book({ day: '2032-01-06', time: '13:45', now })).toMatchObject({ ok: false, error: 'past' });
    expect(await book({ day: '2032-01-06', time: '14:00', now })).toMatchObject({ ok: false, error: 'past' });
    expect((await book({ day: '2032-01-06', time: '14:15', now })).ok).toBe(true);
  });
  it('cualquier fecha futura, sin límite de antelación', async () => {
    expect((await book({ day: '2099-12-01', time: '13:30' })).ok).toBe(true); // martes
  });
  it('día cerrado (lunes)', async () => {
    expect(await book({ day: futureDate(6, MON), time: '13:30' })).toMatchObject({ ok: false, error: 'closed_day' });
  });
  it('domingo solo mediodía: la cena está fuera de horario', async () => {
    const day = futureDate(6, SUN);
    expect((await book({ day, time: '13:00' })).ok).toBe(true);
    expect(await book({ day, time: '20:30' })).toMatchObject({ ok: false, error: 'outside_hours' });
  });
  it('fecha bloqueada (día completo) y servicio bloqueado', async () => {
    const day = futureDate(7, TUE);
    await pool.query(`insert into public.service_exceptions (day, service, closed, note) values ($1, null, true, 'Vacaciones')`, [day]);
    expect(await book({ day, time: '13:30' })).toMatchObject({ ok: false, error: 'blocked' });
    expect(await book({ day, time: '21:00' })).toMatchObject({ ok: false, error: 'blocked' });
    const day2 = futureDate(8, TUE);
    await pool.query(`insert into public.service_exceptions (day, service, closed) values ($1, 'cena', true)`, [day2]);
    expect((await book({ day: day2, time: '13:30' })).ok).toBe(true);
    expect(await book({ day: day2, time: '21:00' })).toMatchObject({ ok: false, error: 'blocked', service: 'cena' });
  });
  it('fuera de horario', async () => {
    const day = futureDate(9, TUE);
    for (const time of ['10:00', '12:00', '17:00', '19:00', '23:30', '00:00']) {
      expect(await book({ day, time }), time).toMatchObject({ ok: false, error: 'outside_hours' });
    }
  });
  it('horas límite de cada servicio (apertura y última reserva = cierre − 60 min)', async () => {
    const tue = futureDate(10, TUE), sat = futureDate(10, SAT), sun = futureDate(10, SUN);
    const cases: [string, string, boolean][] = [
      [tue, '13:15', false], [tue, '13:30', true], [tue, '15:00', true], [tue, '15:15', false],
      [tue, '20:15', false], [tue, '20:30', true], [tue, '22:00', true], [tue, '22:15', false],
      [sat, '12:15', false], [sat, '12:30', true], [sat, '15:30', true], [sat, '15:45', false],
      [sat, '19:45', false], [sat, '20:00', true], [sat, '23:00', true], [sat, '23:15', false],
      [sun, '12:45', false], [sun, '13:00', true], [sun, '15:00', true], [sun, '15:15', false],
    ];
    for (const [day, time, ok] of cases) {
      const r = await book({ day, time, party: 1 });
      expect(r.ok, `${day} ${time}`).toBe(ok);
      if (!ok) expect(r.error).toBe('outside_hours');
    }
  });
  it('hora fuera de la rejilla de 15 minutos', async () => {
    expect(await book({ day: futureDate(11, TUE), time: '13:40' })).toMatchObject({ ok: false, error: 'invalid_slot' });
  });
});

describe('zona horaria: cambios de hora (DST)', () => {
  const now = '2026-01-01T00:00:00Z';
  it('domingo 29/03/2026 (entra el horario de verano): 13:00 = 11:00 UTC', async () => {
    const r = await book({ day: '2026-03-29', time: '13:00', now });
    expect(r.ok).toBe(true);
    expect(new Date(r.starts_at!).toISOString()).toBe('2026-03-29T11:00:00.000Z');
    const sat = await book({ day: '2026-03-28', time: '13:00', now });
    expect(new Date(sat.starts_at!).toISOString()).toBe('2026-03-28T12:00:00.000Z');
  });
  it('domingo 25/10/2026 (vuelve el horario de invierno): 13:00 = 12:00 UTC; el sábado 24, 20:30 = 18:30 UTC', async () => {
    const r = await book({ day: '2026-10-25', time: '13:00', now });
    expect(new Date(r.starts_at!).toISOString()).toBe('2026-10-25T12:00:00.000Z');
    const sat = await book({ day: '2026-10-24', time: '20:30', now });
    expect(new Date(sat.starts_at!).toISOString()).toBe('2026-10-24T18:30:00.000Z');
  });
  it('"pasado" se evalúa en hora de Madrid el día del cambio', async () => {
    // 25/10/2026 11:59 UTC = 12:59 CET → 13:00 aún es futuro; 12:00:30 UTC = 13:00:30 → ya pasado
    expect((await book({ day: '2026-10-25', time: '13:15', now: '2026-10-25T11:59:00Z' })).ok).toBe(true);
    expect(await book({ day: '2026-10-25', time: '13:00', now: '2026-10-25T12:00:30Z' })).toMatchObject({ ok: false, error: 'past' });
    // 29/03/2026 10:59 UTC = 12:59 CEST
    expect((await book({ day: '2026-03-29', time: '13:15', now: '2026-03-29T10:59:00Z' })).ok).toBe(true);
    expect(await book({ day: '2026-03-29', time: '13:00', now: '2026-03-29T11:00:30Z' })).toMatchObject({ ok: false, error: 'past' });
  });
  it('el día de la semana se calcula con la fecha local (domingo del cambio = solo mediodía)', async () => {
    expect(await book({ day: '2026-10-25', time: '20:30', now })).toMatchObject({ ok: false, error: 'outside_hours' });
    expect(await book({ day: '2026-10-26', time: '13:30', now })).toMatchObject({ ok: false, error: 'closed_day' });
  });
});

describe('datos de contacto y consentimiento (validados también en la base de datos)', () => {
  const day = futureDate(12, TUE);
  it('email, teléfono, nombre, observaciones y consentimiento', async () => {
    expect(await book({ day, time: '13:30', email: 'no-es-email' })).toMatchObject({ ok: false, error: 'invalid_email' });
    expect(await book({ day, time: '13:30', email: 'a@b' })).toMatchObject({ ok: false, error: 'invalid_email' });
    expect(await book({ day, time: '13:30', phone: '123' })).toMatchObject({ ok: false, error: 'invalid_phone' });
    expect(await book({ day, time: '13:30', phone: 'abcdefghij' })).toMatchObject({ ok: false, error: 'invalid_phone' });
    expect(await book({ day, time: '13:30', name: ' ' })).toMatchObject({ ok: false, error: 'invalid_name' });
    expect(await book({ day, time: '13:30', notes: 'x'.repeat(501) })).toMatchObject({ ok: false, error: 'notes_too_long' });
    expect(await book({ day, time: '13:30', consent: false })).toMatchObject({ ok: false, error: 'consent_required' });
    expect(await booked(day, 'comida')).toBe(0);
  });
});

describe('concurrencia: sin overbooking', () => {
  it('30 reservas simultáneas de 4 personas en conexiones distintas → exactamente 20 entran (80)', async () => {
    const day = futureDate(13, SAT);
    const clients = await Promise.all(Array.from({ length: 30 }, () => { const c = new pg.Client({ connectionString: T.dbUrl }); return c.connect().then(() => c); }));
    try {
      const results = await Promise.all(clients.map((c) => book({ day, time: '20:00', party: 4 }, c as unknown as pg.PoolClient)));
      expect(results.filter((r) => r.ok)).toHaveLength(20);
      expect(results.filter((r) => !r.ok).every((r) => r.error === 'full')).toBe(true);
      expect(await booked(day, 'cena')).toBe(80);
    } finally {
      await Promise.all(clients.map((c) => c.end()));
    }
  });
  it('carrera por las últimas plazas: quedan 4, 12 peticiones simultáneas de 2 → solo 2 entran', async () => {
    const day = futureDate(14, SAT);
    for (let i = 0; i < 6; i++) await book({ day, time: '13:00', party: 12 });
    await book({ day, time: '13:00', party: 4 }); // 76
    const clients = await Promise.all(Array.from({ length: 12 }, () => { const c = new pg.Client({ connectionString: T.dbUrl }); return c.connect().then(() => c); }));
    try {
      const results = await Promise.all(clients.map((c) => book({ day, time: '14:00', party: 2 }, c as unknown as pg.PoolClient)));
      expect(results.filter((r) => r.ok)).toHaveLength(2);
      expect(await booked(day, 'comida')).toBe(80);
    } finally {
      await Promise.all(clients.map((c) => c.end()));
    }
  });
  it('a través de la API REST (PostgREST) con peticiones en paralelo tampoco hay overbooking', async () => {
    const day = futureDate(15, SAT);
    const { svc } = await import('../helpers/db');
    const db = svc();
    const results = await Promise.all(Array.from({ length: 25 }, () => db.rpc('create_booking', {
      p_day: day, p_time: '21:00', p_party_size: 7, p_name: 'Carrera', p_phone: '600111222', p_email: 'c@example.com', p_notes: null, p_consent: true,
    })));
    const ok = results.filter((r) => r.data?.ok).length;
    expect(ok).toBe(11); // 11 × 7 = 77 ≤ 80 < 84
    expect(await booked(day, 'cena')).toBe(77);
  });
});

describe('cancelación', () => {
  it('cancelar libera plazas; cancelar dos veces y reservas inexistentes', async () => {
    const day = futureDate(16, TUE);
    const ids: string[] = [];
    for (let i = 0; i < 6; i++) ids.push((await book({ day, time: '13:30', party: 12 })).id!);
    await book({ day, time: '13:30', party: 8 }); // 80
    expect(await book({ day, time: '14:00', party: 12 })).toMatchObject({ ok: false, error: 'full' });
    const { rows } = await pool.query(`select public.cancel_booking($1, 'cliente') r`, [ids[0]]);
    expect(rows[0].r.ok).toBe(true);
    expect(await booked(day, 'comida')).toBe(68);
    expect((await book({ day, time: '14:00', party: 12 })).ok).toBe(true);
    const again = await pool.query(`select public.cancel_booking($1, 'cliente') r`, [ids[0]]);
    expect(again.rows[0].r).toMatchObject({ ok: false, error: 'already_cancelled' });
    const missing = await pool.query(`select public.cancel_booking('00000000-0000-4000-8000-000000000000', 'cliente') r`);
    expect(missing.rows[0].r).toMatchObject({ ok: false, error: 'not_found' });
  });
  it('el cliente no puede cancelar una reserva ya pasada', async () => {
    const r = await book({ day: '2026-03-29', time: '13:30', now: '2026-01-01T00:00:00Z' });
    const { rows } = await pool.query(`select public.cancel_booking($1, 'cliente') r`, [r.id]);
    expect(rows[0].r).toMatchObject({ ok: false, error: 'past' });
  });
});

describe('límite de peticiones', () => {
  it('permite N por ventana y bloquea la siguiente', async () => {
    const key = `test:${Date.now()}`;
    const results: boolean[] = [];
    for (let i = 0; i < 4; i++) results.push((await pool.query('select public.hit_rate_limit($1, 3, 600) ok', [key])).rows[0].ok);
    expect(results).toEqual([true, true, true, false]);
  });
});
