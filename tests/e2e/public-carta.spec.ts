import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Carta pública e idioma', () => {
  test('la ruta /carta abre las secciones y platos del seed', async ({ page }) => {
    await page.goto('/carta');
    await expect(page).toHaveURL(/\/#carta$/);
    await expect(page.locator('#carta .carta__item')).toHaveCount(47);
    const tabs = page.locator('[data-menu-tabs] [role="tab"]');
    await expect(tabs).toHaveText(['Fríos', 'Calientes', 'Principal', 'Postre']);

    await expect(page.locator('#panel-frios')).toContainText('Ostras');
    await expect(page.locator('#panel-frios')).toContainText('Jamón Ibérico 100% Bellota');

    await page.locator('#tab-calientes').click();
    await expect(page.locator('#panel-calientes')).toBeVisible();
    await expect(page.locator('#panel-calientes')).toContainText('Nuestras Patatas Bravas');

    await page.locator('#tab-principal').click();
    await expect(page.locator('#panel-principal')).toContainText('Solomillo de Vaca a la brasa');

    await page.locator('#tab-postres').click();
    await expect(page.locator('#panel-postres')).toContainText('La Dama blanca');
  });

  test('la carta muestra los platos marcados como sugerencia', async ({ page }) => {
    await page.goto('/#carta');
    await expect(page.locator('#carta [data-suggested]')).toHaveCount(0);
    await expect(page.locator('#carta')).not.toContainText('Te sugerimos');
    await expect(page.locator('#carta .carta__item')).toHaveCount(47);
    await expect(page.locator('#panel-frios .carta__item', { hasText: 'Tartar de Atún Rojo sobre Wakame' }).locator('.sug')).toHaveText('Sugerencia');
    await page.locator('#tab-calientes').click();
    await expect(page.locator('#panel-calientes .carta__item', { hasText: 'Mejillones al Curry Thai' }).locator('.sug')).toHaveText('Sugerencia');
    await page.locator('#tab-principal').click();
    await expect(page.locator('#panel-principal .carta__item', { hasText: 'Solomillo de Vaca a la brasa' }).locator('.sug')).toHaveText('Sugerencia');
    await page.locator('#tab-frios').click();
    const ostras = page.locator('#panel-frios .carta__item', { hasText: 'Ostras' });
    await expect(ostras).toHaveCount(1);
    await expect(ostras.locator('.sug')).toHaveCount(0);
  });

  test('vinos: la sugerencia va en la ficha y el filtro por D.O. sigue', async ({ page }) => {
    await page.goto('/#vinos');
    await expect(page.locator('#vinos [data-suggested]')).toHaveCount(0);
    await expect(page.locator('#vinos')).not.toContainText('Te sugerimos');
    for (const name of ['Lynus Infante', 'Luis XIV', 'Viuda Negra']) {
      await expect(page.locator(`#vinos [data-wine="${name}"] .sug`)).toHaveText('Sugerencia');
    }
    await expect(page.locator('#vinos [data-wine="Gurgu, jove de trellat"] .sug')).toHaveCount(0);

    await expect(page.locator('#vinos .do-chip, #vinos .do-chips')).toHaveCount(0);
    await expect(page.locator('#vinos [data-do-select] option')).toHaveText([
      'Todas las D.O.',
      'DOCa Rioja',
      'DO Cava',
      'DO Rueda',
      'DO Ribera del Duero',
      'DO Rías Baixas',
      'DO Toro',
      'DOC Priorat',
      'DO Bierzo',
      'DO Jumilla',
      'DO Utiel-Requena',
      'DO Valencia',
      'DO Alicante',
      'DO Valdeorras',
      'DO Ribeira Sacra',
      'DO Montsant',
      'Champagne',
      'VT Castilla y León',
      'Pago Chozas Carrascal',
      'Vino de Pago El Terrerazo',
      'DO Lanzarote',
      'Vino de España',
      'Amarone della Valpolicella',
    ]);

    await page.locator('#vinos [data-do-select]').selectOption('DO Alicante');
    await expect(page.locator('#vinos [data-wine="Gurgu, jove de trellat"]')).toBeVisible();
    await expect(page.locator('#vinos [data-wine="Luis XIV"]')).toBeVisible();
    await expect(page.locator('#vinos [data-wine="Lynus Infante"]')).toBeHidden();
    await expect(page.locator('#vinos [data-wine="Viuda Negra"]')).toBeHidden();
    await expect(page.locator('#vinos [data-wine-group]').filter({ has: page.getByRole('heading', { name: 'Vinos con crianza', exact: true }) })).toBeHidden();

    await page.locator('#vinos [data-do-select]').selectOption('DOCa Rioja');
    await expect(page.locator('#vinos [data-wine="Viuda Negra"]')).toBeVisible();
    await expect(page.locator('#vinos [data-wine="Luis XIV"]')).toBeHidden();
    await expect(page.locator('#vinos [data-do-select]')).toHaveValue('DOCa Rioja');
    await expect(page.locator('#vinos [data-wine-group]').filter({ has: page.getByRole('heading', { name: 'Vinos jóvenes', exact: true }) })).toBeHidden();
  });

  test('en móvil, «Todas las D.O.» muestra la carta al entrar y al volver de una D.O. corta', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const card = page.locator('#vinos .wines__card');
    const select = page.locator('#vinos [data-do-select]');
    const wines = page.locator('#vinos [data-wine]');

    await page.goto('/#vinos');
    await expect(select).toHaveValue('');
    await expect(card).toHaveCSS('opacity', '1', { timeout: 500 });
    await expect(card).not.toHaveClass(/\breveal\b/);
    const total = await wines.count();
    expect(total).toBeGreaterThan(40);
    await expect(page.locator('#vinos [data-wine][hidden]')).toHaveCount(0);
    await expect(wines.first()).toBeInViewport();

    await page.goto('/');
    await page.locator('#vinos .wines__card').evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await expect(select).toHaveValue('');
    await expect(card).toHaveCSS('opacity', '1', { timeout: 500 });
    await expect(wines.first()).toBeInViewport();

    await select.selectOption('DO Jumilla');
    await expect(page.locator('#vinos [data-wine="Clio"]')).toBeVisible();
    await expect(page.locator('#vinos [data-wine][hidden]')).toHaveCount(total - 1);
    await select.selectOption('');
    await expect(select).toHaveValue('');
    await expect(page.locator('#vinos [data-wine][hidden]')).toHaveCount(0);
    await expect(wines).toHaveCount(total);
    await card.evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await expect(card).toHaveCSS('opacity', '1');
    await expect(wines.first()).toBeInViewport();
    await expect(page.locator('#vinos [data-wine="Clio"]')).not.toHaveAttribute('hidden', '');
  });

  test('la galería está en la navegación principal', async ({ page }) => {
    await page.goto('/');
    const link = page.locator('#menu-principal a[href="#galeria"]');
    await expect(link).toHaveText('Galería');
    await link.click();
    await expect(page.locator('#galeria')).toBeInViewport();
    await expect(page.locator('#galeria img[alt="Cazuela de mejillones"]')).toHaveCount(1);
  });

  test('?lang=en muestra las etiquetas en inglés', async ({ page }) => {
    await page.goto('/?lang=en#carta');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('#menu-principal a[href="#carta"]')).toHaveText('Menu');
    await expect(page.locator('#menu-principal a[href="#vinos"]')).toHaveText('Wines');
    await expect(page.locator('#menu-principal a[href="#galeria"]')).toHaveText('Gallery');
    await expect(page.locator('#menu-principal a[href="#reservar"]')).toHaveText('Book');
    await expect(page.locator('#tab-frios')).toHaveText('Cold');
    await expect(page.locator('#tab-calientes')).toHaveText('Hot');
    await expect(page.locator('#tab-principal')).toHaveText('Mains');
    await expect(page.locator('#tab-postres')).toHaveText('Dessert');
    await expect(page.locator('#carta')).toContainText('Ostras');
    await expect(page.locator('#carta [data-suggested]')).toHaveCount(0);
    await expect(page.locator('#carta')).not.toContainText('We suggest');
    await expect(page.locator('#panel-frios .carta__item', { hasText: 'Tartar de Atún Rojo sobre Wakame' }).locator('.sug')).toHaveText('Suggested');
    await expect(page.locator('#vinos [data-suggested]')).toHaveCount(0);
    await expect(page.locator('#vinos')).not.toContainText('We suggest');
    await expect(page.locator('#vinos [data-wine="Lynus Infante"] .sug')).toHaveText('Suggested');
    await expect(page.locator('#vinos label[for="do-select"]')).toHaveText('Filter by appellation');
  });
});

