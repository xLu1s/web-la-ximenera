/** Validación de los datos que el restaurante edita en el panel. Devuelve { ok, value } o { ok:false, error } en español. */
import { ALLERGENS, type Allergen, type Course } from './content';
import { DATE_RE, toMinutes } from './time';

type R<T> = { ok: true; value: T } | { ok: false; error: string };
const ok = <T>(value: T): R<T> => ({ ok: true, value });
const bad = (error: string): R<never> => ({ ok: false, error });

export function validateMenuItem(i: { name: string; description?: string | null; price?: string | null; half_price?: string | null; allergens?: string[]; sort_order?: number; visible?: boolean; recommended?: boolean; recommendation_note?: string | null }) {
  const name = (i.name ?? '').trim();
  if (!name) return bad('El plato necesita un nombre.');
  if (name.length > 200) return bad('El nombre del plato es demasiado largo (máx. 200).');
  if ((i.description ?? '').length > 600) return bad('La descripción es demasiado larga (máx. 600).');
  if ((i.price ?? '').length > 40 || (i.half_price ?? '').length > 40) return bad('El precio es demasiado largo (máx. 40 caracteres).');
  const note = (i.recommendation_note ?? '').trim();
  if (note.length > 200) return bad('La sugerencia es demasiado larga (máx. 200).');
  const allergens = [...new Set(i.allergens ?? [])];
  if (allergens.some((a) => !(a in ALLERGENS))) return bad('Alérgeno no válido.');
  return ok({ name, description: i.description?.trim() || null, price: i.price?.trim() || null, half_price: i.half_price?.trim() || null, allergens: allergens as Allergen[], sort_order: i.sort_order ?? 0, visible: i.visible ?? true, recommended: i.recommended ?? false, recommendation_note: note || null });
}

export function slugify(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'seccion';
}

export function validateCategory(c: { tab: string; title: string; subtitle?: string | null; intro?: string | null; notes?: string; sort_order?: number; visible?: boolean }) {
  const title = (c.title ?? '').trim();
  const tab = (c.tab ?? '').trim() || title;
  if (!title) return bad('La sección necesita un título.');
  if (tab.length > 40) return bad('El nombre de la pestaña es demasiado largo (máx. 40).');
  if (title.length > 120) return bad('El título es demasiado largo (máx. 120).');
  const notes = (c.notes ?? '').split('\n').map((x) => x.trim()).filter(Boolean);
  return ok({ tab, title, subtitle: c.subtitle?.trim() || null, intro: c.intro?.trim() || null, notes, sort_order: c.sort_order ?? 0, visible: c.visible ?? true });
}

export const WINE_TYPE_KEYS = ['tinto', 'blanco', 'rosado', 'espumoso', 'generoso', 'dulce', 'otro'] as const;
export const WINE_SECTION_KEYS = ['joven', 'crianza', 'galeria', 'blanco', 'cava', 'especial'] as const;

/** Precio en euros: admite "18", "18,50", "18.50 €". Vacío = null. */
export function parseEuro(s: string | null | undefined): number | null | undefined {
  const v = (s ?? '').replace('€', '').trim();
  if (!v) return null;
  if (!/^\d{1,5}([.,]\d{1,2})?$/.test(v)) return undefined;
  return Number(v.replace(',', '.'));
}

export function validateWine(w: { name: string; wine_type: string; origin?: string | null; description?: string | null; price_bottle?: string | null; price_glass?: string | null; sort_order?: number; visible?: boolean; section?: string | null; denominacion_origen?: string | null; recommended?: boolean; recommendation_note?: string | null }) {
  const name = (w.name ?? '').trim();
  if (!name) return bad('El vino necesita un nombre.');
  if (name.length > 160) return bad('El nombre es demasiado largo (máx. 160).');
  if (!(WINE_TYPE_KEYS as readonly string[]).includes(w.wine_type)) return bad('Elige un tipo de vino.');
  const section = (w.section ?? '').trim();
  if (section && !(WINE_SECTION_KEYS as readonly string[]).includes(section)) return bad('Elige una sección de la carta de vinos.');
  const denominacion = (w.denominacion_origen ?? '').trim();
  if (denominacion.length > 80) return bad('La denominación de origen es demasiado larga.');
  const note = (w.recommendation_note ?? '').trim();
  if (note.length > 200) return bad('La sugerencia es demasiado larga (máx. 200).');
  if ((w.origin ?? '').length > 160) return bad('El origen es demasiado largo (máx. 160).');
  if ((w.description ?? '').length > 400) return bad('La nota del vino es demasiado larga (máx. 400).');
  const pb = parseEuro(w.price_bottle), pg = parseEuro(w.price_glass);
  if (pb === undefined || pg === undefined) return bad('Precio no válido. Escribe por ejemplo 18,50.');
  return ok({ name, wine_type: w.wine_type, origin: w.origin?.trim() || null, description: w.description?.trim() || null, price_bottle: pb, price_glass: pg, sort_order: w.sort_order ?? 0, visible: w.visible ?? true, section: section || null, denominacion_origen: denominacion || null, recommended: w.recommended ?? false, recommendation_note: note || null });
}

