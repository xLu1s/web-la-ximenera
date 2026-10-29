/**
 * QR imprimible de mesa. No forma parte de la web: no hay ruta /qr ni /qr.png.
 * El código abre la carta pública (https://la-ximenera.vercel.app/carta).
 * Regenerar: node scripts/generate-qr-mesa.mts
 */
import QRCode from 'qrcode';

export const QR_TARGET = 'https://la-ximenera.vercel.app/carta';
export const QR_CAPTION = 'Escanea para ver la carta';

const PNG_OPTIONS = {
  type: 'png' as const,
  width: 1200,
  margin: 4,
  errorCorrectionLevel: 'M' as const,
  color: { dark: '#000000', light: '#FFFFFF' },
};

export function qrPng(): Promise<Buffer> {
  return QRCode.toBuffer(QR_TARGET, PNG_OPTIONS);
}

/** Anchos de Helvetica (unidades de 1000) para centrar el texto del PDF. */
const HELVETICA: Record<string, number> = {
  ' ': 278, '.': 278, '/': 278, ':': 278, '-': 333,
  '0': 556, '1': 556, '2': 556, '3': 556, '4': 556, '5': 556, '6': 556, '7': 556, '8': 556, '9': 556,
  A: 667, B: 667, C: 722, D: 722, E: 611, F: 556, G: 778, H: 722, I: 278, J: 500, K: 667, L: 556, M: 833,
  N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 278, j: 222, k: 500, l: 222, m: 833,
  n: 556, o: 556, p: 556, q: 556, r: 333, s: 500, t: 278, u: 556, v: 500, w: 722, x: 500, y: 500, z: 500,
};

function textWidth(text: string, size: number): number {
  let units = 0;
  for (const ch of text) units += HELVETICA[ch] ?? 500;
  return (units / 1000) * size;
}

function pdfEscape(text: string): string {
  return text.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
}

function centeredText(text: string, size: number, y: number, pageW: number): string {
  const x = (pageW - textWidth(text, size)) / 2;
  return `BT /F1 ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${pdfEscape(text)}) Tj ET\n`;
}

/** Tarjeta A6 apaisada en vertical, lista para imprimir, con el QR en vector. */
export function qrPdf(): Buffer {
  const symbol = QRCode.create(QR_TARGET, { errorCorrectionLevel: 'M' });
  const n = symbol.modules.size;
  const pageW = 360;
  const pageH = 500;
  const quiet = 4;
  const box = 280;
  const cell = box / (n + quiet * 2);
  const originX = (pageW - box) / 2;
  const originY = 130;

  let ops = '0.969 0.945 0.902 rg\n';
  ops += `0 0 ${pageW} ${pageH} re f\n`;
  ops += '1 1 1 rg\n';
  ops += `${originX.toFixed(2)} ${originY.toFixed(2)} ${box.toFixed(2)} ${box.toFixed(2)} re f\n`;
  ops += '0 0 0 rg\n';
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (!symbol.modules.get(row, col)) continue;
      const x = originX + (quiet + col) * cell;
      const y = originY + (quiet + (n - 1 - row)) * cell;
      ops += `${x.toFixed(2)} ${y.toFixed(2)} ${cell.toFixed(2)} ${cell.toFixed(2)} re f\n`;
    }
  }
  ops += '0.169 0.114 0.078 rg\n';
  ops += centeredText('La Ximenera', 22, originY + box + 28, pageW);
  ops += centeredText(QR_CAPTION, 13, originY - 28, pageW);
  ops += centeredText(QR_TARGET, 8, originY - 48, pageW);

  return pdfDocument(ops);
}

function pdfDocument(stream: string): Buffer {
  const streamBuf = Buffer.from(stream, 'latin1');
  const objects = [
    Buffer.from('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'),
    Buffer.from('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n'),
    Buffer.from(
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 360 500] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    ),
    Buffer.concat([
      Buffer.from(`4 0 obj\n<< /Length ${streamBuf.length} >>\nstream\n`),
      streamBuf,
      Buffer.from('\nendstream\nendobj\n'),
    ]),
    Buffer.from('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'),
  ];
  const header = Buffer.from('%PDF-1.4\n');
  const parts: Buffer[] = [header];
  const offsets = [0];
  let cursor = header.length;
  for (const obj of objects) {
    offsets.push(cursor);
    parts.push(obj);
    cursor += obj.length;
  }
  let xref = `xref\n0 ${objects.length + 1}\n`;
  xref += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${cursor}\n%%EOF\n`;
  parts.push(Buffer.from(xref));
  return Buffer.concat(parts);
}