test('el panel cambia de idioma (ES y 中文); el inglés del admin cae a español', async ({ page }) => {
  await page.goto('/admin/login');
  const bare = page.locator('.adm__langs--bare');
  await expect(bare.getByRole('link')).toHaveText(['ES', '中文']);
  await expect(bare.getByRole('link', { name: 'EN', exact: true })).toHaveCount(0);

  await page.context().addCookies([{ name: 'lx_admin_lang', value: 'en', domain: 'localhost', path: '/' }]);
  await page.goto('/admin/login');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Entrar al panel');
  await expect(bare.locator('a[aria-current="true"]')).toHaveText('ES');

  await page.goto('/admin/login?admin_lang=en');
  await expect(page).toHaveURL(/\/admin\/login\/?$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Entrar al panel');

  await login(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Reservas');
  const langs = page.locator('.adm__langs');
  await expect(langs.getByRole('link')).toHaveText(['ES', '中文']);
  await expect(langs.getByRole('link', { name: 'EN', exact: true })).toHaveCount(0);

  await page.goto('/admin/reservas?admin_lang=en');
  await expect(page).toHaveURL(/\/admin\/reservas\/?$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Reservas');
  await expect(langs.locator('a[aria-current="true"]')).toHaveText('ES');

  await langs.getByRole('link', { name: '中文', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('预订');
  await expect(page.locator('.adm__nav').getByRole('link', { name: '菜单', exact: true })).toBeVisible();

  await langs.getByRole('link', { name: 'ES', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Reservas');
  await expect(page.locator('.adm__nav').getByRole('link', { name: 'Carta', exact: true })).toBeVisible();
});
