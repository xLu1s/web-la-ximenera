/** Utilidades del panel: lectura de formularios y redirección con mensaje (PRG). */
export function redirectWith(path: string, msg: string, type: 'ok' | 'err' = 'ok'): Response {
  const u = new URL(path, 'http://x');
  u.searchParams.set(type, msg);
  return new Response(null, { status: 303, headers: { Location: u.pathname + u.search + u.hash } });
}

export const fstr = (fd: FormData, k: string) => { const v = fd.get(k); return typeof v === 'string' ? v.trim() : ''; };
export const fnull = (fd: FormData, k: string) => fstr(fd, k) || null;
export const fbool = (fd: FormData, k: string) => { const v = fstr(fd, k); return v === 'on' || v === 'true' || v === '1'; };
export function fint(fd: FormData, k: string, def = 0): number {
  const v = fstr(fd, k);
  if (!v) return def;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : def;
}
export function fid(fd: FormData, k = 'id'): number | null {
  const n = Number(fstr(fd, k));
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Traducción de errores de base de datos a mensajes comprensibles. */
export function dbErrorMessage(e: { message?: string; code?: string } | null | undefined): string {
  if (!e) return 'Error desconocido.';
  if (e.code === '42501' || /row-level security|permission denied/i.test(e.message ?? '')) return 'No tienes permiso para hacer este cambio.';
  if (e.code === '23505') return 'Ya existe un registro igual.';
  if (e.code === '23514') return 'Algún dato no es válido (revisa longitudes, precios y fechas).';
  return 'No se pudo guardar. Inténtalo de nuevo.';
}

/** Acción del formulario: si el botón pulsado trae name="action", prevalece sobre el campo oculto. */
export const faction = (fd: FormData) => String(fd.getAll('action').at(-1) ?? '');
