import { test, expect, type Page } from '@playwright/test';
import sharp from 'sharp';
import { futureDate, login, sql, TUE, MON, apiBook, validBooking, uniqueIp } from './helpers';

test.describe.configure({ mode: 'serial' });
test.beforeEach(async ({ page }) => { await login(page); await expect(page).toHaveURL(/\/admin\/reservas/); });

const madridToday = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(new Date());
const shift = (d: string, n: number) => new Date(Date.parse(d + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);

test('vinos: mensaje provisional mientras no hay vinos visibles y carta al añadir uno', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#vinos [data-wines-provisional]')).toHaveText(/Nuestra carta de vinos estará disponible muy pronto/);
  await page.goto('/admin/vinos');
  await expect(page.locator('[data-wines-status="provisional"]')).toBeVisible();
  const f = page.locator('[data-new-wine]');
  await f.getByLabel('Nombre').fill('Tinto de prueba E2E');
  await f.getByLabel('Tipo').selectOption('tinto');
  await f.getByLabel('D.O. / origen').fill('D.O. Alicante');
  await f.getByLabel('Precio botella (€)').fill('18,50');
  await f.getByLabel('Precio copa (€)').fill('3,5');
  await f.getByRole('button', { name: 'Añadir vino' }).click();
  await expect(page.getByRole('status')).toContainText('guardado');
  await page.goto('/');
  await expect(page.locator('#vinos [data-wines-provisional]')).toHaveCount(0);
  const wine = page.locator('#vinos [data-wine]');
  await expect(wine).toContainText('Tinto de prueba E2E');
  await expect(wine).toContainText('D.O. Alicante');
  await expect(wine).toContainText('Botella 18,50 €');
  await expect(wine).toContainText('Copa 3,50 €');
  // precio no válido
  await page.goto('/admin/vinos');
  const row = page.locator('form[data-wine="Tinto de prueba E2E"]');
  await row.getByLabel('Precio botella (€)').fill('carísimo');
  await row.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('alert')).toContainText('Precio no válido');
  // ocultarlo → vuelve el mensaje provisional
  await page.locator('form[data-wine="Tinto de prueba E2E"]').getByLabel('Visible').uncheck();
  await page.locator('form[data-wine="Tinto de prueba E2E"]').getByRole('button', { name: 'Guardar' }).click();
  await page.goto('/');
  await expect(page.locator('#vinos [data-wines-provisional]')).toBeVisible();
  // borrar
  await page.goto('/admin/vinos');
  page.once('dialog', (d) => d.accept());
  await page.locator('form[data-wine="Tinto de prueba E2E"]').getByRole('button', { name: 'Borrar' }).click();
  await expect(page.getByRole('status')).toHaveText('Vino eliminado.');
  expect(await sql('select 1 from public.wines')).toHaveLength(0);
});

test('carta: la web muestra los 42 platos originales; crear, editar, ocultar y borrar un plato', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#carta .carta__item')).toHaveCount(42);
  await expect(page.locator('#carta')).toContainText('Nuetras patatas Bravas');
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
