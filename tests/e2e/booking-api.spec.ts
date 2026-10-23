import { test, expect } from '@playwright/test';
import { apiBook, emailsTo, futureDate, MON, sql, SAT, TUE, uniqueIp, validBooking } from './helpers';

test.describe('API /api/reservas: reglas y anti-spam', () => {
  test('validaciones con mensajes en español', async ({ request }) => {
    const day = futureDate(220, TUE);
    const cases: [Record<string, unknown>, number, string, RegExp][] = [
      [{ party: 12 }, 201, '', /./],
      [{ party: 13 }, 422, 'party_too_large', /como máximo 12 personas/],
      [{ party: 0 }, 422, 'party_too_small', /al menos 1 persona/],
      [{ party: -2 }, 422, 'party_too_small', /al menos 1 persona/],
      [{ email: 'ana@' }, 422, 'invalid_email', /email/],
      [{ phone: '12' }, 422, 'invalid_phone', /teléfono/],
      [{ consent: '' }, 422, 'consent_required', /política de privacidad/],
      [{ date: '2020-01-07' }, 422, 'past', /ya han pasado/],
      [{ date: futureDate(220, MON) }, 422, 'closed_day', /cerrado/],
      [{ time: '17:00' }, 422, 'outside_hours', /fuera de nuestro horario/],
      [{ time: '15:15' }, 422, 'outside_hours', /fuera de nuestro horario/],
      [{ time: '13:40' }, 422, 'invalid_slot', /horas disponibles/],
    ];
    for (const [o, status, error, msg] of cases) {
      const r = await apiBook(request, validBooking({ date: day, ...o }));
      expect(r.status, JSON.stringify(o)).toBe(status);
      if (error) { expect(r.body.error).toBe(error); expect(r.body.message).toMatch(msg); }
    }
  });

  test('servicio completo (409) y día bloqueado (409)', async ({ request }) => {
    const day = futureDate(221, SAT);
    await sql(`insert into public.service_exceptions (day, service, closed, capacity) values ($1, 'cena', false, 3)`, [day]);
    expect((await apiBook(request, validBooking({ date: day, time: '20:00', party: 3 }))).status).toBe(201);
    const full = await apiBook(request, validBooking({ date: day, time: '20:00', party: 1 }));
    expect(full.status).toBe(409);
    expect(full.body.message).toMatch(/completo/);
    await sql(`insert into public.service_exceptions (day, service, closed) values ($1, null, true)`, [day]);
    const blocked = await apiBook(request, validBooking({ date: day, time: '13:00' }));
    expect(blocked.status).toBe(409);
    expect(blocked.body.error).toBe('blocked');
  });

  test('honeypot: respuesta normal pero no se guarda nada ni se envían emails', async ({ request }) => {
    const day = futureDate(222, TUE);
    const r = await apiBook(request, validBooking({ date: day, website: 'http://spam.example', email: 'bot@example.com' }));
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
    expect(r.body.reference).toBeNull();
    expect(await sql('select 1 from public.bookings where day = $1', [day])).toHaveLength(0);
    expect(await emailsTo(request, 'bot@example.com')).toHaveLength(0);
  });

  test('límite de peticiones: la 6.ª petición desde la misma IP en 10 minutos → 429', async ({ request }) => {
    const ip = uniqueIp();
    const day = futureDate(223, TUE);
    for (let i = 0; i < 5; i++) expect((await apiBook(request, validBooking({ date: day, party: 1 }), ip)).status).toBe(201);
    const r = await apiBook(request, validBooking({ date: day, party: 1 }), ip);
    expect(r.status).toBe(429);
    expect(r.body.message).toMatch(/demasiados intentos/);
    expect((await apiBook(request, validBooking({ date: day, party: 1 }), uniqueIp())).status).toBe(201); // otra IP sí
  });

  test('reservas simultáneas por HTTP por las últimas plazas: sin overbooking', async ({ request }) => {
    const day = futureDate(224, SAT);
    for (let i = 0; i < 6; i++) await apiBook(request, validBooking({ date: day, time: '20:00', party: 12 }));
    await apiBook(request, validBooking({ date: day, time: '20:00', party: 5 })); // 77
    const results = await Promise.all(Array.from({ length: 8 }, () => apiBook(request, validBooking({ date: day, time: '21:00', party: 2 }))));
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(7);
    const [{ n }] = await sql<{ n: number }>(`select sum(party_size)::int n from public.bookings where day = $1 and service = 'cena' and status = 'confirmada'`, [day]);
    expect(n).toBe(79);
  });

  test('disponibilidad: fecha no válida, pasada y día bloqueado', async ({ request }) => {
    expect((await request.get('/api/disponibilidad?fecha=hoy')).status()).toBe(400);
    expect((await (await request.get('/api/disponibilidad?fecha=2020-01-01')).json()).services).toEqual([]);
    const day = futureDate(225, TUE);
    await sql(`insert into public.service_exceptions (day, service, closed) values ($1, null, true)`, [day]);
    const j = await (await request.get(`/api/disponibilidad?fecha=${day}&personas=2`)).json();
    expect(j.services.every((s: { available: boolean }) => !s.available)).toBe(true);
    expect(j.message).toMatch(/no admitimos reservas online/);
  });
});
