import { isValidDate, isPastMadrid, TIME_RE } from './time';

export const MAX_PARTY_DEFAULT = 12;
export const PRIVACY_VERSION = '2026-10';

export type BookingErrorCode =
  | 'consent_required' | 'party_too_small' | 'party_too_large' | 'invalid_name' | 'invalid_phone'
  | 'invalid_email' | 'notes_too_long' | 'invalid_datetime' | 'past' | 'closed_day' | 'blocked'
  | 'outside_hours' | 'invalid_slot' | 'full' | 'rate_limited' | 'server_error' | 'not_configured';

/** Mensajes claros para el cliente. `lang` por defecto español (lo que cubren los tests). */
export function bookingErrorMessage(code: string, extra: { max?: number; remaining?: number } = {}, lang: 'es' | 'en' = 'es'): string {
  if (lang === 'en') {
    switch (code) {
      case 'consent_required': return 'To book, please accept the privacy policy.';
      case 'party_too_small': return 'Please enter at least 1 guest.';
      case 'party_too_large': return `Online bookings allow up to ${extra.max ?? MAX_PARTY_DEFAULT} guests. For larger groups, contact the restaurant.`;
      case 'invalid_name': return 'Enter your name (at least 2 characters).';
      case 'invalid_phone': return 'Check the phone number: it needs at least 9 digits.';
      case 'invalid_email': return 'Check the email: it does not look valid.';
      case 'notes_too_long': return 'Notes cannot be longer than 500 characters.';
      case 'invalid_datetime': return 'Choose a valid date and time.';
      case 'past': return 'That date and time have already passed. Choose a future time.';
      case 'closed_day': return 'The restaurant is closed that day. Choose another date.';
      case 'blocked': return 'Sorry, that service is not taking online bookings. Choose another date.';
      case 'outside_hours': return 'That time is outside our booking hours. Choose one of the available times.';
      case 'invalid_slot': return 'Choose one of the available times from the list.';
      case 'full':
        return extra.remaining && extra.remaining > 0
          ? `Not enough seats for that service (${extra.remaining} left). Try fewer guests, another time or another day.`
          : 'That service is full. Try another time or day.';
      case 'rate_limited': return 'Too many attempts in a row. Wait a few minutes and try again.';
      case 'not_configured': return 'Online booking is not available right now. Please try again later.';
      default: return 'We could not save the booking. Please try again in a few minutes.';
    }
  }
  switch (code) {
    case 'consent_required': return 'Para reservar debes aceptar la política de privacidad.';
    case 'party_too_small': return 'Indica al menos 1 persona.';
    case 'party_too_large': return `Las reservas online admiten como máximo ${extra.max ?? MAX_PARTY_DEFAULT} personas. Para grupos más grandes, contacta directamente con el restaurante.`;
    case 'invalid_name': return 'Escribe tu nombre (mínimo 2 caracteres).';
    case 'invalid_phone': return 'Revisa el teléfono: debe tener al menos 9 cifras.';
    case 'invalid_email': return 'Revisa el email: no parece válido.';
    case 'notes_too_long': return 'Las observaciones no pueden superar los 500 caracteres.';
    case 'invalid_datetime': return 'Elige una fecha y una hora válidas.';
    case 'past': return 'La fecha y hora elegidas ya han pasado. Elige un momento futuro.';
    case 'closed_day': return 'Ese día el restaurante está cerrado. Elige otra fecha.';
    case 'blocked': return 'Lo sentimos, ese servicio no admite reservas online (cerrado o completo por evento). Elige otra fecha.';
    case 'outside_hours': return 'Esa hora está fuera de nuestro horario de reservas. Elige una de las horas disponibles.';
    case 'invalid_slot': return 'Elige una de las horas disponibles de la lista.';
    case 'full':
      return extra.remaining && extra.remaining > 0
        ? `No quedan plazas suficientes en ese servicio (quedan ${extra.remaining}). Prueba con menos personas, otra hora u otro día.`
        : 'Ese servicio está completo. Prueba otro horario u otro día.';
    case 'rate_limited': return 'Has hecho demasiados intentos seguidos. Espera unos minutos y vuelve a probarlo.';
    case 'not_configured': return 'Las reservas online no están disponibles ahora mismo. Inténtalo más tarde, por favor.';
    default: return 'No hemos podido registrar la reserva. Inténtalo de nuevo en unos minutos.';
  }
}

export interface BookingInput {
  date: string; time: string; party: number; name: string; phone: string; email: string; notes: string | null; consent: boolean;
}

// Email: parte local + dominio con al menos un punto y TLD de 2+ letras, sin espacios.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i;
const PHONE_RE = /^\+?[0-9][0-9 ().-]{7,19}$/;

export type ParseResult = { ok: true; data: BookingInput } | { ok: false; error: BookingErrorCode; field?: string };

const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v)).trim();

/** Valida la entrada del formulario (la base de datos vuelve a validar todo). */
export function parseBookingInput(raw: Record<string, unknown>, opts: { now?: Date; maxParty?: number } = {}): ParseResult {
  const maxParty = opts.maxParty ?? MAX_PARTY_DEFAULT;
  const consentRaw = raw.consent;
  const consent = consentRaw === true || consentRaw === 'on' || consentRaw === 'true' || consentRaw === '1';
  const name = str(raw.name);
  const phone = str(raw.phone);
  const email = str(raw.email).toLowerCase();
  const notes = str(raw.notes) || null;
  const date = str(raw.date);
  const time = str(raw.time);
  const partyStr = str(raw.party);
  const party = /^-?\d+$/.test(partyStr) ? Number(partyStr) : NaN;

  if (name.length < 2 || name.length > 100) return { ok: false, error: 'invalid_name', field: 'name' };
  if (!PHONE_RE.test(phone) || phone.replace(/\D/g, '').length < 9) return { ok: false, error: 'invalid_phone', field: 'phone' };
  if (email.length > 254 || !EMAIL_RE.test(email)) return { ok: false, error: 'invalid_email', field: 'email' };
  if (!isValidDate(date) || !TIME_RE.test(time)) return { ok: false, error: 'invalid_datetime', field: !isValidDate(date) ? 'date' : 'time' };
  if (!Number.isInteger(party) || party < 1) return { ok: false, error: 'party_too_small', field: 'party' };
  if (party > maxParty) return { ok: false, error: 'party_too_large', field: 'party' };
  if (notes && notes.length > 500) return { ok: false, error: 'notes_too_long', field: 'notes' };
  if (!consent) return { ok: false, error: 'consent_required', field: 'consent' };
  if (isPastMadrid(date, time, opts.now)) return { ok: false, error: 'past', field: 'date' };
  return { ok: true, data: { date, time, party, name, phone, email, notes, consent } };
}

/** Honeypot: campo oculto que una persona nunca rellena. */
export const HONEYPOT_FIELD = 'website';
export const isSpam = (raw: Record<string, unknown>) => str(raw[HONEYPOT_FIELD]).length > 0;

/** IP del cliente. En Vercel, x-real-ip / x-forwarded-for los fija la plataforma. */
export function clientIp(request: Request, fallback?: string): string {
  const h = request.headers;
  return (h.get('x-real-ip') || h.get('x-forwarded-for')?.split(',')[0] || fallback || 'unknown').trim();
}
