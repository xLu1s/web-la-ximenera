import { test, expect, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { futureDate, login, sql, TUE, apiBook, validBooking, uniqueIp, fillBookingForm } from './helpers';

// Capturas para el informe (npm run screenshots). No forman parte de la batería normal.
test.skip(!process.env.SCREENSHOTS, 'Solo con SCREENSHOTS=1');
const out = 'previews-panel';
mkdirSync(out, { recursive: true });

test('capturas', async ({ page, request, browser }) => {
  test.setTimeout(120_000);
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(new Date());
  // Menú especial de EJEMPLO solo para la captura (se borra al final; no es dato del negocio).
  await sql(`insert into public.special_menus (title, subtitle, description, courses, price, price_note, starts_on, ends_on)
    values ('[Ejemplo] Menú de fiestas', 'Ejemplo de captura', 'Menú de ejemplo creado solo para mostrar la sección; el restaurante pondrá aquí su menú real.',
    '[{"title":"Entrantes","items":["[Plato de ejemplo]","[Plato de ejemplo]"]},{"title":"Principal","items":["[Plato de ejemplo]"]},{"title":"Postre","items":["[Postre de ejemplo]"]}]'::jsonb,
    '[Precio]', 'Ejemplo', $1::date, $1::date + 2)`, [today]);
  try {
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('is-visible')));
    // La cabecera fija taparía el título de las secciones en las capturas de elemento.
    const hideHeader = await page.addStyleTag({ content: 'body > header, .header { visibility: hidden !important; }' });
    await page.locator('#menus-especiales').screenshot({ path: `${out}/menus-especiales.png` });
    await page.locator('#vinos').screenshot({ path: `${out}/vinos-provisional.png` });
    await page.locator('#reservar').scrollIntoViewIfNeeded();
    await page.locator('#reservar').screenshot({ path: `${out}/reserva-formulario-desktop.png` });
    await hideHeader.evaluate((el) => (el as Element).remove());

    const { defaultBrowserType: _d, ...pixel } = devices['Pixel 7'];
    const ctx = await browser.newContext({ ...pixel, reducedMotion: 'reduce', locale: 'es-ES', timezoneId: 'Europe/Madrid', extraHTTPHeaders: { 'x-forwarded-for': uniqueIp() } });
    const m = await ctx.newPage();
    await m.goto('http://localhost:4322/#reservar');
    await m.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('is-visible')));
    await fillBookingForm(m, { date: futureDate(300, TUE), party: 2, time: '14:00', email: 'captura@example.com', name: 'Cliente de ejemplo' });
    const mHide = await m.addStyleTag({ content: 'body > header, .header { visibility: hidden !important; }' });
    await m.locator('[data-booking-form]').screenshot({ path: `${out}/reserva-formulario-movil.png` });
    await mHide.evaluate((el) => (el as Element).remove());
    await m.getByRole('button', { name: 'Reservar', exact: true }).click();
    await expect(m.locator('[data-bk-ok]')).toBeVisible();
    await m.locator('[data-bk-ok]').screenshot({ path: `${out}/reserva-confirmada-movil.png` });
    await ctx.close();

    const day = futureDate(301, TUE);
    for (const [t, p, n] of [['13:30', 4, 'Cliente Uno'], ['14:00', 2, 'Cliente Dos'], ['21:00', 6, 'Cliente Tres']] as const) {
      await apiBook(request, validBooking({ date: day, time: t, party: p, name: n, email: 'ejemplo@example.com' }));
    }
    await login(page);
    await page.goto(`/admin/reservas?fecha=${day}`);
    await page.screenshot({ path: `${out}/admin-reservas.png`, fullPage: true });
    await page.goto('/admin/carta');
    await page.locator('details[data-category="frios"] summary').click();
    await page.screenshot({ path: `${out}/admin-carta.png` });
    await page.goto('/admin/vinos');
    await page.screenshot({ path: `${out}/admin-vinos.png` });
    await page.goto('/admin/menus');
    await page.screenshot({ path: `${out}/admin-menus.png` });
    await page.goto('/admin/galeria');
    await page.screenshot({ path: `${out}/admin-galeria.png` });
    await page.goto('/admin/ajustes');
    await page.screenshot({ path: `${out}/admin-ajustes.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/admin/reservas?fecha=${day}`);
    await page.screenshot({ path: `${out}/admin-reservas-movil.png`, fullPage: true });
    await page.goto('/admin/salir');
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto('/admin/login');
    await page.screenshot({ path: `${out}/admin-login.png` });
  } finally {
    await sql(`delete from public.special_menus where title like '[Ejemplo]%'`);
  }
});