export function validateSpecialMenu(m: { kind: string; title: string; subtitle?: string | null; description?: string | null; price?: string | null; price_note?: string | null; starts_on?: string | null; ends_on?: string | null; courses: Course[]; visible?: boolean; sort_order?: number }) {
  const title = (m.title ?? '').trim();
  if (!title) return bad('El menú necesita un título.');
  if (!['especial', 'del_dia'].includes(m.kind)) return bad('Tipo de menú no válido.');
  const s = m.starts_on || null, e = m.ends_on || null;
  if ((s && !DATE_RE.test(s)) || (e && !DATE_RE.test(e))) return bad('Fecha no válida.');
  if (s && e && e < s) return bad('La fecha de fin no puede ser anterior a la de inicio.');
  const courses = m.courses.map((c) => ({ title: c.title.trim(), items: c.items.map((x) => x.trim()).filter(Boolean) })).filter((c) => c.title || c.items.length);
  if ((m.description ?? '').length > 1500) return bad('La descripción es demasiado larga (máx. 1500).');
  return ok({ kind: m.kind, title, subtitle: m.subtitle?.trim() || null, description: m.description?.trim() || null, price: m.price?.trim() || null, price_note: m.price_note?.trim() || null, starts_on: s, ends_on: e, courses, visible: m.visible ?? true, sort_order: m.sort_order ?? 0 });
}

/** Horario de un día: comida y cena opcionales. '00:00' como cierre = medianoche (24:00). */
export function validateDayHours(d: { comida?: { opens: string; closes: string } | null; cena?: { opens: string; closes: string } | null }) {
  const norm = (x: { opens: string; closes: string } | null | undefined, label: string): R<{ opens: string; closes: string } | null> => {
    if (!x) return ok(null);
    const re = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!re.test(x.opens) || !re.test(x.closes)) return bad(`${label}: escribe las horas como HH:MM.`);
    const closes = x.closes === '00:00' ? '24:00' : x.closes;
    if (toMinutes(closes) <= toMinutes(x.opens)) return bad(`${label}: el cierre debe ser posterior a la apertura.`);
    return ok({ opens: x.opens, closes });
  };
  const c = norm(d.comida, 'Comida'); if (!c.ok) return c;
  const n = norm(d.cena, 'Cena'); if (!n.ok) return n;
  if (c.value && n.value && toMinutes(c.value.closes) > toMinutes(n.value.opens)) return bad('La comida debe terminar antes de que empiece la cena.');
  return ok({ comida: c.value, cena: n.value });
}

/** Subidas a la galería / imágenes de menú. */
export const UPLOAD_RULES = {
  image: { types: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'], maxBytes: 10 * 1024 * 1024 },
  video: { types: ['video/mp4', 'video/webm'], maxBytes: 50 * 1024 * 1024 },
} as const;
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif', 'video/mp4': 'mp4', 'video/webm': 'webm' };

export function validateUpload(f: { type: string; size: number; name?: string }, allowVideo = true): R<{ mediaType: 'image' | 'video'; ext: string }> {
  const isImg = (UPLOAD_RULES.image.types as readonly string[]).includes(f.type);
  const isVid = (UPLOAD_RULES.video.types as readonly string[]).includes(f.type);
  if (!isImg && !(allowVideo && isVid)) return bad(allowVideo ? 'Formato no admitido. Sube fotos JPG, PNG, WebP o AVIF, o vídeos MP4 o WebM.' : 'Formato no admitido. Sube una foto JPG, PNG, WebP o AVIF.');
  if (!Number.isFinite(f.size) || f.size <= 0) return bad('El archivo está vacío.');
  const rule = isImg ? UPLOAD_RULES.image : UPLOAD_RULES.video;
  if (f.size > rule.maxBytes) return bad(isImg ? 'La foto pesa demasiado (máximo 10 MB).' : 'El vídeo pesa demasiado (máximo 50 MB).');
  return ok({ mediaType: isImg ? 'image' : 'video', ext: EXT[f.type] });
}
