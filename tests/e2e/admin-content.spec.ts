import { test, expect, type Page } from '@playwright/test';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { futureDate, login, sql, TUE, MON, apiBook, validBooking, uniqueIp } from './helpers';

test.describe.configure({ mode: 'serial' });
test.beforeEach(async ({ page }) => { await login(page); await expect(page).toHaveURL(/\/admin\/reservas/); });

const madridToday = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(new Date());
const shift = (d: string, n: number) => new Date(Date.parse(d + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);

test('vinos: sugerencias, filtro por D.O. y alta de un vino', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#vinos [data-wines-provisional]')).toHaveCount(0);
  const suggested = page.locator('#vinos [data-suggested]');
  await expect(suggested).toContainText('Lynus Infante');
  await expect(suggested).toContainText('Luis XIV');
  await expect(suggested).toContainText('Viuda Negra');
  await page.locator('#vinos [data-do-select]').selectOption('DO Alicante');
  await expect(page.locator('#vinos [data-wine="Gurgu, jove de trellat"]')).toBeVisible();
  await expect(page.locator('#vinos [data-wine="Lynus Infante"]')).toBeHidden();
  await page.locator('#vinos [data-do-select]').selectOption('');
  await expect(page.locator('#vinos [data-wine="Lynus Infante"]')).toBeVisible();
  const qr = await page.request.get('/qr.png');
  expect(qr.status()).toBe(200);
  expect(qr.headers()['content-type']).toContain('image/png');
  await page.goto('/admin/vinos');
  await expect(page.locator('[data-wines-status="list"]')).toBeVisible();
  const f = page.locator('[data-new-wine]');
  await f.getByLabel('Nombre').fill('Tinto de prueba E2E');
  await f.getByLabel('Tipo').selectOption('tinto');
  await f.getByLabel('D.O. / origen').fill('D.O. Alicante');
  await f.getByLabel('Precio botella (€)').fill('18,50');
  await f.getByLabel('Precio copa (€)').fill('3,5');
  await f.getByRole('button', { name: 'Añadir vino' }).click();
  await expect(page.getByRole('status')).toContainText('guardado');
  await page.goto('/');
  const wine = page.locator('#vinos [data-wine="Tinto de prueba E2E"]');
  await expect(wine).toContainText('Tinto de prueba E2E');
  await expect(wine).toContainText('D.O. Alicante');
  await expect(wine).toContainText('Botella 18,50 €');
  await expect(wine).toContainText('Copa 3,50 €');
  await page.goto('/admin/vinos');
  const row = page.locator('form[data-wine="Tinto de prueba E2E"]');
  await row.getByLabel('Precio botella (€)').fill('carísimo');
  await row.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('alert')).toContainText('Precio no válido');
  await page.locator('form[data-wine="Tinto de prueba E2E"]').getByLabel('Visible').uncheck();
  await page.locator('form[data-wine="Tinto de prueba E2E"]').getByRole('button', { name: 'Guardar' }).click();
  await page.goto('/');
  await expect(page.locator('#vinos [data-wine="Tinto de prueba E2E"]')).toHaveCount(0);
  await expect(page.locator('#vinos [data-wines-provisional]')).toHaveCount(0);
  await page.goto('/admin/vinos');
  page.once('dialog', (d) => d.accept());
  await page.locator('form[data-wine="Tinto de prueba E2E"]').getByRole('button', { name: 'Borrar' }).click();
  await expect(page.getByRole('status')).toHaveText('Vino eliminado.');
  const left = await sql<{ n: number }>('select count(*)::int as n from public.wines where carta_key is not null');
  expect(left[0].n).toBeGreaterThan(0);
});

