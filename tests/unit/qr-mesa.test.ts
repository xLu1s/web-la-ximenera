import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { QR_CAPTION, QR_TARGET, qrPdf, qrPng } from '../../scripts/qr-mesa';

describe('QR de mesa (archivo imprimible, fuera de la web)', () => {
  it('apunta a la carta pública y no a la home', () => {
    expect(QR_TARGET).toBe('https://la-ximenera.vercel.app/carta');
    expect(new URL(QR_TARGET).pathname).toBe('/carta');
    expect(QR_CAPTION).toBe('Escanea para ver la carta');
  });

  it('el PNG y el PDF del repo son los que genera el script', async () => {
    const png = await qrPng();
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(Buffer.compare(png, readFileSync(new URL('../../assets-print/qr-carta.png', import.meta.url)))).toBe(0);

    const pdf = qrPdf();
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    const text = pdf.toString('latin1');
    expect(text).toContain(QR_CAPTION);
    expect(text).toContain(QR_TARGET);
    expect(Buffer.compare(pdf, readFileSync(new URL('../../assets-print/qr-carta.pdf', import.meta.url)))).toBe(0);
  });
});
