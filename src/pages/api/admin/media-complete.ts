import type { APIRoute } from 'astro';
export const prerender = false;
import { serviceClient } from '../../../lib/supabase';
import { json, readBody } from '../../../lib/http';
import { validateUpload } from '../../../lib/validate';
import { dbErrorMessage } from '../../../lib/admin';

/**
 * Paso 2: comprueba el archivo REAL subido (tamaño y tipo que registra Storage), y lo enlaza
 * a la galería o al menú. Si no cumple las reglas, se borra.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const b = await readBody(request);
  const purpose = b.purpose === 'menu' ? 'menu' : 'gallery';
  const path = String(b.path ?? '');
  const prefix = purpose === 'gallery' ? 'galeria/' : 'menus/';
  if (!path.startsWith(prefix) || !/^[a-z]+\/[0-9a-f-]{36}\.[a-z0-9]{2,5}$/.test(path)) return json({ ok: false, message: 'Ruta no válida.' }, 400);
  const svc = serviceClient();
  const [folder, file] = path.split('/');
  const { data: list, error: le } = await svc.storage.from('media').list(folder, { search: file, limit: 1 });
  const obj = list?.find((o) => o.name === file);
  if (le || !obj) return json({ ok: false, message: 'No se encuentra el archivo subido.' }, 404);
  const meta = (obj.metadata ?? {}) as { size?: number; mimetype?: string };
  const v = validateUpload({ type: String(meta.mimetype ?? ''), size: Number(meta.size ?? 0) }, purpose === 'gallery');
  if (!v.ok) {
    await svc.storage.from('media').remove([path]);
    return json({ ok: false, message: v.error }, 422);
  }
  const sb = locals.supabase; // escrituras con la sesión del admin (RLS)
  if (purpose === 'gallery') {
    const caption = String(b.caption ?? '').trim().slice(0, 300);
    const { data: last } = await sb.from('gallery_items').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
    const { data, error } = await sb.from('gallery_items').insert({
      media_type: v.value.mediaType, storage_path: path, mime_type: meta.mimetype, size_bytes: meta.size,
      caption, sort_order: (last?.sort_order ?? 0) + 1, visible: true,
    }).select('id').single();
    if (error) { await svc.storage.from('media').remove([path]); return json({ ok: false, message: dbErrorMessage(error) }, 400); }
    return json({ ok: true, id: data.id });
  }
  const menuId = Number(b.menu_id);
  const { data: old } = await sb.from('special_menus').select('image_path').eq('id', menuId).maybeSingle();
  const { error, count } = await sb.from('special_menus').update({ image_path: path }, { count: 'exact' }).eq('id', menuId);
  if (error || !count) { await svc.storage.from('media').remove([path]); return json({ ok: false, message: dbErrorMessage(error) }, 400); }
  if (old?.image_path && old.image_path !== path) await svc.storage.from('media').remove([old.image_path]);
  return json({ ok: true });
};
