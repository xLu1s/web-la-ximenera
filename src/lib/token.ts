import { createHmac, timingSafeEqual } from 'node:crypto';

/** Token firmado (HMAC-SHA256) para el enlace de cancelación: base64url(id).base64url(firma). */
const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url');

function sig(id: string, secret: string) {
  return createHmac('sha256', secret).update(`cancel:${id}`).digest();
}

export function signCancelToken(id: string, secret: string): string {
  if (!secret || secret.length < 16) throw new Error('BOOKING_TOKEN_SECRET no configurado (mínimo 16 caracteres)');
  return `${b64(id)}.${b64(sig(id, secret))}`;
}

/** Devuelve el id de la reserva si la firma es válida; null en cualquier otro caso. */
export function verifyCancelToken(token: string | null | undefined, secret: string): string | null {
  if (!token || !secret || typeof token !== 'string' || token.length > 300) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  let id: string;
  try { id = Buffer.from(parts[0], 'base64url').toString('utf8'); } catch { return null; }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const given = Buffer.from(parts[1], 'base64url');
  const expected = sig(id, secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return id;
}
