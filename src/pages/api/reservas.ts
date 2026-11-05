import type { APIRoute } from 'astro';
export const prerender = false;
import { createHash } from 'node:crypto';
import { serviceClient } from '../../lib/supabase';
import { env } from '../../lib/env';
import { json, readBody, siteOrigin } from '../../lib/http';
import { bookingErrorMessage, clientIp, isSpam, parseBookingInput, PRIVACY_VERSION } from '../../lib/booking';
import { signCancelToken } from '../../lib/token';
import { customerConfirmation, ownerNotification, sendEmail } from '../../lib/email';
import { formatDateEs } from '../../lib/time';

export const POST: APIRoute = async (ctx) => {
  const { request } = ctx;
  const raw = await readBody(request);
  const lang = raw.lang === 'en' ? 'en' : 'es';
  const fail = (error: string, status: number, extra: Record<string, unknown> = {}, field?: string) =>
    json({ ok: false, error, field, message: bookingErrorMessage(error, extra as { max?: number; remaining?: number }, lang) }, status);

  // Honeypot: respondemos como si todo hubiera ido bien, pero no se guarda nada.
  if (isSpam(raw)) return json({ ok: true, reference: null, summary: lang === 'en' ? 'We have received your request.' : 'Hemos recibido tu solicitud.' });

  if (!env.supabaseServiceRoleKey || !env.bookingTokenSecret) return fail('not_configured', 503);
  const db = serviceClient();

  // Límite de peticiones por IP (ventana fija, compartida entre instancias vía Postgres).
  let ip = 'unknown';
  let addr: string | undefined;
  try { addr = ctx.clientAddress; } catch { addr = undefined; }
  ip = clientIp(request, addr);
  const key = 'reserva:' + createHash('sha256').update(ip).digest('hex').slice(0, 32);
  const rl = await db.rpc('hit_rate_limit', { p_key: key, p_max: env.rateLimitMax, p_window_seconds: env.rateLimitWindowSeconds });
  if (rl.error) { console.error('[reservas] rate limit', rl.error.message); return fail('server_error', 500); }
  if (rl.data === false) return fail('rate_limited', 429);

  const { data: settings } = await db.from('settings').select('max_party_size').eq('id', 1).single();
  const maxParty = settings?.max_party_size ?? 12;
  const parsed = parseBookingInput(raw, { maxParty });
  if (!parsed.ok) return fail(parsed.error, 422, { max: maxParty }, parsed.field);
  const b = parsed.data;

  const { data, error } = await db.rpc('create_booking', {
    p_day: b.date, p_time: b.time, p_party_size: b.party, p_name: b.name, p_phone: b.phone,
    p_email: b.email, p_notes: b.notes, p_consent: b.consent, p_privacy_version: PRIVACY_VERSION,
  });
  if (error) { console.error('[reservas] create_booking', error.message); return fail('server_error', 500); }
  const res = data as Record<string, unknown> & { ok: boolean; error?: string };
  if (!res.ok) {
    const status = res.error === 'full' || res.error === 'blocked' ? 409 : 422;
    return fail(res.error ?? 'server_error', status, { max: res.max ?? maxParty, remaining: res.remaining });
  }

  const origin = siteOrigin(request, env.siteUrl);
  const summary = {
    reference: String(res.reference), day: String(res.day), time: String(res.time), service: String(res.service),
    party_size: Number(res.party_size), name: b.name, email: b.email, phone: b.phone, notes: b.notes,
  };
  const cancelUrl = `${origin}/reserva/cancelar?t=${encodeURIComponent(signCancelToken(String(res.id), env.bookingTokenSecret))}`;
  const [c, o] = await Promise.all([
    sendEmail(customerConfirmation(summary, cancelUrl)),
    sendEmail(ownerNotification(summary, `${origin}/admin/reservas?fecha=${summary.day}`)),
  ]);

  return json({
    ok: true,
    reference: summary.reference,
    summary: `${formatDateEs(summary.day)} a las ${summary.time}, ${summary.party_size} ${summary.party_size === 1 ? 'persona' : 'personas'}, a nombre de ${summary.name}.`,
    emailSent: c.sent,
    ownerNotified: o.sent,
  }, 201);
};
