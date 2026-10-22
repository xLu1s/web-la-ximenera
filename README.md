# web-la-ximenera

Sitio del restaurante **La Ximenera** (Alcoi / Alcoy): brasería mediterránea y cocina de producto. Es un sitio estático hecho con [Astro](https://astro.build) y pensado para publicarse en GitHub Pages.

**https://xlu1s.github.io/web-la-ximenera/**

En `astro.config.mjs`, `site` es `https://xlu1s.github.io` y `base` es `/web-la-ximenera`. Así el HTML, el CSS, las imágenes de `public/` y la ficha SEO (canónica, Open Graph y JSON-LD) se sirven bajo ese prefijo.

## Desarrollo

Hace falta Node.js >= 22.12 (Astro 7).

```bash
npm ci           # instalación reproducible
npm run dev      # desarrollo
npm run build    # genera dist/ estático
npm run preview  # sirve dist/ (respeta el base)
```

## Contenido

- Datos y fuentes: `src/data/site.ts` (lo no confirmado se muestra como `[marcador]` con `Tbc.astro`).
- Carta completa: `src/data/menu.ts` (transcripción literal del PDF, copia en `docs/carta-referencia.pdf`).
- Menú del día: `src/data/menuDelDia.ts` (cartel de Instagram 02/06/2026, copia en `docs/`).
- Reseñas del carrusel: `src/data/reviews.ts` (editar el array para cambiarlas).
- Galería: `src/data/gallery.ts` + fotos oficiales en `src/assets/instagram/` (se cargan solas);
  fotos de clientes provisionales en `src/assets/photos/`.
- Secciones: `src/components/`. SEO y JSON-LD: `src/layouts/Base.astro`.

## Publicación en GitHub Pages

El workflow `.github/workflows/deploy.yml` usa Node 22. Se lanza al hacer push a `main` y también a mano (`workflow_dispatch`). Instala con `npm ci`, ejecuta `npm run build` y publica `dist/` con GitHub Actions. El paso `actions/configure-pages` lleva `enablement: true` para intentar activar Pages si aún no lo está.

Antes del primer despliegue, en el repositorio:

1. **Settings → Pages → Build and deployment → Source = GitHub Actions**.
2. Fusionar en `main` (o ejecutar el workflow a mano desde la pestaña Actions).

Si el token de Actions no puede cambiar ese ajuste, hay que dejar **Source** en **GitHub Actions** a mano. Sin eso el sitio no se publica. La URL pública es `https://xlu1s.github.io/web-la-ximenera/`.
