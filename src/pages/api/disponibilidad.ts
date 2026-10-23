import type { APIRoute } from 'astro';
export const prerender = false;
import { serviceClient } from '../../lib/supabase';
import { env } from '../../lib/env';
import { json } from '../../lib/http';
import { isValidDate, todayMadrid } from '../../lib/time';
import { computeAvailability } from '../../lib/availability';
import type { ServiceStatus } from '../../lib/hours';

export const GET: APIRoute = async ({ url }) => {
  const day = url.searchParams.get('fecha') ?? '';
  const party = Number(url.searchParams.get('personas') ?? '2');
  if (!isValidDate(day)) return json({ ok: false, message: 'Fecha no válida.' }, 400);
  if (!env.supabaseServiceRoleKey) return json({ ok: false, message: 'Las reservas online no están disponibles ahora mismo. Inténtalo más tarde, por favor.' }, 503);
  if (day < todayMadrid()) return json({ ok: true, services: [], message: 'Esa fecha ya ha pasado.' });
  const db = serviceClient();
  const [st, settings] = await Promise.all([
    db.rpc('service_status', { p_day: day }),
    db.from('settings').select('slot_minutes, max_party_size').eq('id', 1).single(),
  ]);
  if (st.error || settings.error) {
    console.error('[disponibilidad]', st.error?.message ?? settings.error?.message);
    return json({ ok: false, message: 'No se pudo consultar la disponibilidad. Inténtalo de nuevo.' }, 500);
  }
  const rows = (st.data ?? []) as ServiceStatus[];
  if (!rows.length) return json({ ok: true, services: [], message: 'Ese día el restaurante está cerrado. Elige otra fecha.' });
  const p = Number.isInteger(party) && party >= 1 ? Math.min(party, settings.data.max_party_size) : 1;
  const services = computeAvailability(day, rows, settings.data.slot_minutes, p);
  const message = services.every((s) => !s.available)
    ? (rows.every((r) => r.is_closed) ? 'Ese día no admitimos reservas online. Elige otro día, por favor.' : 'No quedan horas disponibles ese día para ese número de personas.')
    : '';
  return json({ ok: true, services, message });
};
