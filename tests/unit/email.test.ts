import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startResendMock } from '../mocks/resend-mock.mjs';
import { customerConfirmation, ownerNotification, sendEmail } from '../../src/lib/email';

let mock: { server: import('node:http').Server; emails: Record<string, unknown>[] };
const summary = { reference: 'LX-ABC234', day: '2032-01-06', time: '13:30', service: 'comida', party_size: 4, name: 'Ana <b>Pérez</b>', email: 'ana@example.com', phone: '600123123', notes: 'Sin gluten' };

beforeAll(async () => { mock = await startResendMock(4598); });
afterAll(() => mock.server.close());
beforeEach(() => {
  mock.emails.length = 0;
  process.env.RESEND_API_KEY = 're_test_unit';
  process.env.RESEND_BASE_URL = 'http://127.0.0.1:4598';
  process.env.EMAIL_FROM = 'La Ximenera <onboarding@resend.dev>';
  process.env.OWNER_NOTIFY_EMAIL = 'owner@test.local';
});

describe('emails (Resend simulado)', () => {
  it('confirmación al cliente con referencia y enlace de cancelación; HTML escapado', async () => {
    const r = await sendEmail(customerConfirmation(summary, 'https://x/reserva/cancelar?t=abc'));
    expect(r.sent).toBe(true);
    expect(mock.emails).toHaveLength(1);
    const e = mock.emails[0] as { to: string[]; from: string; subject: string; html: string; text: string };
    expect(e.to).toEqual(['ana@example.com']);
    expect(e.from).toBe('La Ximenera <onboarding@resend.dev>');
    expect(e.subject).toContain('LX-ABC234');
    expect(e.html).toContain('https://x/reserva/cancelar?t=abc');
    expect(e.html).toContain('martes, 6 de enero de 2032');
    expect(e.html).not.toContain('<b>Pérez</b>');
    expect(e.text).toContain('4 personas');
  });
  it('aviso al propietario (OWNER_NOTIFY_EMAIL) con teléfono y observaciones', async () => {
    await sendEmail(ownerNotification(summary, 'https://x/admin'));
    const e = mock.emails[0] as { to: string[]; text: string };
    expect(e.to).toEqual(['owner@test.local']);
    expect(e.text).toContain('600123123');
    expect(e.text).toContain('Sin gluten');
  });
  it('sin RESEND_API_KEY no se envía nada (y no falla)', async () => {
    process.env.RESEND_API_KEY = '';
    const r = await sendEmail(customerConfirmation(summary, 'u'));
    expect(r).toMatchObject({ sent: false, error: 'not_configured' });
    expect(mock.emails).toHaveLength(0);
  });
  it('error de Resend: se informa sin lanzar', async () => {
    process.env.RESEND_API_KEY = 're_live_wrong'; // el mock solo acepta re_test_*
    const r = await sendEmail(customerConfirmation(summary, 'u'));
    expect(r.sent).toBe(false);
  });
});
