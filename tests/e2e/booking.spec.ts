import { test, expect, devices } from '@playwright/test';
import { apiBook, emailsTo, fillBookingForm, futureDate, sql, TUE, SAT, MON, uniqueIp, validBooking, waitEmails } from './helpers';
import { T } from '../helpers/env';

test.describe('Formulario público de reservas', () => {
  test('el CTA principal «Reservar» lleva al formulario (único CTA de reserva)', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.nav .btn')).toHaveText('Reservar');
    await expect(page.locator('.nav .btn')).toHaveAttribute('href', '#reservar');
    await expect(page.locator('.hero__ctas .btn--gold')).toHaveAttribute('href', '#reservar');
    await expect(page.locator('[data-booking-form]')).toBeVisible();
  });

  test('sin WhatsApp ni teléfono visibles en la web pública; el teléfono sigue en el JSON-LD', async ({ page, request }) => {
    const phone = /681\s?14\s?37\s?95|681143795/;
    for (const path of ['/', '/privacidad', '/aviso-legal', '/cookies', '/reserva/cancelar?t=abc.def']) {
      const html = await (await request.get(path)).text();
      expect(html, path).not.toMatch(/wa\.me|whatsapp/i);
      expect(html, path).not.toMatch(/href="tel:/i);
      // Fuera de los datos estructurados (invisibles) no debe aparecer el número.
      const visible = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
      expect(visible, path).not.toMatch(phone);
      await page.goto(path);
      await expect(page.locator('a[href^="tel:"]'), path).toHaveCount(0);
      expect(await page.locator('body').innerText(), path).not.toMatch(phone);
    }
    await page.goto('/');
    await expect(page.locator('.fab, .fab__btn')).toHaveCount(0);
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ld.map((t) => JSON.parse(t)).some((d) => d.telephone === '+34681143795')).toBe(true);
  });

  test('reserva válida desde el formulario: confirmación, referencia y emails (cliente + propietario)', async ({ page, request }) => {
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': uniqueIp() });
    const day = futureDate(200, TUE);
    const email = 'form.valida@example.com';
    await page.goto('/#reservar');
    await fillBookingForm(page, { date: day, party: 4, time: '14:00', email });
    await page.getByRole('button', { name: 'Reservar', exact: true }).click();
    const ok = page.locator('[data-bk-ok]');
    await expect(ok).toBeVisible();
    await expect(ok).toContainText('¡Reserva confirmada!');
    await expect(ok).toContainText('4 personas');
    const ref = (await ok.locator('[data-bk-ref]').textContent())!;
    expect(ref).toMatch(/^LX-[A-Z0-9]{6}$/);
    const rows = await sql<{ party_size: number; service: string }>('select party_size, service from public.bookings where reference = $1', [ref]);
    expect(rows).toEqual([{ party_size: 4, service: 'comida' }]);
    const [customer] = await waitEmails(request, email, 1);
    expect(customer.subject).toContain(ref);
    expect(customer.html).toContain('/reserva/cancelar?t=');
    const owner = (await emailsTo(request, T.owner)).filter((e) => e.subject.includes(ref));
    expect(owner).toHaveLength(1);
    expect(owner[0].text).toContain('600 123 123');
  });

  test('la lista de horas sale del horario: domingo solo comida, lunes cerrado', async ({ page }) => {
    await page.goto('/#reservar');
    const form = page.locator('[data-booking-form]');
    await form.locator('[name="date"]').fill(futureDate(201, MON));
    await expect(form.locator('[data-bk-hint]')).toContainText('cerrado');
    await form.locator('[name="date"]').fill(futureDate(201, SAT));
    await expect(form.locator('optgroup')).toHaveCount(2);
    await expect(form.locator('option[value="12:30"]')).toHaveCount(1);
    await expect(form.locator('option[value="23:00"]')).toHaveCount(1);
    await expect(form.locator('option[value="23:15"]')).toHaveCount(0);
    await form.locator('[name="date"]').fill(futureDate(201, 7));
    await expect(form.locator('optgroup')).toHaveCount(1);
    await expect(form.locator('optgroup')).toHaveAttribute('label', /Comida/);
  });

  test('errores claros en español: sin consentimiento y servicio completo', async ({ page, request }) => {
    const ip = uniqueIp();
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': ip });
    const day = futureDate(202, TUE);
    await page.goto('/#reservar');
    await fillBookingForm(page, { date: day, time: '13:30', email: 'sin.consent@example.com', consent: false });
    await page.getByRole('button', { name: 'Reservar', exact: true }).click();
    await expect(page.locator('[data-bk-error]')).toHaveText('Para reservar debes aceptar la política de privacidad.');
    // Llenamos el servicio (80) por la API y el formulario muestra "completo"
    for (let i = 0; i < 6; i++) expect((await apiBook(request, validBooking({ date: day, time: '13:30', party: 12 }))).status).toBe(201);
    expect((await apiBook(request, validBooking({ date: day, time: '13:30', party: 8 }))).status).toBe(201);
    await page.locator('[data-booking-form] [name="date"]').fill(futureDate(203, TUE));
    await page.locator('[data-booking-form] [name="date"]').fill(day);
    await expect(page.locator('optgroup').first()).toHaveAttribute('label', /completo/);
    await expect(page.locator('option[value="13:30"]')).toHaveJSProperty('disabled', true);
  });
});

