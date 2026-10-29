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

  test('vinos: «Te sugerimos» y filtro por D.O.', async ({ page }) => {
    await page.goto('/#vinos');
    const suggested = page.locator('#vinos [data-suggested]');
    await expect(suggested).toContainText('Te sugerimos');
    await expect(suggested).toContainText('Lynus Infante');
    await expect(suggested).toContainText('Luis XIV');
    await expect(suggested).toContainText('Viuda Negra');

    await page.locator('#vinos [data-do-select]').selectOption('DO Alicante');
    await expect(page.locator('#vinos [data-wine="Gurgu, jove de trellat"]')).toBeVisible();
    await expect(page.locator('#vinos [data-wine="Luis XIV"]')).toBeVisible();
    await expect(page.locator('#vinos [data-wine="Lynus Infante"]')).toBeHidden();
    await expect(page.locator('#vinos [data-wine="Viuda Negra"]')).toBeHidden();

    await page.locator('#vinos button[data-do="DOCa Rioja"]').click();
    await expect(page.locator('#vinos [data-wine="Viuda Negra"]')).toBeVisible();
    await expect(page.locator('#vinos [data-wine="Luis XIV"]')).toBeHidden();
    await expect(page.locator('#vinos [data-do-select]')).toHaveValue('DOCa Rioja');
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
    await expect(page.locator('#vinos [data-suggested]')).toContainText('We suggest');
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
