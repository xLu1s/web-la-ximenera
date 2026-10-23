import { displayTime, fromMinutes, toMinutes } from './time';

export type Service = 'comida' | 'cena';
export interface OpeningHour { weekday: number; service: Service; opens: string; closes: string; capacity?: number | null }
export interface ServiceStatus {
  service: Service; opens: string; closes: string; last_booking: string;
  capacity: number; booked: number; is_closed: boolean; closed_note: string | null;
}

export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DAY_PLURAL = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados', 'domingos'];
const EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const SERVICE_LABEL: Record<Service, string> = { comida: 'Comida', cena: 'Cena' };

/** Horario estático original (respaldo si la base de datos no está disponible). */
export const FALLBACK_HOURS: OpeningHour[] = [
  ...[2, 3, 4, 5].flatMap((d) => [
    { weekday: d, service: 'comida' as const, opens: '13:30', closes: '16:00' },
    { weekday: d, service: 'cena' as const, opens: '20:30', closes: '23:00' },
  ]),
  { weekday: 6, service: 'comida', opens: '12:30', closes: '16:30' },
  { weekday: 6, service: 'cena', opens: '20:00', closes: '24:00' },
  { weekday: 7, service: 'comida', opens: '13:00', closes: '16:00' },
];

const byDay = (rows: OpeningHour[], d: number) =>
  rows.filter((r) => r.weekday === d).sort((a, b) => toMinutes(a.opens) - toMinutes(b.opens));

/** Tabla de horario con el mismo formato que la web original ("13:30–16:00 · 20:30–23:00"). */
export function hoursTable(rows: OpeningHour[]): { day: string; value: string }[] {
  return DAY_NAMES.map((day, i) => {
    const r = byDay(rows, i + 1);
    return { day, value: r.length ? r.map((x) => `${displayTime(x.opens)}–${displayTime(x.closes)}`).join(' · ') : 'Cerrado' };
  });
}

const joinEs = (a: string[]) => (a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} y ${a[a.length - 1]}`);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Días cerrados en plural ("lunes"). */
export function closedDays(rows: OpeningHour[]): string[] {
  return DAY_PLURAL.filter((_, i) => byDay(rows, i + 1).length === 0);
}

/** "Cerramos los lunes. Domingos, solo mediodía." (texto original, generado desde el horario). */
export function hoursSummary(rows: OpeningHour[]): string[] {
  const out: string[] = [];
  const closed = closedDays(rows);
  if (closed.length) out.push(`Cerramos los ${joinEs(closed)}.`);
  const lunchOnly = DAY_PLURAL.filter((_, i) => { const r = byDay(rows, i + 1); return r.length > 0 && r.every((x) => x.service === 'comida'); });
  if (lunchOnly.length) out.push(`${cap(joinEs(lunchOnly))}, solo mediodía.`);
  const dinnerOnly = DAY_PLURAL.filter((_, i) => { const r = byDay(rows, i + 1); return r.length > 0 && r.every((x) => x.service === 'cena'); });
  if (dinnerOnly.length) out.push(`${cap(joinEs(dinnerOnly))}, solo noche.`);
  return out;
}

/** "Cerrado los lunes" para la nota del hero (vacío si abre todos los días). */
export function closedNote(rows: OpeningHour[]): string {
  const c = closedDays(rows);
  return c.length ? `Cerrado los ${joinEs(c)}` : '';
}

/** openingHoursSpecification para JSON-LD (agrupa días con el mismo horario). */
export function jsonLdHours(rows: OpeningHour[]) {
  const groups = new Map<string, number[]>();
  for (const r of [...rows].sort((a, b) => a.weekday - b.weekday || toMinutes(a.opens) - toMinutes(b.opens))) {
    const k = `${r.opens.slice(0, 5)}|${r.closes.slice(0, 5)}`;
    groups.set(k, [...(groups.get(k) ?? []), r.weekday]);
  }
  return [...groups.entries()].map(([k, days]) => {
    const [opens, closes] = k.split('|');
    return {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: days.length === 1 ? EN[days[0] - 1] : days.map((d) => EN[d - 1]),
      opens,
      closes: closes === '24:00' ? '23:59' : closes,
    };
  });
}

/** Horas reservables de un servicio: desde la apertura hasta la última hora de reserva, cada `step` minutos. */
export function serviceSlots(s: Pick<ServiceStatus, 'opens' | 'last_booking'>, step: number): string[] {
  const a = toMinutes(s.opens), b = toMinutes(s.last_booking);
  const out: string[] = [];
  for (let t = a; t <= b; t += step) out.push(fromMinutes(t));
  return out;
}
