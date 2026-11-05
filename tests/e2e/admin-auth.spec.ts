import { test, expect } from '@playwright/test';
import { login } from './helpers';
import { T } from '../helpers/env';

test.describe('Panel /admin: acceso', () => {
  for (const path of ['/admin', '/admin/reservas', '/admin/carta', '/admin/vinos', '/admin/menus', '/admin/menus/nuevo', '/admin/galeria', '/admin/ajustes']) {
    test(`sin sesión ${path} redirige al login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login/);
      await expect(page.getByRole('heading', { name: 'Entrar al panel' })).toBeVisible();
    });
  }
  test('API del panel sin sesión → 401', async ({ request }) => {
    const r = await request.post('/api/admin/upload-url', { data: { purpose: 'gallery', type: 'image/png', size: 10 } });
    expect(r.status()).toBe(401);
  });
  test('contraseña incorrecta', async ({ page }) => {
    await login(page, T.admin.email, 'mala-clave');
    await expect(page.getByRole('alert')).toHaveText('Email o contraseña incorrectos.');
  });
  test('usuario autenticado que no es admin → «No tienes permiso» (403)', async ({ page, request }) => {
    await login(page, T.user.email, T.user.password);
    await expect(page.getByRole('heading', { name: 'No tienes permiso' })).toBeVisible();
    const r = await page.request.get('/admin/carta');
    expect(r.status()).toBe(403);
    const api = await page.request.post('/api/admin/upload-url', { data: { purpose: 'gallery', type: 'image/png', size: 10 } });
    expect(api.status()).toBe(403);
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
    void request;
  });
  test('admin entra, navega por todas las secciones y cierra sesión', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/admin\/reservas/);
    for (const [name, h1] of [['Carta', 'Carta'], ['Vinos', 'Carta de vinos'], ['Menús especiales', 'Menús especiales'], ['Galería', 'Galería'], ['Horarios y ajustes', 'Horarios y ajustes'], ['Reservas', 'Reservas']]) {
      await page.locator('.adm__nav').getByRole('link', { name, exact: true }).click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(h1);
    }
    await page.getByRole('button', { name: /Cerrar sesión/ }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto('/admin/carta');
    await expect(page).toHaveURL(/\/admin\/login/);
  });
  test('recuperar contraseña por email (Supabase Auth local + Mailpit)', async ({ page, request }) => {
    await request.delete(`${T.mailpitUrl}/api/v1/messages`);
    await page.goto('/admin/recuperar');
    await page.getByLabel('Email').fill(T.admin.email);
    await page.getByRole('button', { name: 'Enviar enlace' }).click();
    await expect(page.getByRole('status')).toContainText('recibirás un enlace');
    let msgId = '';
    await expect.poll(async () => {
      const j = await (await request.get(`${T.mailpitUrl}/api/v1/search?query=${encodeURIComponent('to:' + T.admin.email)}`)).json();
      msgId = j.messages?.[0]?.ID ?? '';
      return msgId;
    }, { timeout: 15_000 }).not.toBe('');
    const msg = await (await request.get(`${T.mailpitUrl}/api/v1/message/${msgId}`)).json();
    const link = String(msg.HTML || msg.Text).match(/href="([^"]+)"/)?.[1]?.replace(/&amp;/g, '&') ?? String(msg.Text).match(/https?:\/\/\S+/)![0];
    await page.goto(link);
    await expect(page).toHaveURL(/\/admin\/nueva-clave/);
    const newPass = 'Nueva-Clave-2026!';
    const { svc } = await import('../helpers/db');
    try {
      await page.getByLabel(/Contraseña nueva/).fill(newPass);
      await page.getByLabel('Repite la contraseña').fill(newPass);
      await page.getByRole('button', { name: 'Guardar contraseña' }).click();
      await expect(page.getByRole('status')).toHaveText('Contraseña actualizada.');
      await page.getByRole('button', { name: /Cerrar sesión/ }).click();
      await login(page, T.admin.email, newPass);
      await expect(page).toHaveURL(/\/admin\/reservas/);
    } finally {
      // restaurar la contraseña de pruebas
      const { data } = await svc().auth.admin.listUsers();
      const u = data.users.find((x) => x.email === T.admin.email)!;
      await svc().auth.admin.updateUserById(u.id, { password: T.admin.password });
    }
  });

  test('invitación por email: el enlace con token_hash permite elegir contraseña', async ({ page }) => {
    const { svc } = await import('../helpers/db');
    const email = `invitado-${Date.now()}@test.local`;
    const { data, error } = await svc().auth.admin.generateLink({ type: 'invite', email });
    expect(error).toBeNull();
    try {
      await page.goto(`/admin/nueva-clave?token_hash=${data.properties!.hashed_token}&type=invite`);
      await expect(page.getByText(`Cuenta: ${email}`)).toBeVisible();
      await page.getByLabel(/Contraseña nueva/).fill('Invitado-Clave-2026!');
      await page.getByLabel('Repite la contraseña').fill('Invitado-Clave-2026!');
      await page.getByRole('button', { name: 'Guardar contraseña' }).click();
      // No está en `admins`: la cuenta existe pero el panel le niega el acceso.
      await expect(page.getByText('No tienes permiso')).toBeVisible();
      await page.goto('/admin/nueva-clave?token_hash=manipulado&type=invite');
      await expect(page.getByRole('alert')).toContainText('no es válido');
    } finally {
      await svc().auth.admin.deleteUser(data.user!.id);
    }
  });

  test('invitación con la plantilla por defecto de Supabase (tokens en el #fragmento)', async ({ page }) => {
    const { svc } = await import('../helpers/db');
    const email = `invitado2-${Date.now()}@test.local`;
    const { data, error } = await svc().auth.admin.generateLink({
      type: 'invite', email, options: { redirectTo: `http://localhost:${T.appPort}/admin/nueva-clave` },
    });
    expect(error).toBeNull();
    try {
      await page.goto(data.properties!.action_link);
      await expect(page.getByText(`Cuenta: ${email}`)).toBeVisible();
      expect(page.url()).not.toContain('access_token');
      await page.getByLabel(/Contraseña nueva/).fill('Invitado-Clave-2026!');
      await page.getByLabel('Repite la contraseña').fill('Invitado-Clave-2026!');
      await page.getByRole('button', { name: 'Guardar contraseña' }).click();
      await expect(page.getByText('No tienes permiso')).toBeVisible();
      // Reutilizar el enlace no vale.
      await page.context().clearCookies();
      await page.goto(data.properties!.action_link);
      await expect(page.locator('[data-hash-error]')).toBeVisible();
    } finally {
      await svc().auth.admin.deleteUser(data.user!.id);
    }
  });
});
