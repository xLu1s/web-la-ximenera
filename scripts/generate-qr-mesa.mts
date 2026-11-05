import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { qrPdf, qrPng } from './qr-mesa.ts';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets-print');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'qr-carta.png'), await qrPng());
writeFileSync(join(dir, 'qr-carta.pdf'), qrPdf());
console.log('assets-print/qr-carta.png');
console.log('assets-print/qr-carta.pdf');
