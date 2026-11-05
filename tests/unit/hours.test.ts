import { describe, expect, it } from 'vitest';
import { closedNote, FALLBACK_HOURS, hoursSummary, hoursTable, jsonLdHours, serviceSlots } from '../../src/lib/hours';
import { hours as original } from '../../src/data/site';
import { computeAvailability } from '../../src/lib/availability';

describe('horario', () => {
  it('reproduce exactamente la tabla de horario original', () => {
    expect(hoursTable(FALLBACK_HOURS)).toEqual(original);
  });
  it('textos generados iguales a los originales', () => {
    expect(hoursSummary(FALLBACK_HOURS).join(' ')).toBe('Cerramos los lunes. Domingos, solo mediodía.');
    expect(closedNote(FALLBACK_HOURS)).toBe('Cerrado los lunes');
  });
  it('JSON-LD equivalente al original', () => {
    const j = jsonLdHours(FALLBACK_HOURS);
    expect(j).toContainEqual({ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '13:30', closes: '16:00' });
    expect(j).toContainEqual({ '@type': 'OpeningHoursSpecification', dayOfWeek: 'Saturday', opens: '20:00', closes: '23:59' });
    expect(j).toHaveLength(5);
  });
  it('horas reservables cada 15 min hasta la última hora', () => {
    expect(serviceSlots({ opens: '13:30:00', last_booking: '15:00:00' }, 15)).toEqual(['13:30', '13:45', '14:00', '14:15', '14:30', '14:45', '15:00']);
    expect(serviceSlots({ opens: '20:00:00', last_booking: '23:00:00' }, 30).at(-1)).toBe('23:00');
  });
  it('disponibilidad: completo, bloqueado, horas pasadas', () => {
    const st = [
      { service: 'comida' as const, opens: '13:30:00', closes: '16:00:00', last_booking: '15:00:00', capacity: 80, booked: 78, is_closed: false, closed_note: null },
      { service: 'cena' as const, opens: '20:30:00', closes: '23:00:00', last_booking: '22:00:00', capacity: 80, booked: 0, is_closed: true, closed_note: 'Evento' },
    ];
    const a = computeAvailability('2032-01-06', st, 15, 2, new Date('2026-01-01T00:00:00Z'));
    expect(a[0].available).toBe(true);
    expect(computeAvailability('2032-01-06', st, 15, 3, new Date('2026-01-01T00:00:00Z'))[0]).toMatchObject({ available: false, message: 'quedan 2 plazas' });
    expect(a[1]).toMatchObject({ available: false, message: 'cerrado' });
    // Mismo día, ya son las 14:10 en Madrid (13:10 UTC en invierno)
    const today = computeAvailability('2032-01-06', st, 15, 1, new Date('2032-01-06T13:10:00Z'));
    expect(today[0].slots.filter((s) => s.available).map((s) => s.time)).toEqual(['14:15', '14:30', '14:45', '15:00']);
  });
});
