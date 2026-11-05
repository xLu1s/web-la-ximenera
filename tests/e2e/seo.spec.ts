import { test, expect } from '@playwright/test';

test.describe('SEO técnico de la web pública', () => {
  test('la home en español se canoniza sin ?lang y no pide Google Fonts', async ({ page }) => {
    await page.goto('/');
    const origin = new URL(page.url()).origin;
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${origin}/`);
    await expect(page.locator('link[hreflang="es"]')).toHaveAttribute('href', `${origin}/`);
    await expect(page.locator('link[hreflang="x-default"]')).toHaveAttribute('href', `${origin}/`);
    await expect(page.locator('link[hreflang="en"]')).toHaveAttribute('href', `${origin}/?lang=en`);
    await expect(page.locator('link[href*="fonts.googleapis.com"]')).toHaveCount(0);
    await expect(page.locator('script[type="application/ld+json"]')).toContainText('"@type":"Restaurant"');
    await expect(page.locator('#vinos .wines__origin').first()).toHaveCSS('color', 'rgb(122, 94, 40)');
  });

  test('la versión en inglés se canoniza a ?lang=en', async ({ page }) => {
    await page.goto('/?lang=en');
    const origin = new URL(page.url()).origin;
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${origin}/?lang=en`);
    await expect(page.locator('link[hreflang="es"]')).toHaveAttribute('href', `${origin}/`);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('href', `${origin}/?lang=en`);
  });

  test('robots.txt y sitemap.xml listan la web pública y excluyen el panel', async ({ page }) => {
    const robots = await page.goto('/robots.txt');
    expect(robots?.status()).toBe(200);
    const robotsText = await robots!.text();
    expect(robotsText).toContain('Disallow: /admin');
    expect(robotsText).toContain('Disallow: /api/');
    expect(robotsText).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/);

    const sitemap = await page.goto('/sitemap.xml');
    expect(sitemap?.status()).toBe(200);
    const xml = await sitemap!.text();
    expect(xml).toContain('/aviso-legal');
    expect(xml).toContain('/privacidad');
    expect(xml).toContain('/cookies');
    expect(xml).toContain('hreflang="en"');
    expect(xml).not.toContain('/admin');
    expect(xml).not.toContain('/carta');
  });
});
