import { describe, expect, it } from 'vitest';
import { bookingErrorMessage, clientIp, isSpam, parseBookingInput } from '../../src/lib/booking';

const base = { date: '2032-01-06', time: '13:30', party: '2', name: 'Ana Pérez', phone: '600 123 123', email: 'ana@example.com', consent: 'on' };
const now = new Date('2026-10-23T10:00:00Z');
const p = (o: Record<string, unknown>) => parseBookingInput({ ...base, ...o }, { now });

describe('validación del formulario de reserva', () => {
  it('acepta una reserva válida', () => {
    const r = p({});
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toMatchObject({ party: 2, email: 'ana@example.com', consent: true });
  });
  it('personas: 1 y 12 ok; 13, 0, negativo y decimal rechazados', () => {
    expect(p({ party: '1' }).ok).toBe(true);
    expect(p({ party: 12 }).ok).toBe(true);
    expect(p({ party: '13' })).toMatchObject({ ok: false, error: 'party_too_large' });
    expect(p({ party: '0' })).toMatchObject({ ok: false, error: 'party_too_small' });
    expect(p({ party: '-3' })).toMatchObject({ ok: false, error: 'party_too_small' });
    expect(p({ party: '2.5' })).toMatchObject({ ok: false, error: 'party_too_small' });
    expect(p({ party: '' })).toMatchObject({ ok: false, error: 'party_too_small' });
  });
  it('email y teléfono no válidos', () => {
    for (const email of ['ana', 'ana@', 'ana@example', 'a b@example.com', '@example.com', 'ana@example.c']) expect(p({ email })).toMatchObject({ ok: false, error: 'invalid_email' });
    for (const phone of ['123', 'abcdefghi', '600-12', '+34 6001 2']) expect(p({ phone })).toMatchObject({ ok: false, error: 'invalid_phone' });
    expect(p({ phone: '+34 681 14 37 95' }).ok).toBe(true);
  });
  it('consentimiento obligatorio', () => {
    expect(p({ consent: undefined })).toMatchObject({ ok: false, error: 'consent_required' });
    expect(p({ consent: 'off' })).toMatchObject({ ok: false, error: 'consent_required' });
  });
  it('fecha/hora pasadas o no válidas', () => {
    expect(p({ date: '2026-10-22' })).toMatchObject({ ok: false, error: 'past' });
    expect(p({ date: '2026-10-23', time: '11:59' })).toMatchObject({ ok: false, error: 'past' }); // 12:00 CEST ahora
    expect(p({ date: '2026-10-23', time: '13:30' }).ok).toBe(true);
    expect(p({ date: '2026-02-30' })).toMatchObject({ ok: false, error: 'invalid_datetime' });
    expect(p({ time: '25:00' })).toMatchObject({ ok: false, error: 'invalid_datetime' });
  });
  it('nombre y observaciones', () => {
    expect(p({ name: 'A' })).toMatchObject({ ok: false, error: 'invalid_name' });
    expect(p({ notes: 'x'.repeat(501) })).toMatchObject({ ok: false, error: 'notes_too_long' });
  });
  it('honeypot e IP', () => {
    expect(isSpam({ website: 'http://spam' })).toBe(true);
    expect(isSpam({ website: '' })).toBe(false);
    const req = new Request('http://x', { headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' } });
    expect(clientIp(req)).toBe('1.2.3.4');
    expect(clientIp(new Request('http://x', { headers: { 'x-real-ip': '5.6.7.8' } }))).toBe('5.6.7.8');
  });
  it('todos los códigos de error tienen mensaje en español', () => {
    for (const c of ['consent_required', 'party_too_small', 'party_too_large', 'invalid_name', 'invalid_phone', 'invalid_email', 'notes_too_long', 'invalid_datetime', 'past', 'closed_day', 'blocked', 'outside_hours', 'invalid_slot', 'full', 'rate_limited', 'not_configured', 'server_error']) {
      expect(bookingErrorMessage(c).length).toBeGreaterThan(10);
    }
    expect(bookingErrorMessage('full', { remaining: 3 })).toContain('quedan 3');
    expect(bookingErrorMessage('full')).toContain('completo');
    expect(bookingErrorMessage('party_too_large', { max: 12 })).toContain('12');
  });
});