test('carta: la web muestra los 47 platos de la carta física; crear, editar, ocultar y borrar un plato', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#carta .carta__item')).toHaveCount(47);
  await expect(page.locator('#carta')).toContainText('Nuestras Patatas Bravas');
  await expect(page.locator('.nav a[href="#galeria"]')).toHaveCount(1);
  await page.goto('/admin/carta');
  const cat = page.locator('details[data-category="frios"]');
  await cat.locator('summary').click();
  const nf = cat.locator('[data-new-item]');
  await nf.getByLabel('Nombre').fill('Plato E2E de prueba');
  await nf.getByLabel('Descripción').fill('Con descripción');
  await nf.getByLabel('Precio').fill('11,00 €');
  await nf.getByLabel('Gluten').check();
  await nf.getByRole('button', { name: 'Añadir plato' }).click();
  await expect(page.getByRole('status')).toContainText('añadido');
  await page.goto('/');
  const item = page.locator('#panel-frios .carta__item', { hasText: 'Plato E2E de prueba' });
  await expect(item).toContainText('11,00 €');
  await expect(item).toContainText('Gluten');
  await expect(item).toContainText('Con descripción');
  await page.goto('/admin/carta');
  await page.locator('details[data-category="frios"] summary').click();
  const ef = page.locator('form[data-item="Plato E2E de prueba"]');
  await ef.getByLabel('Precio', { exact: true }).fill('12,50 €');
  await ef.getByLabel('Visible').uncheck();
  await ef.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('status')).toContainText('guardado');
  await page.goto('/');
  await expect(page.locator('#carta')).not.toContainText('Plato E2E de prueba');
  await page.goto('/admin/carta');
  await page.locator('details[data-category="frios"] summary').click();
  page.once('dialog', (d) => d.accept());
  await page.locator('form[data-item="Plato E2E de prueba"]').getByRole('button', { name: 'Borrar' }).click();
  await expect(page.getByRole('status')).toHaveText('Plato eliminado.');
  expect(await sql(`select 1 from public.menu_items where name = 'Plato E2E de prueba'`)).toHaveLength(0);
  // validación: nombre vacío
  await page.locator('details[data-category="frios"] summary').click();
  const empty = page.locator('details[data-category="frios"] [data-new-item]');
  await empty.getByLabel('Nombre').fill(' ');
  await empty.getByLabel('Nombre').evaluate((el: HTMLInputElement) => el.removeAttribute('required'));
  await empty.getByRole('button', { name: 'Añadir plato' }).click();
  await expect(page.getByRole('alert')).toContainText('necesita un nombre');
});

test('orden 1, 2, 3…: un plato nuevo recibe el siguiente número y sale el último; cambiar el número lo mueve en la web', async ({ page }) => {
  const names = async () => page.locator('#panel-frios .carta__item .carta__name').evaluateAll((els) => els.map((e) => e.firstChild?.textContent?.trim()));
  const [{ n }] = await sql<{ n: number }>(`select count(*)::int as n from public.menu_items i join public.menu_categories c on c.id = i.category_id where c.slug = 'frios'`);
  await page.goto('/admin/carta');
  const cat = page.locator('details[data-category="frios"]');
  await cat.locator('summary').click();
  // los platos existentes van 1..N y el formulario propone N+1
  await expect(cat.locator('form[data-item]').first().getByLabel('Orden (1 = sale primero)')).toHaveValue('1');
  const nf = cat.locator('[data-new-item]');
  await expect(nf.getByLabel('Orden (1 = sale primero)')).toHaveValue(String(n + 1));
  await expect(page.locator('[data-new-category]').getByLabel('Orden (1 = sale primero)')).toHaveValue('5');
  await nf.getByLabel('Nombre').fill('Plato orden E2E');
  await nf.getByRole('button', { name: 'Añadir plato' }).click();
  await expect(page.getByRole('status')).toContainText('añadido');
  expect(await sql(`select sort_order from public.menu_items where name = 'Plato orden E2E'`)).toEqual([{ sort_order: n + 1 }]);
  await page.goto('/');
  let list = await names();
  expect(list).toHaveLength(n + 1);
  expect(list.at(-1)).toBe('Plato orden E2E');
  const first = list[0];
  // cambiarle el número a 1 → sube arriba (empate con el 1 original: el más antiguo primero, orden estable)
  const setOrder = async (v: string) => {
    await page.goto('/admin/carta');
    await page.locator('details[data-category="frios"] summary').click();
    const ef = page.locator('form[data-item="Plato orden E2E"]');
    await ef.getByLabel('Orden (1 = sale primero)').fill(v);
    await ef.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('status')).toContainText('guardado');
    await page.goto('/');
    return names();
  };
  list = await setOrder('1');
  expect(list.slice(0, 2)).toEqual([first, 'Plato orden E2E']);
  // y con un número alto vuelve al final
  list = await setOrder(String(n + 5));
  expect(list.at(-1)).toBe('Plato orden E2E');
  // vino nuevo: el formulario propone el siguiente número de su tipo
  await page.goto('/admin/vinos');
  const wf = page.locator('[data-new-wine]');
  await wf.getByLabel('Tipo').selectOption('blanco');
  const [{ n: blancos }] = await sql<{ n: number }>(`select coalesce(max(sort_order), 0)::int as n from public.wines where wine_type = 'blanco'`);
  await expect(wf.getByLabel('Orden (1 = sale primero)')).toHaveValue(String(blancos + 1));
  await sql(`delete from public.menu_items where name = 'Plato orden E2E'`);
});

