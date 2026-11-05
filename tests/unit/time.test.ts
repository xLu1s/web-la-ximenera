import { describe, expect, it } from 'vitest';
import { addDays, formatDateEs, isoDow, isPastMadrid, isValidDate, madridOffsetMinutes, madridParts, madridToUtc, todayMadrid } from '../../src/lib/time';

describe('zona horaria Europe/Madrid', () => {
  it('desfase invierno (+1) y verano (+2)', () => {
    expect(madridOffsetMinutes(new Date('2026-01-15T12:00:00Z'))).toBe(60);
    expect(madridOffsetMinutes(new Date('2026-07-15T12:00:00Z'))).toBe(120);
  });
  it('cambio de hora de primavera (29/03/2026): 13:00 local = 11:00 UTC; el día antes = 12:00 UTC', () => {
    expect(madridToUtc('2026-03-29', '13:00').toISOString()).toBe('2026-03-29T11:00:00.000Z');
    expect(madridToUtc('2026-03-28', '13:00').toISOString()).toBe('2026-03-28T12:00:00.000Z');
  });
  it('cambio de hora de otoño (25/10/2026): 13:00 local = 12:00 UTC; el día antes = 11:00 UTC', () => {
    expect(madridToUtc('2026-10-25', '13:00').toISOString()).toBe('2026-10-25T12:00:00.000Z');
    expect(madridToUtc('2026-10-24', '13:00').toISOString()).toBe('2026-10-24T11:00:00.000Z');
    expect(madridToUtc('2026-10-24', '20:30').toISOString()).toBe('2026-10-24T18:30:00.000Z');
  });
  it('fecha local cerca de medianoche UTC', () => {
    // 23:30 UTC del 24/10 (verano, +2) ya es 25/10 en Madrid
    expect(madridParts(new Date('2026-10-24T23:30:00Z'))).toMatchObject({ date: '2026-10-25', time: '01:30' });
    expect(todayMadrid(new Date('2026-12-31T23:30:00Z'))).toBe('2027-01-01');
  });
  it('durante la hora repetida de otoño (02:00–03:00) se calcula bien', () => {
    expect(madridParts(new Date('2026-10-25T00:30:00Z')).time).toBe('02:30'); // aún CEST
    expect(madridParts(new Date('2026-10-25T01:30:00Z')).time).toBe('02:30'); // ya CET
  });
  it('isPastMadrid compara en hora local', () => {
    const now = new Date('2026-10-25T11:59:00Z'); // 12:59 CET
    expect(isPastMadrid('2026-10-25', '13:00', now)).toBe(false);
    expect(isPastMadrid('2026-10-25', '12:59', now)).toBe(true);
    expect(isPastMadrid('2026-10-24', '23:00', now)).toBe(true);
    const summer = new Date('2026-03-29T10:59:00Z'); // 12:59 CEST
    expect(isPastMadrid('2026-03-29', '13:00', summer)).toBe(false);
    expect(isPastMadrid('2026-03-29', '12:30', summer)).toBe(true);
  });
  it('día de la semana ISO y validación de fechas', () => {
    expect(isoDow('2026-10-25')).toBe(7); // domingo
    expect(isoDow('2026-10-26')).toBe(1); // lunes
    expect(isoDow('2026-03-29')).toBe(7);
    expect(isValidDate('2026-02-29')).toBe(false);
    expect(isValidDate('2028-02-29')).toBe(true);
    expect(isValidDate('2026-13-01')).toBe(false);
    expect(isValidDate('hoy')).toBe(false);
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
  });
  it('formato de fecha en español', () => {
    expect(formatDateEs('2030-01-05')).toBe('sábado, 5 de enero de 2030');
  });
});
