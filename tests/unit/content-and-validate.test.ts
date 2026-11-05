import { describe, expect, it } from 'vitest';
import { formatEuro, isSpecialActive, specialStatus, WINES_PROVISIONAL_MESSAGE } from '../../src/lib/content';
import { parseEuro, slugify, validateDayHours, validateMenuItem, validateSpecialMenu, validateUpload, validateWine } from '../../src/lib/validate';
import { signCancelToken, verifyCancelToken } from '../../src/lib/token';

describe('menús especiales: visibilidad por fechas (Madrid)', () => {
  const m = (starts_on: string | null, ends_on: string | null, visible = true) => ({ starts_on, ends_on, visible });
  it('activo dentro del rango, incluidos los extremos', () => {
    expect(isSpecialActive(m('2026-12-20', '2026-12-31'), '2026-12-20')).toBe(true);
    expect(isSpecialActive(m('2026-12-20', '2026-12-31'), '2026-12-31')).toBe(true);
    expect(isSpecialActive(m('2026-12-20', '2026-12-31'), '2027-01-01')).toBe(false);
    expect(isSpecialActive(m('2026-12-20', '2026-12-31'), '2026-12-19')).toBe(false);
    expect(isSpecialActive(m(null, null), '2026-12-19')).toBe(true);
    expect(isSpecialActive(m(null, null, false), '2026-12-19')).toBe(false);
  });
  it('estado para el panel', () => {
    expect(specialStatus(m('2027-04-20', '2027-04-24'), '2027-04-01')).toBe('programado');
    expect(specialStatus(m('2027-04-20', '2027-04-24'), '2027-04-25')).toBe('caducado');
    expect(specialStatus(m('2027-04-20', '2027-04-24'), '2027-04-22')).toBe('activo');
    expect(specialStatus(m(null, null, false), '2027-04-22')).toBe('oculto');
  });
  it('valida rango y platos', () => {
    expect(validateSpecialMenu({ kind: 'especial', title: 'Navidad', starts_on: '2026-12-31', ends_on: '2026-12-01', courses: [] })).toMatchObject({ ok: false });
    const v = validateSpecialMenu({ kind: 'especial', title: ' Navidad ', courses: [{ title: 'Entrantes', items: ['Jamón', ' ', 'Gambas'] }, { title: '', items: [] }] });
    expect(v).toMatchObject({ ok: true, value: { title: 'Navidad', courses: [{ title: 'Entrantes', items: ['Jamón', 'Gambas'] }] } });
    expect(validateSpecialMenu({ kind: 'otro', title: 'x', courses: [] }).ok).toBe(false);
    expect(validateSpecialMenu({ kind: 'especial', title: '', courses: [] }).ok).toBe(false);
  });
});

describe('vinos', () => {
  it('mensaje provisional', () => expect(WINES_PROVISIONAL_MESSAGE).toBe('Nuestra carta de vinos estará disponible muy pronto'));
  it('precios', () => {
    expect(parseEuro('18,50')).toBe(18.5);
    expect(parseEuro('18.5 €')).toBe(18.5);
    expect(parseEuro('')).toBeNull();
    expect(parseEuro('caro')).toBeUndefined();
    expect(formatEuro(18.5)).toBe('18,50 €');
    expect(validateWine({ name: 'Tinto', wine_type: 'tinto', price_bottle: '-2' }).ok).toBe(false);
    expect(validateWine({ name: 'Tinto', wine_type: 'azul' }).ok).toBe(false);
    expect(validateWine({ name: '', wine_type: 'tinto' }).ok).toBe(false);
    expect(validateWine({ name: 'Tinto', wine_type: 'tinto', price_glass: '3,5' })).toMatchObject({ ok: true, value: { price_glass: 3.5, price_bottle: null } });
  });
});

describe('carta', () => {
  it('plato', () => {
    expect(validateMenuItem({ name: '' }).ok).toBe(false);
    expect(validateMenuItem({ name: 'x', allergens: ['veneno'] }).ok).toBe(false);
    expect(validateMenuItem({ name: 'Ostras', price: '4,20 €/u', allergens: ['moluscos', 'moluscos'] })).toMatchObject({ ok: true, value: { allergens: ['moluscos'] } });
    expect(slugify('Pan y sugerencias')).toBe('pan-y-sugerencias');
    expect(slugify('Fríos')).toBe('frios');
  });
});

describe('horario del panel', () => {
  it('00:00 como cierre = medianoche y validaciones', () => {
    expect(validateDayHours({ cena: { opens: '20:00', closes: '00:00' } })).toMatchObject({ ok: true, value: { cena: { closes: '24:00' } } });
    expect(validateDayHours({ comida: { opens: '16:00', closes: '13:00' } }).ok).toBe(false);
    expect(validateDayHours({ comida: { opens: '13:00', closes: '21:00' }, cena: { opens: '20:00', closes: '23:00' } }).ok).toBe(false);
    expect(validateDayHours({ comida: { opens: '1pm', closes: '16:00' } }).ok).toBe(false);
  });
});

describe('subidas a la galería', () => {
  it('tipos y tamaños', () => {
    expect(validateUpload({ type: 'image/jpeg', size: 1000 })).toMatchObject({ ok: true, value: { mediaType: 'image', ext: 'jpg' } });
    expect(validateUpload({ type: 'video/mp4', size: 20 * 1024 * 1024 })).toMatchObject({ ok: true, value: { mediaType: 'video' } });
    expect(validateUpload({ type: 'image/jpeg', size: 10 * 1024 * 1024 + 1 })).toMatchObject({ ok: false });
    expect(validateUpload({ type: 'video/mp4', size: 50 * 1024 * 1024 + 1 })).toMatchObject({ ok: false });
    expect(validateUpload({ type: 'image/gif', size: 100 })).toMatchObject({ ok: false });
    expect(validateUpload({ type: 'text/plain', size: 100 })).toMatchObject({ ok: false });
    expect(validateUpload({ type: 'image/svg+xml', size: 100 })).toMatchObject({ ok: false });
    expect(validateUpload({ type: 'image/png', size: 0 })).toMatchObject({ ok: false });
    expect(validateUpload({ type: 'video/mp4', size: 100 }, false)).toMatchObject({ ok: false });
  });
});

describe('enlace de cancelación firmado', () => {
  const secret = 'x'.repeat(32);
  const id = '3f2b8c1e-1d2a-4b7c-9e8f-0a1b2c3d4e5f';
  it('firma y verifica', () => {
    const t = signCancelToken(id, secret);
    expect(verifyCancelToken(t, secret)).toBe(id);
  });
  it('rechaza tokens manipulados, de otro secreto o mal formados', () => {
    const t = signCancelToken(id, secret);
    expect(verifyCancelToken(t, 'y'.repeat(32))).toBeNull();
    const other = signCancelToken('00000000-0000-4000-8000-000000000000', secret);
    expect(verifyCancelToken(`${t.split('.')[0]}.${other.split('.')[1]}`, secret)).toBeNull();
    expect(verifyCancelToken(t.slice(0, -2), secret)).toBeNull();
    expect(verifyCancelToken('basura', secret)).toBeNull();
    expect(verifyCancelToken('', secret)).toBeNull();
    expect(verifyCancelToken(null, secret)).toBeNull();
    expect(() => signCancelToken(id, 'corto')).toThrow();
  });
});