async function createMenu(page: Page, title: string, starts: string, ends: string) {
  await page.goto('/admin/menus/nuevo');
  const f = page.locator('[data-menu-form]');
  await f.getByLabel('Título', { exact: true }).fill(title);
  await f.getByLabel('Precio', { exact: true }).fill('45 € por persona');
  await f.getByLabel('Visible desde').fill(starts);
  await f.getByLabel('Visible hasta (incluido)').fill(ends);
  await f.locator('[name="course_items"]').first().fill('Entrante uno\nEntrante dos');
  await f.getByRole('button', { name: 'Guardar menú' }).click();
  await expect(page.getByRole('status')).toContainText('guardado');
}

test('menús especiales: visibles solo dentro de su rango de fechas', async ({ page }) => {
  const today = madridToday();
  await page.goto('/');
  await expect(page.locator('#menus-especiales')).toHaveCount(0);
  await createMenu(page, 'Menú Moros i Cristians E2E', shift(today, -1), shift(today, 3));
  await createMenu(page, 'Menú caducado E2E', shift(today, -10), shift(today, -1));
  await createMenu(page, 'Menú futuro E2E', shift(today, 1), shift(today, 10));
  await page.goto('/admin/menus');
  await expect(page.locator('[data-menu="Menú Moros i Cristians E2E"] [data-status]')).toHaveAttribute('data-status', 'activo');
  await expect(page.locator('[data-menu="Menú caducado E2E"] [data-status]')).toHaveAttribute('data-status', 'caducado');
  await expect(page.locator('[data-menu="Menú futuro E2E"] [data-status]')).toHaveAttribute('data-status', 'programado');
  await page.goto('/');
  const sec = page.locator('#menus-especiales');
  await expect(sec).toBeVisible();
  await expect(sec.locator('[data-special]')).toHaveCount(1);
  await expect(sec).toContainText('Menú Moros i Cristians E2E');
  await expect(sec).toContainText('45 € por persona');
  await expect(sec).toContainText('Entrante dos');
  await expect(page.locator('.nav a[href="#menus-especiales"]')).toHaveCount(1);
  // fecha fin anterior al inicio → error
  await page.goto('/admin/menus/nuevo');
  const f = page.locator('[data-menu-form]');
  await f.getByLabel('Título', { exact: true }).fill('Mal');
  await f.getByLabel('Visible desde').fill(shift(today, 5));
  await f.getByLabel('Visible hasta (incluido)').fill(shift(today, 1));
  await f.getByRole('button', { name: 'Guardar menú' }).click();
  await expect(page.getByRole('alert')).toContainText('no puede ser anterior');
  // al caducar desaparece (simulamos que el fin ya pasó)
  await sql(`update public.special_menus set ends_on = $1 where title = 'Menú Moros i Cristians E2E'`, [shift(today, -1)]);
  await page.goto('/');
  await expect(page.locator('#menus-especiales')).toHaveCount(0);
  // el menú del día original sigue en la carta
  await expect(page.locator('.menu-day')).toContainText('16,50 €');
  // borrar uno
  const [{ id }] = await sql<{ id: number }>(`select id from public.special_menus where title = 'Menú futuro E2E'`);
  await page.goto(`/admin/menus/${id}`);
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Borrar menú' }).click();
  await expect(page.getByRole('status')).toHaveText('Menú eliminado.');
});

