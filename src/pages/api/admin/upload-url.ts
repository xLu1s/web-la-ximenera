import type { APIRoute } from 'astro';
export const prerender = false;
import { randomUUID } from 'node:crypto';
import { serviceClient } from '../../../lib/supabase';
import { json, readBody } from '../../../lib/http';
import { validateUpload } from '../../../lib/validate';

/** Paso 1 de la subida: valida tipo/tamaño declarados y devuelve una URL de subida firmada (un solo uso). */
export const POST: APIRoute = async ({ request }) => {
  const b = await readBody(request);
  const purpose = b.purpose === 'menu' ? 'menu' : b.purpose === 'gallery' ? 'gallery' : null;
  if (!purpose) return json({ ok: false, message: 'Destino de subida no válido.' }, 400);
  const v = validateUpload({ type: String(b.type ?? ''), size: Number(b.size) }, purpose === 'gallery');
  if (!v.ok) return json({ ok: false, message: v.error }, 422);
  const path = `${purpose === 'gallery' ? 'galeria' : 'menus'}/${randomUUID()}.${v.value.ext}`;
  const { data, error } = await serviceClient().storage.from('media').createSignedUploadUrl(path);
  if (error || !data) { console.error('[upload-url]', error?.message); return json({ ok: false, message: 'No se pudo preparar la subida.' }, 500); }
  return json({ ok: true, path, signedUrl: data.signedUrl, token: data.token, mediaType: v.value.mediaType });
};
