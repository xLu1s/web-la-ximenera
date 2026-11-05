import { expect, type APIRequestContext, type Page } from '@playwright/test';
import pg from 'pg';
import { T } from '../helpers/env';

export { futureDate, TUE, SAT, SUN, MON } from '../helpers/db';

let counter = 0;
/** IP ficticia única para no chocar con el límite de peticiones entre pruebas. */
export const uniqueIp = () => `10.${(Date.now() >> 16) & 255}.${(Date.now() >> 8) & 255}.${++counter % 250}`;

export async function sql<T = Record<string, unknown>>(q: string, params: unknown[] = []): Promise<T[]> {
  const c = new pg.Client({ connectionString: T.dbUrl });
  await c.connect();
  try { return (await c.query(q, params)).rows as T[]; } finally { await c.end(); }
}

export interface MockEmail { to: string[]; from: string; subject: string; html: string; text: string }
const mockUrl = `http://127.0.0.1:${T.resendMockPort}/__emails`;
export async function emailsTo(request: APIRequestContext, to: string): Promise<MockEmail[]> {
  const r = await request.get(mockUrl);
  return ((await r.json()) as MockEmail[]).filter((e) => e.to.includes(to));
}
export async function waitEmails(request: APIRequestContext, to: string, n: number) {
  await expect.poll(async () => (await emailsTo(request, to)).length, { timeout: 10_000 }).toBeGreaterThanOrEqual(n);
  return emailsTo(request, to);
}

export const validBooking = (o: Record<string, unknown> = {}) => ({
  date: '', time: '13:30', party: 2, name: 'Ana Pérez', phone: '600123123', email: 'ana@example.com', notes: '', consent: 'on', website: '', ...o,
});

export async function apiBook(request: APIRequestContext, body: Record<string, unknown>, ip = uniqueIp()) {
  const r = await request.post('/api/reservas', { data: body, headers: { 'x-forwarded-for': ip, origin: `http://localhost:${T.appPort}` } });
  return { status: r.status(), body: await r.json() };
}

export async function login(page: Page, email = T.admin.email, password = T.admin.password) {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

/** Marca la casilla de consentimiento y rellena el formulario público. */
export async function fillBookingForm(page: Page, o: { date: string; party?: number; time?: string; email: string; name?: string; phone?: string; consent?: boolean }) {
  const form = page.locator('[data-booking-form]');
  await form.locator('[name="date"]').fill(o.date);
  await form.locator('[name="date"]').dispatchEvent('change');
  if (o.party) await form.locator('[name="party"]').selectOption(String(o.party));
  const time = form.locator('[name="time"]');
  await expect(time).toBeEnabled();
  await expect(time.locator('option[value]:not([value=""])').first()).toBeAttached();
  if (o.time) await time.selectOption(o.time);
  await form.locator('[name="name"]').fill(o.name ?? 'Ana Pérez');
  await form.locator('[name="phone"]').fill(o.phone ?? '600 123 123');
  await form.locator('[name="email"]').fill(o.email);
  if (o.consent !== false) await form.getByRole('checkbox', { name: /política de privacidad/ }).check();
}
