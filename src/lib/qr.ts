import QRCode from 'qrcode';

/** Destino fijo del QR impreso (mesas y carta de papel). No depende del entorno local. */
export const QR_TARGET = 'https://la-ximenera.vercel.app';

export async function qrPng(): Promise<Buffer> {
  return QRCode.toBuffer(QR_TARGET, { type: 'png', width: 640, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#2B1D14', light: '#F7F1E6' } });
}
