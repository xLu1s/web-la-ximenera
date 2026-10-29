import { SERVICE_LABEL, serviceSlots, type HoursLang, type ServiceStatus } from './hours';
import { isPastMadrid } from './time';

export interface SlotInfo { time: string; available: boolean }
export interface ServiceAvailability { service: string; label: string; available: boolean; message: string; slots: SlotInfo[]; remaining: number }

/** Horas por servicio para una fecha y nº de personas. */
export function computeAvailability(day: string, status: ServiceStatus[], slotMinutes: number, party: number, now: Date = new Date(), lang: HoursLang = 'es'): ServiceAvailability[] {
  const en = lang === 'en';
  return status.map((s) => {
    const remaining = Math.max(s.capacity - s.booked, 0);
    const name = en ? (s.service === 'comida' ? 'Lunch' : 'Dinner') : SERVICE_LABEL[s.service];
    const label = `${name} (${s.opens.slice(0, 5)}–${s.last_booking.slice(0, 5)})`;
    let message = '';
    if (s.is_closed) message = en ? 'closed' : 'cerrado';
    else if (remaining < party) message = remaining === 0 ? (en ? 'full' : 'completo') : (en ? `${remaining} seats left` : `quedan ${remaining} plazas`);
    const open = !s.is_closed && remaining >= party;
    const slots = serviceSlots(s, slotMinutes).map((time) => ({ time, available: open && !isPastMadrid(day, time, now) }));
    if (open && !slots.some((x) => x.available)) message = en ? 'no longer taking reservations' : 'ya no admite reservas';
    return { service: s.service, label, available: slots.some((x) => x.available), message, slots, remaining };
  });
}