test('galería: subir foto válida, rechazar tipo y tamaño no válidos, ocultar', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-gallery-item]')).toHaveCount(12);
  await page.goto('/admin/galeria');
  const up = page.locator('[data-uploader]');
  // sin campo de crédito, ni en el formulario de subida ni en las fichas
  await expect(page.locator('input[name="credit"]')).toHaveCount(0);
  await expect(page.getByText(/Crédito/i)).toHaveCount(0);
  // tipo no permitido
  await up.locator('[data-file]').setInputFiles({ name: 'nota.txt', mimeType: 'text/plain', buffer: Buffer.from('hola') });
  await up.getByRole('button', { name: 'Subir' }).click();
  await expect(up.locator('[data-status]')).toHaveText(/Formato no admitido/);
  // demasiado grande (11 MB)
  await up.locator('[data-file]').setInputFiles({ name: 'grande.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(11 * 1024 * 1024, 1) });
  await up.getByRole('button', { name: 'Subir' }).click();
  await expect(up.locator('[data-status]')).toHaveText(/pesa demasiado \(máximo 10 MB\)/);
  // el servidor también rechaza lo que declare mal el navegador
  const api = await page.request.post('/api/admin/upload-url', { data: { purpose: 'gallery', type: 'image/gif', size: 100 } });
  expect(api.status()).toBe(422);
  const big = await page.request.post('/api/admin/upload-url', { data: { purpose: 'gallery', type: 'video/mp4', size: 60 * 1024 * 1024 } });
  expect((await big.json()).message).toMatch(/máximo 50 MB/);
  // válida
  const png = await sharp({ create: { width: 64, height: 48, channels: 3, background: '#c9a55c' } }).png().toBuffer();
  await up.locator('[data-file]').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: png });
  await up.getByLabel(/Descripción/).fill('Foto subida E2E');
  await up.getByRole('button', { name: 'Subir' }).click();
  await expect(page.locator('form[data-gallery-admin="Foto subida E2E"]')).toBeVisible();
  await page.goto('/');
  const img = page.locator('[data-gallery-item] img[alt="Foto subida E2E"]');
  await expect(img).toHaveCount(1);
  // lo nuevo sale el último de la galería, con el siguiente número de orden
  await expect(page.locator('[data-gallery-item]').last().locator('img')).toHaveAttribute('alt', 'Foto subida E2E');
  expect(await sql(`select sort_order from public.gallery_items where caption = 'Foto subida E2E'`)).toEqual([{ sort_order: 13 }]);
  const src = await img.getAttribute('src');
  expect(src).toContain('/storage/v1/object/public/media/galeria/');
  expect((await page.request.get(src!)).status()).toBe(200);
  // ocultar
  await page.goto('/admin/galeria');
  const card = page.locator('form[data-gallery-admin="Foto subida E2E"]');
  await card.getByLabel('Visible').uncheck();
  await card.getByRole('button', { name: 'Guardar' }).click();
  await page.goto('/');
  await expect(page.locator('[data-gallery-item] img[alt="Foto subida E2E"]')).toHaveCount(0);
  // borrar (también borra el archivo)
  await page.goto('/admin/galeria');
  page.once('dialog', (d) => d.accept());
  await page.locator('form[data-gallery-admin="Foto subida E2E"]').getByRole('button', { name: 'Borrar' }).click();
  await expect(page.getByRole('status')).toContainText('eliminado');
  expect((await page.request.get(src!)).status()).not.toBe(200);
});

