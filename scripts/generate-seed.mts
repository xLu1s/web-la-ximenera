/**
 * Genera supabase/migrations/20261023000400_seed_content.sql a partir de los datos actuales
 * de la web (src/data/*.ts) y copia las fotos de la galería a public/galeria/.
 *
 * El fichero histórico está congelado: la carta física de 2026 vive en
 * supabase/migrations/20261026120000_carta_vinos.sql (npm no lo regenera aquí).
 * Para reescribir el seed antiguo: FORCE_SEED=1 node scripts/generate-seed.mts
 */
import { writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { menu } from '../src/data/menu.ts';
import { menuDelDia } from '../src/data/menuDelDia.ts';
import { hours } from '../src/data/site.ts';
import { instagramMeta } from '../src/data/gallery.ts';

if (process.env.FORCE_SEED !== '1') {
  console.log('Seed histórico congelado (20261023000400). Carta física: supabase/migrations/20261026120000_carta_vinos.sql. FORCE_SEED=1 para regenerar el seed antiguo.');
  process.exit(0);
}

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const q = (v: unknown): string => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
};
const arr = (a: string[] = []): string => (a.length ? `array[${a.map(q).join(', ')}]::text[]` : `'{}'::text[]`);

const out: string[] = [];
out.push('-- =====================================================================');
out.push('-- Contenido inicial: copia LITERAL de los datos de la web estática (src/data/*.ts).');
out.push('-- Generado por scripts/generate-seed.mts. No editar a mano.');
out.push('-- =====================================================================');
out.push('');
out.push("insert into public.admins (email) values ('luisbalaguer97@gmail.com') on conflict do nothing;");
out.push('');

// Horario: src/data/site.ts → opening_hours. "13:30–16:00 · 20:30–23:00"; cierre 00:00 = 24:00.
const dayIndex: Record<string, number> = { Lunes: 1, Martes: 2, 'Miércoles': 3, Jueves: 4, Viernes: 5, 'Sábado': 6, Domingo: 7 };
out.push('-- Horario (src/data/site.ts). Servicio "comida" = franja de mediodía, "cena" = franja de noche.');
for (const h of hours) {
  if (h.value === 'Cerrado') continue;
  const ranges = h.value.split('·').map((r) => r.trim());
  for (const r of ranges) {
    const [opens, closesRaw] = r.split('–').map((x) => x.trim());
    const closes = closesRaw === '00:00' ? '24:00' : closesRaw;
    const service = Number(opens.split(':')[0]) < 18 ? 'comida' : 'cena';
    out.push(`insert into public.opening_hours (weekday, service, opens, closes) values (${dayIndex[h.day]}, ${q(service)}, ${q(opens)}, ${q(closes)});`);
  }
}
out.push('');

out.push('-- Carta (src/data/menu.ts)');
menu.forEach((s, si) => {
  out.push(
    `insert into public.menu_categories (slug, tab, title, subtitle, intro, notes, sort_order) values (${q(s.id)}, ${q(s.tab)}, ${q(s.title)}, ${q(s.subtitle)}, ${q(s.intro)}, ${arr(s.notes)}, ${si + 1});`,
  );
  s.items.forEach((it, ii) => {
    out.push(
      `insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, ${q(it.name)}, ${q(it.price)}, ${q(it.half)}, ${arr(it.allergens)}, ${ii + 1} from public.menu_categories where slug = ${q(s.id)};`,
    );
  });
});
out.push('');

out.push('-- Menú del día (src/data/menuDelDia.ts). Precio con la misma normalización que ya aplicaba la web ("16.50€" → "16,50 €").');
const price = menuDelDia.price.replace('.', ',').replace('€', ' €');
out.push(
  `insert into public.special_menus (kind, title, subtitle, courses, price, price_note, sort_order) values ('del_dia', 'Menú del día', ${q(menuDelDia.days.replace('Menú de ', ''))}, ${q(JSON.stringify(menuDelDia.courses))}::jsonb, ${q(price)}, ${q(menuDelDia.priceNote)}, 1);`,
);
out.push('');

// Galería: mismo orden que la web estática (oficiales por nombre de archivo, luego fotos de clientes).
mkdirSync('public/galeria', { recursive: true });
const items: { file: string; src: string; alt: string; provisional: boolean }[] = [];
for (const f of readdirSync('src/assets/instagram').filter((f) => /\.(jpe?g|png|webp)$/.test(f)).sort()) {
  items.push({ file: f, src: `src/assets/instagram/${f}`, alt: instagramMeta[f]?.alt ?? 'Plato de La Ximenera', provisional: false });
}
const clients = [
  ['pulpo-brasa.jpg', 'Pulpo a la brasa con pimientos y tostas'],
  ['tataki-atun.jpg', 'Tataki de atún'],
  ['almejas.jpg', 'Almejas en salsa'],
  ['tartar.jpg', 'Tartar con algas'],
  ['postre.jpg', 'Postre con nata y frutos secos'],
];
for (const [f, alt] of clients) items.push({ file: f, src: `src/assets/photos/${f}`, alt, provisional: true });

out.push('-- Galería (fotos actuales de la web, servidas desde public/galeria/)');
let n = 0;
for (const it of items) {
  n += 1;
  const name = it.file.replace(/\.[a-z]+$/, '.webp');
  await sharp(it.src).resize({ width: 760, withoutEnlargement: true }).webp({ quality: 80 }).toFile(`public/galeria/${name}`);
  out.push(
    `insert into public.gallery_items (media_type, static_path, mime_type, caption, is_provisional, sort_order) values ('image', ${q(`/galeria/${name}`)}, 'image/webp', ${q(it.alt)}, ${it.provisional}, ${n});`,
  );
}
out.push('');

writeFileSync('supabase/migrations/20261023000400_seed_content.sql', out.join('\n'));
console.log('OK', out.length, 'líneas');
