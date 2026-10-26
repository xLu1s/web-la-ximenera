import { describe, expect, it } from 'vitest';
import { denominaciones, menu, vinos } from '../../src/data/cartaFisica';
import { t } from '../../src/i18n/public';
import { ta } from '../../src/i18n/admin';
import { QR_TARGET } from '../../src/lib/qr';

describe('carta física oct 2026', () => {
  it('tiene 47 platos y 71 vinos con D.O. del catálogo', () => {
    const dishes = menu.flatMap((s) => s.items);
    expect(dishes).toHaveLength(47);
    expect(menu.map((s) => s.id)).toEqual(['frios', 'calientes', 'principal', 'postres']);
    expect(vinos).toHaveLength(71);
    expect(denominaciones).toHaveLength(22);
    const names = new Set(denominaciones.map((d) => d.name));
    for (const w of vinos) {
      if (w.denominacion) expect(names.has(w.denominacion)).toBe(true);
      expect(['joven', 'crianza', 'galeria', 'blanco', 'cava', 'especial']).toContain(w.section);
    }
    expect(vinos.filter((w) => w.recommended).map((w) => w.name).sort()).toEqual(['Luis XIV', 'Lynus Infante', 'Viuda Negra']);
    expect(dishes.some((d) => d.name === 'Nuestras Patatas Bravas')).toBe(true);
  });

  it('traduce la web y el panel sin cambiar el español por defecto', () => {
    expect(t('es', 'nav.reservar')).toBe('Reservar');
    expect(t('en', 'nav.galeria')).toBe('Gallery');
    expect(t('en', 'sec.frios')).toBe('Cold');
    expect(ta('es', 'wine.origin')).toBe('D.O. / origen');
    expect(ta('es', 'wine.add')).toBe('Añadir vino');
    expect(ta('zh', 'nav.carta')).toBe('菜单');
    expect(QR_TARGET).toBe('https://la-ximenera.vercel.app');
  });
});