test.describe('Móvil', () => {
  const { defaultBrowserType: _ignored, ...pixel } = devices['Pixel 7'];
  test.use(pixel);
  test('reserva completa en viewport móvil', async ({ page }) => {
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': uniqueIp() });
    await page.goto('/');
    await page.locator('[data-nav-toggle]').click();
    await page.locator('.nav .btn', { hasText: 'Reservar' }).click();
    await expect(page.locator('#reservar')).toBeInViewport();
    const day = futureDate(204, SAT);
    await fillBookingForm(page, { date: day, party: 2, time: '20:00', email: 'movil@example.com' });
    // el formulario cabe en pantalla (sin scroll horizontal)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.getByRole('button', { name: 'Reservar', exact: true }).click();
    await expect(page.locator('[data-bk-ok]')).toContainText('¡Reserva confirmada!');
  });
});

test.describe('Cancelación por enlace firmado', () => {
  test('el cliente cancela desde el email y la plaza queda libre', async ({ page, request }) => {
    const day = futureDate(205, TUE);
    const email = 'cancela@example.com';
    for (let i = 0; i < 6; i++) await apiBook(request, validBooking({ date: day, party: 12, email: i === 0 ? email : 'otro@example.com' }));
    expect((await apiBook(request, validBooking({ date: day, party: 8 }))).status).toBe(201); // 80
    expect((await apiBook(request, validBooking({ date: day, party: 1 }))).body.error).toBe('full');
    const [mail] = await waitEmails(request, email, 1);
    const link = mail.html.match(/href="([^"]*\/reserva\/cancelar\?t=[^"]+)"/)![1].replace(/&amp;/g, '&');
    await page.goto(link);
    await expect(page.locator('main')).toContainText('¿Seguro que quieres cancelar?');
    await page.getByRole('button', { name: 'Sí, cancelar mi reserva' }).click();
    await expect(page.locator('[data-cancel-state="done"]')).toContainText('Tu reserva se ha cancelado');
    await waitEmails(request, email, 2); // confirmación de la cancelación
    expect((await apiBook(request, validBooking({ date: day, party: 12 }))).status).toBe(201); // plaza liberada
    // reutilizar el enlace
    await page.goto(link);
    await expect(page.locator('[data-cancel-state="already"]')).toContainText('ya estaba cancelada');
  });
  test('token inválido o manipulado → mensaje de error y 404', async ({ page }) => {
    for (const t of ['', 'basura', 'MDAwMDAwMDAtMDAwMC00MDAwLTgwMDAtMDAwMDAwMDAwMDAw.firmafalsa']) {
      const r = await page.goto(`/reserva/cancelar?t=${encodeURIComponent(t)}`);
      expect(r!.status()).toBe(404);
      await expect(page.locator('[data-cancel-state="invalid"]')).toContainText('no es válido');
    }
  });
});
