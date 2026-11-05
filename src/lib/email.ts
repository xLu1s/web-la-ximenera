import { Resend } from 'resend';
import { env } from './env';
import { formatDateEs } from './time';
import { site } from '../data/site';

export interface BookingSummary {
  reference: string; day: string; time: string; service: string; party_size: number;
  name: string; email: string; phone?: string; notes?: string | null;
}

export interface EmailMessage { to: string; subject: string; html: string; text: string }
export interface EmailResult { sent: boolean; id?: string; error?: string }

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const people = (n: number) => `${n} ${n === 1 ? 'persona' : 'personas'}`;
const serviceName = (s: string) => (s === 'cena' ? 'cena' : 'comida');

function layout(title: string, body: string) {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#F7F1E6;font-family:Arial,Helvetica,sans-serif;color:#3a2a20">
<div style="max-width:560px;margin:0 auto;padding:24px">
<h1 style="font-family:Georgia,serif;color:#2B1D14;font-size:26px;margin:0 0 4px">La Ximenera</h1>
<p style="margin:0 0 20px;color:#9C7C3C;font-size:12px;letter-spacing:2px;text-transform:uppercase">${esc(title)}</p>
${body}
<p style="margin-top:28px;font-size:12px;color:#7a6553">${esc(site.address.street)}, ${esc(site.address.postalCode)} ${esc(site.address.city)} · Tel. ${esc(site.phoneDisplay)}</p>
</div></body></html>`;
}

function detailsTable(b: BookingSummary) {
  const row = (k: string, v: string) => `<tr><td style="padding:6px 12px 6px 0;color:#7a6553">${k}</td><td style="padding:6px 0;font-weight:bold">${v}</td></tr>`;
  return `<table style="border-collapse:collapse;margin:12px 0">${row('Referencia', esc(b.reference))}${row('Fecha', esc(formatDateEs(b.day)))}${row('Hora', `${esc(b.time)} (${serviceName(b.service)})`)}${row('Personas', esc(people(b.party_size)))}${row('Nombre', esc(b.name))}</table>`;
}

export function customerConfirmation(b: BookingSummary, cancelUrl: string): EmailMessage {
  const subject = `Reserva confirmada · ${b.reference} · La Ximenera`;
  const html = layout('Reserva confirmada', `<p>Hola ${esc(b.name)}, tu mesa está reservada. ¡Te esperamos!</p>${detailsTable(b)}
<p>Si no puedes venir, cancela la reserva para liberar la mesa:</p>
<p><a href="${esc(cancelUrl)}" style="display:inline-block;background:#C9A55C;color:#2B1D14;padding:12px 20px;text-decoration:none;font-weight:bold;border-radius:4px">Cancelar mi reserva</a></p>
<p style="font-size:13px;color:#7a6553">Para cualquier cambio, llámanos al ${esc(site.phoneDisplay)}.</p>`);
  const text = `Hola ${b.name}, tu mesa está reservada.\n\nReferencia: ${b.reference}\nFecha: ${formatDateEs(b.day)}\nHora: ${b.time} (${serviceName(b.service)})\nPersonas: ${people(b.party_size)}\n\nCancelar la reserva: ${cancelUrl}\n\nLa Ximenera · Tel. ${site.phoneDisplay}`;
  return { to: b.email, subject, html, text };
}

export function ownerNotification(b: BookingSummary, adminUrl: string): EmailMessage {
  const subject = `Nueva reserva ${b.reference}: ${formatDateEs(b.day)} ${b.time} · ${people(b.party_size)}`;
  const extra = `<p>Teléfono: <strong>${esc(b.phone ?? '')}</strong><br>Email: ${esc(b.email)}</p>${b.notes ? `<p>Observaciones: ${esc(b.notes)}</p>` : ''}`;
  const html = layout('Nueva reserva online', `${detailsTable(b)}${extra}<p><a href="${esc(adminUrl)}">Ver reservas del día en el panel</a></p>`);
  const text = `Nueva reserva ${b.reference}\n${formatDateEs(b.day)} ${b.time} (${serviceName(b.service)})\n${people(b.party_size)} · ${b.name}\nTel: ${b.phone ?? ''} · ${b.email}\n${b.notes ? `Observaciones: ${b.notes}\n` : ''}\nPanel: ${adminUrl}`;
  return { to: env.ownerNotifyEmail, subject, html, text };
}

export function customerCancellation(b: BookingSummary): EmailMessage {
  const subject = `Reserva cancelada · ${b.reference} · La Ximenera`;
  const html = layout('Reserva cancelada', `<p>Hola ${esc(b.name)}, hemos cancelado tu reserva.</p>${detailsTable(b)}<p>Esperamos verte pronto.</p>`);
  const text = `Hola ${b.name}, hemos cancelado tu reserva ${b.reference} del ${formatDateEs(b.day)} a las ${b.time}.`;
  return { to: b.email, subject, html, text };
}

export function ownerCancellation(b: BookingSummary, by: 'cliente' | 'restaurante'): EmailMessage {
  const subject = `Reserva cancelada ${b.reference}: ${formatDateEs(b.day)} ${b.time} · ${people(b.party_size)}`;
  const html = layout('Reserva cancelada', `<p>Cancelada por: ${by === 'cliente' ? 'el cliente (enlace del email)' : 'el restaurante (panel)'}</p>${detailsTable(b)}`);
  const text = `Reserva ${b.reference} cancelada por ${by}. ${formatDateEs(b.day)} ${b.time}, ${people(b.party_size)}, ${b.name}.`;
  return { to: env.ownerNotifyEmail, subject, html, text };
}

/**
 * Envío con Resend. Sin RESEND_API_KEY no se envía nada (se registra en el log).
 * Nota: con el remitente por defecto onboarding@resend.dev, Resend solo entrega al email
 * del propietario de la cuenta hasta verificar un dominio propio.
 */
export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  const key = env.resendApiKey;
  if (!key) {
    console.warn(`[email] RESEND_API_KEY no configurada; no se envía "${msg.subject}"`);
    return { sent: false, error: 'not_configured' };
  }
  try {
    const resend = new Resend(key, env.resendBaseUrl ? { baseUrl: env.resendBaseUrl } as never : undefined);
    const { data, error } = await resend.emails.send({
      from: env.emailFrom,
      to: [msg.to],
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      ...(env.emailReplyTo ? { replyTo: env.emailReplyTo } : {}),
    });
    if (error) {
      console.error('[email] Resend error:', error.name ?? '', error.message ?? '');
      return { sent: false, error: error.message };
    }
    return { sent: true, id: data?.id };
  } catch (e) {
    console.error('[email] fallo de envío:', (e as Error).message);
    return { sent: false, error: (e as Error).message };
  }
}
