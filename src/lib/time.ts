/**
 * Utilidades de fecha/hora en la zona del restaurante (Europe/Madrid), seguras ante el cambio de hora.
 * Las fechas de calendario se manejan como cadenas 'YYYY-MM-DD' y las horas como 'HH:MM'.
 */
export const TZ = 'Europe/Madrid';

const dtf = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

/** Fecha y hora locales de Madrid para un instante. */
export function madridParts(instant: Date = new Date()): { date: string; time: string; seconds: number } {
  const p = Object.fromEntries(dtf.formatToParts(instant).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}`, seconds: Number(p.second) };
}

export const todayMadrid = (now: Date = new Date()) => madridParts(now).date;

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** ¿Es una fecha de calendario real? (rechaza 2026-02-30) */
export function isValidDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Día de la semana ISO (1 = lunes … 7 = domingo) de una fecha de calendario. */
export function isoDow(s: string): number {
  const [y, m, d] = s.split('-').map(Number);
  const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return w === 0 ? 7 : w;
}

export function addDays(s: string, n: number): string {
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** Desfase (minutos) de Madrid respecto a UTC en un instante dado: 60 en invierno, 120 en verano. */
export function madridOffsetMinutes(instant: Date): number {
  const p = madridParts(instant);
  const [y, m, d] = p.date.split('-').map(Number);
  const [hh, mm] = p.time.split(':').map(Number);
  const asUtc = Date.UTC(y, m - 1, d, hh, mm, p.seconds);
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60000);
}

/** Instante UTC que corresponde a una fecha+hora local de Madrid. */
export function madridToUtc(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  // Dos pasadas: la primera estima con el desfase de la hora "como si fuera UTC".
  let off = madridOffsetMinutes(new Date(guess));
  let t = guess - off * 60000;
  const off2 = madridOffsetMinutes(new Date(t));
  if (off2 !== off) { off = off2; t = guess - off * 60000; }
  return new Date(t);
}

/** ¿La fecha+hora local de Madrid ya ha pasado (o es ahora)? */
export function isPastMadrid(date: string, time: string, now: Date = new Date()): boolean {
  const p = madridParts(now);
  return `${date} ${time}` <= `${p.date} ${p.time}`;
}

const DAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "sábado, 5 de enero de 2030" */
export function formatDateEs(s: string): string {
  const [y, m, d] = s.split('-').map(Number);
  return `${DAYS[isoDow(s) - 1]}, ${d} de ${MONTHS[m - 1]} de ${y}`;
}

/** 'HH:MM:SS' | 'HH:MM' → minutos desde medianoche ('24:00' = 1440). */
export function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
export function fromMinutes(n: number): string {
  const h = Math.floor(n / 60), m = n % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
/** Hora para mostrar: '24:00' se muestra como '00:00' (como en la web original). */
export const displayTime = (t: string) => { const s = t.slice(0, 5); return s === '24:00' ? '00:00' : s; };