test('galería: subir un vídeo válido, verlo en la web como <video>, ocultarlo y borrarlo', async ({ page }) => {
  const mp4 = readFileSync('tests/fixtures/video-1s.mp4'); // vídeo H.264 real de 1 s (64×48)
  await page.goto('/admin/galeria');
  const up = page.locator('[data-uploader]');
  await up.locator('[data-file]').setInputFiles({ name: 'clip.mp4', mimeType: 'video/mp4', buffer: mp4 });
  await up.getByLabel(/Descripción/).fill('Vídeo subido E2E');
  await up.getByRole('button', { name: 'Subir' }).click();
  const card = page.locator('form[data-gallery-admin="Vídeo subido E2E"]');
  await expect(card).toBeVisible();
  await expect(card.locator('video')).toHaveCount(1);
  const [row] = await sql<{ media_type: string; mime_type: string; size_bytes: string; storage_path: string }>(
    `select media_type, mime_type, size_bytes, storage_path from public.gallery_items where caption = 'Vídeo subido E2E'`);
  expect(row).toMatchObject({ media_type: 'video', mime_type: 'video/mp4' });
  expect(Number(row.size_bytes)).toBe(mp4.length);
  expect(row.storage_path).toMatch(/^galeria\/[0-9a-f-]+\.mp4$/);
  // en la web pública
  await page.goto('/');
  await expect(page.locator('[data-gallery-item]')).toHaveCount(13);
  const video = page.locator('[data-gallery-item] video[aria-label="Vídeo subido E2E"]');
  await expect(video).toHaveCount(1);
  const src = (await video.getAttribute('src'))!;
  expect(src).toContain(`/storage/v1/object/public/media/${row.storage_path}`);
  for (const attr of ['controls', 'muted', 'playsinline']) await expect(video).toHaveAttribute(attr, '');
  await expect(video).toHaveAttribute('preload', 'metadata');
  expect(await video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(true);
  const res = await page.request.get(src);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toBe('video/mp4');
  const body = await res.body();
  expect(body.length).toBe(mp4.length);
  expect(body.subarray(4, 8).toString()).toBe('ftyp'); // contenedor MP4 válido
  // ocultar → desaparece de la web
  await page.goto('/admin/galeria');
  await card.getByLabel('Visible').uncheck();
  await card.getByRole('button', { name: 'Guardar' }).click();
  await page.goto('/');
  await expect(page.locator('[data-gallery-item] video')).toHaveCount(0);
  await expect(page.locator('[data-gallery-item]')).toHaveCount(12);
  // borrar → el archivo desaparece del Storage
  await page.goto('/admin/galeria');
  page.once('dialog', (d) => d.accept());
  await page.locator('form[data-gallery-admin="Vídeo subido E2E"]').getByRole('button', { name: 'Borrar' }).click();
  await expect(page.getByRole('status')).toContainText('eliminado');
  expect(await sql(`select 1 from public.gallery_items where caption = 'Vídeo subido E2E'`)).toHaveLength(0);
  expect(await sql(`select 1 from storage.objects where bucket_id = 'media' and name = $1`, [row.storage_path])).toHaveLength(0);
  expect((await page.request.get(src)).status()).not.toBe(200);
});

test('carta: crear una sección nueva con un plato aparece como pestaña en la web; ocultarla y borrarla', async ({ page }) => {
  await page.goto('/admin/carta');
  const nc = page.locator('[data-new-category]');
  await nc.getByLabel('Pestaña').fill('Arroces E2E');
  await nc.getByLabel('Título', { exact: true }).fill('Arroces de la casa E2E');
  await nc.getByLabel('Subtítulo').fill('Mínimo 2 personas');
  await nc.getByRole('button', { name: 'Crear sección' }).click();
  await expect(page.getByRole('status')).toContainText('Arroces de la casa E2E');
  const [{ slug }] = await sql<{ slug: string }>(`select slug from public.menu_categories where title = 'Arroces de la casa E2E'`);
  const cat = page.locator(`details[data-category="${slug}"]`);
  await cat.locator('summary').click();
  const nf = cat.locator('[data-new-item]');
  await nf.getByLabel('Nombre').fill('Arroz a banda E2E');
  await nf.getByLabel('Precio').fill('16,00 €');
  await nf.getByLabel('Pescado').check();
  await nf.getByRole('button', { name: 'Añadir plato' }).click();
  await expect(page.getByRole('status')).toContainText('añadido');
  await page.goto('/');
  const tab = page.locator('[data-menu-tabs] [role="tab"]', { hasText: 'Arroces E2E' });
  await expect(tab).toHaveCount(1);
  await tab.click();
  const panel = page.locator(`#panel-${slug}`);
  await expect(panel).toBeVisible();
  await expect(panel.locator('h3')).toHaveText('Arroces de la casa E2E');
  await expect(panel).toContainText('Mínimo 2 personas');
  await expect(panel.locator('.carta__item', { hasText: 'Arroz a banda E2E' })).toContainText('16,00 €');
  await expect(panel.locator('.carta__item', { hasText: 'Arroz a banda E2E' })).toContainText('Pescado');
  await expect(page.locator('#carta .carta__item')).toHaveCount(48);
  // ocultar la sección → desaparece la pestaña y sus platos
  await page.goto('/admin/carta');
  await page.locator(`details[data-category="${slug}"] summary`).click();
  const cf = page.locator(`details[data-category="${slug}"] form`).first();
  await cf.getByLabel('Visible').uncheck();
  await cf.getByRole('button', { name: 'Guardar sección' }).click();
  await page.goto('/');
  await expect(page.locator('[data-menu-tabs] [role="tab"]', { hasText: 'Arroces E2E' })).toHaveCount(0);
  await expect(page.locator('#carta')).not.toContainText('Arroz a banda E2E');
  await expect(page.locator('#carta .carta__item')).toHaveCount(47);
  // borrar la sección (y su plato)
  await page.goto('/admin/carta');
  await page.locator(`details[data-category="${slug}"] summary`).click();
  page.once('dialog', (d) => d.accept());
  await page.locator(`details[data-category="${slug}"]`).getByRole('button', { name: 'Borrar sección' }).click();
  await expect(page.getByRole('status')).toContainText('eliminad');
  expect(await sql(`select 1 from public.menu_categories where slug = $1`, [slug])).toHaveLength(0);
  expect(await sql(`select 1 from public.menu_items where name = 'Arroz a banda E2E'`)).toHaveLength(0);
});

test('menú del día: editarlo en el panel cambia la carta de la web; ocultarlo lo quita', async ({ page }) => {
  const [orig] = await sql<{ id: number; price: string; price_note: string | null; courses: unknown }>(
    `select id, price, price_note, courses from public.special_menus where kind = 'del_dia'`);
  expect(orig.price).toBe('16,50 €');
  await page.goto(`/admin/menus/${orig.id}`);
  const f = page.locator('[data-menu-form]');
  await f.getByLabel('Precio', { exact: true }).fill('17,00 €');
  await f.getByLabel('Nota del precio').fill('Bebida incluida E2E');
  await f.locator('[name="course_items"]').first().fill('Primer plato E2E\nOtro primero E2E');
  await f.getByRole('button', { name: 'Guardar menú' }).click();
  await expect(page.getByRole('status')).toContainText('guardado');
  await page.goto('/');
  const day = page.locator('.menu-day');
  await expect(day.locator('.menu-day__price')).toHaveText('17,00 €');
  await expect(day).toContainText('Bebida incluida E2E');
  await expect(day).toContainText('Otro primero E2E');
  await expect(page.locator('#menus-especiales')).toHaveCount(0); // el del día no va a la sección de especiales
  // ocultar → desaparece de la carta
  await page.goto(`/admin/menus/${orig.id}`);
  await f.getByLabel('Visible', { exact: true }).uncheck();
  await f.getByRole('button', { name: 'Guardar menú' }).click();
  await page.goto('/');
  await expect(page.locator('.menu-day')).toHaveCount(0);
  // volver a mostrarlo y restaurar los datos originales
  await page.goto(`/admin/menus/${orig.id}`);
  await f.getByLabel('Visible', { exact: true }).check();
  await f.getByRole('button', { name: 'Guardar menú' }).click();
  await page.goto('/');
  await expect(page.locator('.menu-day')).toBeVisible();
  await sql(`update public.special_menus set price = $2, price_note = $3, courses = $4::jsonb where id = $1`,
    [orig.id, orig.price, orig.price_note, JSON.stringify(orig.courses)]);
});

test('menú especial: subir una imagen la muestra en la web; quitarla la elimina', async ({ page }) => {
  const today = madridToday();
  await createMenu(page, 'Menú con foto E2E', shift(today, -1), shift(today, 5));
  const [{ id }] = await sql<{ id: number }>(`select id from public.special_menus where title = 'Menú con foto E2E'`);
  await page.goto(`/admin/menus/${id}`);
  const up = page.locator('[data-uploader]');
  const jpg = await sharp({ create: { width: 80, height: 60, channels: 3, background: '#7a4a2a' } }).jpeg().toBuffer();
  await up.locator('[data-file]').setInputFiles({ name: 'menu.jpg', mimeType: 'image/jpeg', buffer: jpg });
  await up.getByRole('button', { name: 'Subir imagen' }).click();
  await expect(page.getByRole('button', { name: 'Quitar imagen' })).toBeVisible();
  const [{ image_path }] = await sql<{ image_path: string }>(`select image_path from public.special_menus where id = $1`, [id]);
  expect(image_path).toMatch(/^menus\/.+\.jpg$/);
  await page.goto('/');
  const img = page.locator('#menus-especiales [data-special] img.special__img');
  await expect(img).toHaveAttribute('alt', 'Imagen del Menú con foto E2E');
  const src = (await img.getAttribute('src'))!;
  expect(src).toContain(`/storage/v1/object/public/media/${image_path}`);
  expect((await page.request.get(src)).status()).toBe(200);
  // quitar la imagen → desaparece de la web y del Storage
  await page.goto(`/admin/menus/${id}`);
  await page.getByRole('button', { name: 'Quitar imagen' }).click();
  await page.goto('/');
  await expect(page.locator('#menus-especiales [data-special]')).toContainText('Menú con foto E2E');
  await expect(page.locator('#menus-especiales img.special__img')).toHaveCount(0);
  expect((await page.request.get(src)).status()).not.toBe(200);
  await sql(`delete from public.special_menus where id = $1`, [id]);
});

test('reservas en el panel: ocupación por servicio, cancelar libera plazas, bloquear y ajustar aforo', async ({ page, request }) => {
  const day = futureDate(260, TUE);
  const r1 = await apiBook(request, validBooking({ date: day, time: '13:30', party: 12, name: 'Cliente Panel' }), uniqueIp());
  await apiBook(request, validBooking({ date: day, time: '21:00', party: 3 }), uniqueIp());
  await page.goto(`/admin/reservas?fecha=${day}`);
  await expect(page.locator('[data-service="comida"] [data-occupancy]')).toHaveText('12 / 80 personas');
  await expect(page.locator('[data-service="cena"] [data-occupancy]')).toHaveText('3 / 80 personas');
  const row = page.locator(`tr[data-booking="${r1.body.reference}"]`);
  await expect(row).toContainText('Cliente Panel');
  page.once('dialog', (d) => d.accept());
  await row.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByRole('status')).toContainText('cancelada');
  await expect(page.locator('[data-service="comida"] [data-occupancy]')).toHaveText('0 / 80 personas');
  // ajustar aforo de la cena a 4
  const cap = page.locator('[data-form="capacity"]');
  await cap.getByLabel('Servicio').selectOption('cena');
  await cap.getByLabel('Plazas (personas)').fill('4');
  await cap.getByRole('button', { name: 'Guardar aforo' }).click();
  await expect(page.locator('[data-service="cena"] [data-occupancy]')).toHaveText('3 / 4 personas');
  expect((await apiBook(request, validBooking({ date: day, time: '21:00', party: 2 }))).body.error).toBe('full');
  // bloquear la comida
  const bl = page.locator('[data-form="block"]');
  await bl.getByLabel('Servicio').selectOption('comida');
  await bl.getByLabel(/Motivo/).fill('Evento privado');
  await bl.getByRole('button', { name: 'Bloquear' }).click();
  await expect(page.locator('[data-service="comida"]')).toContainText('Bloqueado: Evento privado');
  expect((await apiBook(request, validBooking({ date: day, time: '13:30' }))).body.error).toBe('blocked');
  // quitar el bloqueo
  await page.locator('form', { hasText: 'Comida: bloqueado' }).getByRole('button', { name: 'Quitar' }).click();
  expect((await apiBook(request, validBooking({ date: day, time: '13:30' }))).status).toBe(201);
});

