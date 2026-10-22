/**
 * Prefijo público con barra final.
 * Con `base: '/web-la-ximenera'`, Astro 7 deja `import.meta.env.BASE_URL` sin barra final.
 * Unir a pelo (`${BASE_URL}logo.svg`) produce `/web-la-ximeneralogo.svg`.
 */
export const publicBase = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

/** Ruta de un archivo de `public/` bajo el base del sitio. */
export function publicUrl(path: string): string {
  return `${publicBase}${path.replace(/^\//, '')}`;
}
