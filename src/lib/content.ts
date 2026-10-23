/**
 * Contenido público de la web, leído de Supabase con la clave anónima (RLS: solo lo publicado).
 * Si Supabase no está configurado o falla, se usan los datos estáticos originales (src/data),
 * para que la web nunca se quede en blanco.
 */
import { anonClient, mediaPublicUrl } from './supabase';
import { hasSupabase } from './env';
import { FALLBACK_HOURS, type OpeningHour } from './hours';
import { menu as staticMenu } from '../data/menu';
import { menuDelDia as staticMenuDelDia } from '../data/menuDelDia';
import { instagramMeta } from '../data/gallery';

export type Allergen = 'gluten' | 'crustaceos' | 'huevos' | 'pescado' | 'cacahuetes' | 'soja' | 'lacteos'
  | 'frutos_cascara' | 'apio' | 'mostaza' | 'sesamo' | 'sulfitos' | 'altramuces' | 'moluscos';

/** Los 14 alérgenos de declaración obligatoria (Reglamento UE 1169/2011). Etiquetas de la carta original para los 4 que usaba. */
export const ALLERGENS: Record<Allergen, string> = {
  gluten: 'Gluten', crustaceos: 'Crustáceos y mariscos', huevos: 'Huevos', pescado: 'Pescado', cacahuetes: 'Cacahuetes',
  soja: 'Soja', lacteos: 'Lácteos', frutos_cascara: 'Frutos de cáscara', apio: 'Apio', mostaza: 'Mostaza',
  sesamo: 'Sésamo', sulfitos: 'Sulfitos', altramuces: 'Altramuces', moluscos: 'Moluscos',
};

export interface MenuItemRow { id?: number; name: string; description?: string | null; price?: string | null; half_price?: string | null; allergens: Allergen[]; sort_order?: number; visible?: boolean }
export interface MenuCategoryRow { id?: number; slug: string; tab: string; title: string; subtitle?: string | null; intro?: string | null; notes: string[]; sort_order?: number; visible?: boolean; items: MenuItemRow[] }
export interface WineRow { id: number; name: string; wine_type: string; origin: string | null; description: string | null; price_bottle: number | null; price_glass: number | null; sort_order: number; visible: boolean }
export interface Course { title: string; items: string[] }
export interface SpecialMenuRow { id: number; kind: 'especial' | 'del_dia'; title: string; subtitle: string | null; description: string | null; courses: Course[]; price: string | null; price_note: string | null; image_path: string | null; starts_on: string | null; ends_on: string | null; visible: boolean; sort_order: number }
export interface GalleryRow { id: number; media_type: 'image' | 'video'; storage_path: string | null; static_path: string | null; mime_type: string | null; caption: string; credit: string | null; is_provisional: boolean; sort_order: number; visible: boolean }

export const WINE_TYPES: Record<string, string> = {
  tinto: 'Tintos', blanco: 'Blancos', rosado: 'Rosados', espumoso: 'Espumosos', generoso: 'Generosos', dulce: 'Dulces', otro: 'Otros',
};
export const WINES_PROVISIONAL_MESSAGE = 'Nuestra carta de vinos estará disponible muy pronto';

export interface PublicContent {
  menu: MenuCategoryRow[];
  wines: WineRow[];
  specials: SpecialMenuRow[];
  menuDelDia: SpecialMenuRow | null;
  gallery: (GalleryRow & { url: string })[];
  hours: OpeningHour[];
  maxParty: number;
  source: 'db' | 'static';
}

export const galleryUrl = (g: Pick<GalleryRow, 'storage_path' | 'static_path'>) =>
  g.storage_path ? mediaPublicUrl(g.storage_path) : (g.static_path ?? '');
export const menuImageUrl = (p: string | null) => (p ? mediaPublicUrl(p) : null);

/** ¿Está activo un menú especial en la fecha (Madrid) dada? (misma regla que la RLS). */
export function isSpecialActive(m: Pick<SpecialMenuRow, 'visible' | 'starts_on' | 'ends_on'>, today: string): boolean {
  return m.visible && (!m.starts_on || m.starts_on <= today) && (!m.ends_on || m.ends_on >= today);
}

/** Estado de un menú para el panel. */
export function specialStatus(m: Pick<SpecialMenuRow, 'visible' | 'starts_on' | 'ends_on'>, today: string): 'oculto' | 'programado' | 'caducado' | 'activo' {
  if (!m.visible) return 'oculto';
  if (m.starts_on && m.starts_on > today) return 'programado';
  if (m.ends_on && m.ends_on < today) return 'caducado';
  return 'activo';
}