test('horarios y ajustes: abrir los lunes a mediodía se refleja en la web y en las reservas', async ({ page, request }) => {
  const monday = futureDate(261, MON);
  expect((await apiBook(request, validBooking({ date: monday, time: '13:30' }))).body.error).toBe('closed_day');
  await page.goto('/admin/ajustes');
  const mon = page.locator('tr[data-weekday="1"]');
  await mon.getByLabel('Abre a mediodía').check();
  await mon.locator('[name="1_comida_opens"]').fill('13:00');
  await mon.locator('[name="1_comida_closes"]').fill('16:00');
  await page.getByRole('button', { name: 'Guardar horario' }).click();
  await expect(page.getByRole('status')).toContainText('Horario guardado');
  await page.goto('/');
  await expect(page.locator('[data-hours] tr[data-day="1"] td')).toHaveText('13:00–16:00');
  await expect(page.locator('#horario')).not.toContainText('Cerramos los lunes');
  expect((await apiBook(request, validBooking({ date: monday, time: '13:30' }))).status).toBe(201);
  // validación: cierre antes que apertura
  await page.goto('/admin/ajustes');
  await page.locator('[name="2_cena_closes"]').fill('19:00');
  await page.getByRole('button', { name: 'Guardar horario' }).click();
  await expect(page.getByRole('alert')).toContainText('Martes: Cena: el cierre debe ser posterior');
  // restaurar: lunes cerrado
  await page.goto('/admin/ajustes');
  await page.locator('tr[data-weekday="1"]').getByLabel('Abre a mediodía').uncheck();
  await page.getByRole('button', { name: 'Guardar horario' }).click();
  await page.goto('/');
  await expect(page.locator('[data-hours] tr[data-day="1"] td')).toHaveText('Cerrado');
  await expect(page.locator('#horario')).toContainText('Cerramos los lunes. Domingos, solo mediodía.');
  // ajuste: máximo 6 personas por reserva
  await page.goto('/admin/ajustes');
  await page.getByLabel('Máximo de personas por reserva').fill('6');
  await page.getByRole('button', { name: 'Guardar ajustes' }).click();
  const tue = futureDate(262, TUE);
  const r = await apiBook(request, validBooking({ date: tue, party: 7 }));
  expect(r.body.error).toBe('party_too_large');
  expect(r.body.message).toContain('6 personas');
  await page.goto('/admin/ajustes');
  await page.getByLabel('Máximo de personas por reserva').fill('12');
  await page.getByRole('button', { name: 'Guardar ajustes' }).click();
  await expect(page.getByRole('status')).toHaveText('Ajustes guardados.');
});
