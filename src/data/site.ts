/**
 * Datos del negocio para la DEMO comercial.
 * Regla: solo datos con fuente pública. Lo no confirmado se marca con `tbc` (to be confirmed)
 * y se muestra en la web con un marcador visible.
 *
 * Fuentes (consultadas el 22/10/2026):
 *  [lead]  Hoja de leads de Luis (nombre, dirección, teléfono, Facebook, 4,7 Google)
 *  [TA]    TripAdvisor: https://www.tripadvisor.com/Restaurant_Review-g1064251-d21494488
 *          (ficha gestionada por el negocio: "Mediterranean restaurant specializing in market cuisine and grills")
 *  [PLA]   Planomato (20/08/2026): https://www.planomato.com/es/alcoy/n/la-ximenera-rooftop-cocina-mediterranea
 *  [NOV]   Novaluache: https://novaluacheagastrobar.es/restaurante/la-ximenera/
 *  [EMP]   Empresia / BORME: https://www.empresia.es/empresa/la-ximenera-loftop/
 */
export const site = {
  name: 'La Ximenera',
  phoneDisplay: '681 14 37 95', // [lead][TA][PLA] coincide en todas las fuentes
  phoneE164: '+34681143795',
  phoneIntl: '+34 681 14 37 95',
  // WhatsApp CONFIRMADO por Luis (22/10/2026): el mismo número atiende por WhatsApp.
  whatsapp: 'https://wa.me/34681143795',
  // Dirección CONFIRMADA por Luis (22/10/2026). [PLA] la sitúa en el ático del nº 2 ("La Ximenera - Rooftop");
  // [EMP] domicilio social C/ Regiment Biscaia 2. (La antigua Carrer Alcoleja 7 sigue en directorios sin actualizar.)
  address: { street: 'C/ Regiment Biscaia, 2, Ático', postalCode: '03802', city: 'Alcoy (Alcoi)', locality: 'Alcoy', region: 'Alicante' },
  geo: { lat: 38.697193, lng: -0.4809042 }, // Google Maps, ficha "La Ximenera - Rooftop"
  instagram: 'https://www.instagram.com/laximenera_restaurante/',
  facebook: 'https://facebook.com/110165927234275', // [lead]
  mapsLink: 'https://www.google.com/maps/place/La+Ximenera+-+Rooftop/@38.697193,-0.4809042,17z/data=!3m1!4b1!4m6!3m5!1s0xd618780a6e358c5:0xd8a97c902fb0407e',
  mapsEmbed: 'https://maps.google.com/maps?q=38.697193,-0.4809042&z=17&hl=es&output=embed',
  cuisine: 'Brasería mediterránea y cocina de producto', // bio Instagram oficial
};

/** [PLA] Horario publicado en ago. 2026. CONFIRMADO por Luis (22/10/2026). */
export const hours = [
  { day: 'Lunes', value: 'Cerrado' },
  { day: 'Martes', value: '13:30–16:00 · 20:30–23:00' },
  { day: 'Miércoles', value: '13:30–16:00 · 20:30–23:00' },
  { day: 'Jueves', value: '13:30–16:00 · 20:30–23:00' },
  { day: 'Viernes', value: '13:30–16:00 · 20:30–23:00' },
  { day: 'Sábado', value: '12:30–16:30 · 20:00–00:00' },
  { day: 'Domingo', value: '13:00–16:00' },
];

/**
 * FOTOS: imágenes públicas de terceros (subidas por clientes a TripAdvisor/Google y replicadas en Sluurpy).
 * Descargadas el 22/10/2026 SOLO para la demo. Antes de publicar: pedir fotos propias o permiso al negocio.
 *  pulpo-brasa.jpg  https://foto1.sluurpy.com/locali/es/7958518/67855206.jpg
 *  tataki-atun.jpg  https://media-cdn.tripadvisor.com/media/photo-o/1c/5b/e2/77/la-ximenera.jpg
 *  almejas.jpg      https://foto1.sluurpy.com/locali/es/7958518/52865337.jpg
 *  tartar.jpg       https://foto1.sluurpy.com/locali/es/7958518/67855200.jpg
 *  postre.jpg       https://foto1.sluurpy.com/locali/es/7958518/52865327.jpg
 * Fotos de sala eliminadas (podían ser del local anterior). Fotos oficiales: ver gallery.ts.
 */
export const photoCredit = 'Fotos públicas de clientes (TripAdvisor / Sluurpy), uso provisional pendiente de permiso';


/** Valoraciones agregadas con fuente (no citas inventadas). */
export const ratings = [
  { platform: 'Google', score: '4,6', detail: '576 reseñas (Google Maps, 22/10/2026)' },
  { platform: 'TripAdvisor', score: '4,3', detail: '65 opiniones (oct. 2026)' },
  { platform: 'Restaurant Guru', score: '4,8', detail: '+600 reseñas, según Planomato' },
];