export function formatEuro(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '';
  return `${Number(n).toFixed(2).replace('.', ',')} €`;
}

/** Galería inicial (misma que la web estática; copias WebP en public/galeria/). */
const STATIC_GALLERY: [string, string, boolean][] = [
  ...['ig-01', 'ig-02', 'ig-03', 'ig-04', 'ig-05', 'ig-06', 'ig-07'].map((f) => [`${f}.webp`, instagramMeta[`${f}.jpg`]?.alt ?? 'Plato de La Ximenera', false] as [string, string, boolean]),
  ['pulpo-brasa.webp', 'Pulpo a la brasa con pimientos y tostas', true],
  ['tataki-atun.webp', 'Tataki de atún', true],
  ['almejas.webp', 'Almejas en salsa', true],
  ['tartar.webp', 'Tartar con algas', true],
  ['postre.webp', 'Postre con nata y frutos secos', true],
];

function staticContent(): PublicContent {
  return {
    menu: staticMenu.map((s, i) => ({
      slug: s.id, tab: s.tab, title: s.title, subtitle: s.subtitle ?? null, intro: s.intro ?? null, notes: s.notes ?? [], sort_order: i,
      items: s.items.map((it) => ({ name: it.name, price: it.price ?? null, half_price: it.half ?? null, allergens: (it.allergens ?? []) as Allergen[] })),
    })),
    wines: [],
    specials: [],
    menuDelDia: {
      id: 0, kind: 'del_dia', title: 'Menú del día', subtitle: staticMenuDelDia.days.replace('Menú de ', ''), description: null,
      courses: staticMenuDelDia.courses, price: staticMenuDelDia.price.replace('.', ',').replace('€', ' €'), price_note: staticMenuDelDia.priceNote,
      image_path: null, starts_on: null, ends_on: null, visible: true, sort_order: 0,
    },
    gallery: STATIC_GALLERY.map(([file, caption, provisional], i) => ({
      id: i + 1, media_type: 'image' as const, storage_path: null, static_path: `/galeria/${file}`, mime_type: 'image/webp', caption,
      credit: null, is_provisional: provisional, sort_order: i, visible: true, url: `/galeria/${file}`,
    })),
    hours: FALLBACK_HOURS,
    maxParty: 12,
    source: 'static',
  };
}

export async function getPublicContent(): Promise<PublicContent> {
  if (!hasSupabase()) return staticContent();
  try {
    const db = anonClient();
    const [cats, items, wines, specials, gallery, hours, settings] = await Promise.all([
      db.from('menu_categories').select('*').order('sort_order').order('id'),
      db.from('menu_items').select('*').order('sort_order').order('id'),
      db.from('wines').select('*').order('sort_order').order('name').order('id'),
      db.from('special_menus').select('*').order('sort_order').order('starts_on', { nullsFirst: true }).order('id'),
      db.from('gallery_items').select('*').order('sort_order').order('id'),
      db.from('opening_hours').select('weekday, service, opens, closes, capacity').order('weekday'),
      db.from('settings').select('max_party_size').eq('id', 1).maybeSingle(),
    ]);
    const err = [cats, items, wines, specials, gallery, hours, settings].find((r) => r.error)?.error;
    if (err) throw err;
    const menu: MenuCategoryRow[] = (cats.data ?? []).map((c) => ({ ...c, notes: c.notes ?? [], items: (items.data ?? []).filter((i) => i.category_id === c.id) }));
    const allSpecials = (specials.data ?? []) as SpecialMenuRow[];
    return {
      menu,
      wines: (wines.data ?? []) as WineRow[],
      specials: allSpecials.filter((s) => s.kind === 'especial'),
      menuDelDia: allSpecials.find((s) => s.kind === 'del_dia') ?? null,
      gallery: ((gallery.data ?? []) as GalleryRow[]).map((g) => ({ ...g, url: galleryUrl(g) })),
      hours: (hours.data ?? []) as OpeningHour[],
      maxParty: settings.data?.max_party_size ?? 12,
      source: 'db',
    };
  } catch (e) {
    console.error('[content] Supabase no disponible, uso datos estáticos:', (e as Error).message);
    return staticContent();
  }
}
