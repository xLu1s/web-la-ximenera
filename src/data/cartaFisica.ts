/**
 * Carta física de La Ximenera (oct 2026).
 * Fuente: fotos de la carta y transcripción SEED-CARTA-VINOS.
 * Nombres, precios y alérgenos tal cual. No añadir platos.
 *
 * Crustáceos: la carta impresa solo distingue pescado / moluscos / lácteos.
 * Donde el plato lleva gambas, se marca también `crustaceos` (el modelo ya lo admite).
 * Carpaccio: icono de pescado en carta; se añade lácteos por la burrata.
 */
export type Allergen = 'lacteos' | 'pescado' | 'moluscos' | 'crustaceos';

export interface MenuItem {
  key: string;
  name: string;
  price?: string;
  half?: string;
  allergens?: Allergen[];
  recommended?: boolean;
  recommendationNote?: string;
}

export interface MenuSection {
  id: string;
  tab: string;
  title: string;
  subtitle?: string;
  intro?: string;
  items: MenuItem[];
  notes?: string[];
}

export const allergenLabels: Record<Allergen, string> = {
  lacteos: 'Lácteos',
  pescado: 'Pescado',
  moluscos: 'Moluscos',
  crustaceos: 'Crustáceos y mariscos',
};

const eur = (n: string) => `${n} €`;
const unit = (n: string) => `${n} €/u`;
const per100 = (n: string) => `${n} €/100g`;

export const menu: MenuSection[] = [
  {
    id: 'frios',
    tab: 'Fríos',
    title: 'Fríos',
    subtitle: 'Para compartir',
    items: [
      { key: 'f-quesos', name: 'Degustación de quesos Europeos con frutas frescas y secas', half: eur('10,80'), price: eur('18,80') },
      { key: 'f-embutidos', name: 'Tablas de Embutidos de Alcoyanos', price: eur('14,80') },
      { key: 'f-jamon', name: 'Jamón Ibérico 100% Bellota', price: eur('22,00') },
      { key: 'f-escalibada', name: 'Escalibada brasa con anchoas Norte y Aceite Negro', price: unit('4,90'), allergens: ['pescado'] },
      { key: 'f-raf', name: 'Tomate Raf con capellán y virutas de mojama', price: eur('14,50'), allergens: ['pescado'] },
      { key: 'f-carpaccio', name: 'Carpaccio de tomate rosa con Burrata al Pedro y rúcula', price: eur('15,50'), allergens: ['pescado', 'lacteos'] },
      { key: 'f-cabra', name: 'Ensalada de queso Cabra Caramelizada', price: eur('13,90'), allergens: ['lacteos'] },
      { key: 'f-pericana', name: 'Pericana Alcoyana', half: eur('9,80'), price: eur('15,90'), allergens: ['pescado'] },
      { key: 'f-anchoas', name: 'Anchoas del norte sobre una crema de pesto y tomate confitado', price: eur('4,50'), allergens: ['pescado'] },
      { key: 'f-ceviche', name: 'Ceviche de corvina salvaje y gambas rojas', price: eur('17,50'), allergens: ['pescado', 'crustaceos'] },
      { key: 'f-ostras', name: 'Ostras', price: unit('4,80'), allergens: ['moluscos'] },
      { key: 'f-tartar-atun', name: 'Tartar de Atún Rojo sobre Wakame', price: eur('18,00'), allergens: ['pescado'], recommended: true },
      { key: 'f-tartar-salmon', name: 'Tartar de Salmón con Aguacate', price: eur('16,00'), allergens: ['pescado'] },
      { key: 'f-tartar-solomillo', name: 'Tartar de Solomillo de Vaca acompañado Brioche', price: eur('22,00') },
      { key: 'f-marisco', name: 'Marisco del día', price: 'S/M', allergens: ['moluscos'] },
    ],
  },
  {
    id: 'calientes',
    tab: 'Calientes',
    title: 'Calientes',
    subtitle: 'Para compartir',
    items: [
      { key: 'c-bravas', name: 'Nuestras Patatas Bravas', price: eur('9,50') },
      { key: 'c-tacos', name: 'Tacos de Buey marinados y a la brasa', price: eur('17,50') },
      { key: 'c-salteado', name: 'Salteado de Gambas y longaniza Alcoyana con verduras de temporada', price: eur('17,50'), allergens: ['moluscos', 'crustaceos'] },
      { key: 'c-revuelto', name: 'Revuelto de Pericana Alcoyana', price: eur('13,90'), allergens: ['pescado'] },
      { key: 'c-bolets', name: 'Bolets de Xop con huevo frito', price: eur('16,50') },
      { key: 'c-ajillo', name: 'Gambas al Ajillo', price: eur('17,50'), allergens: ['moluscos', 'crustaceos'] },
      { key: 'c-almejas', name: 'Almejas al vino Blanco', price: eur('16,50'), allergens: ['moluscos'] },
      { key: 'c-curry', name: 'Mejillones al Curry Thai', half: eur('8,50'), price: eur('13,50'), allergens: ['moluscos'], recommended: true },
      { key: 'c-vapor', name: 'Mejillones al Vapor', half: eur('7,50'), price: eur('11,00'), allergens: ['moluscos'] },
      { key: 'c-pulpo', name: 'Pulpo a la brasa sobre puré de patata y tomate', price: eur('19,50'), allergens: ['moluscos'] },
      { key: 'c-calamar', name: 'Calamar a la brasa o a la andaluza', price: eur('16,50'), allergens: ['moluscos'] },
      { key: 'c-vieira', name: 'Vieira a la brasa con crema de puerros', price: unit('6,50'), allergens: ['moluscos'] },
      { key: 'c-fritura', name: 'Fritura de pescadito de la playa', price: eur('16,50'), allergens: ['pescado'] },
      { key: 'c-tataki', name: 'Tataki de Atún rojo a la brasa con salsa Tsuyu Moto', price: eur('24,50'), allergens: ['pescado'] },
    ],
  },
  {
    id: 'principal',
    tab: 'Principal',
    title: 'Principal',
    items: [
      { key: 'p-solomillo', name: 'Solomillo de Vaca a la brasa', price: eur('24,50'), recommended: true },
      { key: 'p-entrecot', name: 'Entrecot de Ternera trinchado con Verduras', price: eur('22,00') },
      { key: 'p-presa', name: 'Presa Ibérica a la brasa', price: eur('19,50') },
      { key: 'p-chuleton-premium', name: 'Chuletón de Vaca Premium trinchado con Guarnición', price: per100('6,25') },
      { key: 'p-chuleton-rubia', name: 'Chuletón de vaca Rubia Gallega', price: per100('9,50') },
      { key: 'p-salmon', name: 'Salmón relleno de gambas a la brasa con aceite de cítricos', price: eur('17,50'), allergens: ['pescado', 'crustaceos'] },
      { key: 'p-rodaballo', name: 'Rodaballo a la donostiarra estilo tradicional', price: eur('19,80'), allergens: ['pescado'] },
      { key: 'p-bacalao-grat', name: 'Bacalao gratinado al perfume de ajo y tomate seco', price: eur('17,50'), allergens: ['pescado'] },
      { key: 'p-bacalao-ahum', name: 'Bacalao Ahumado con tomillo, romero y verduras brasa', price: eur('18,50'), allergens: ['pescado'] },
      { key: 'p-corvina', name: 'Corvina Salvaje a la brasa', price: eur('18,50'), allergens: ['pescado'] },
      { key: 'p-salsa', name: 'Salsa para Acompañar', price: eur('2,50') },
    ],
  },
  {
    id: 'postres',
    tab: 'Postre',
    title: 'Postre',
    items: [
      { key: 'd-nieve', name: 'La bola de nieve con frutos rojos', price: eur('6,50'), allergens: ['lacteos'] },
      { key: 'd-dama', name: 'La Dama blanca', price: eur('6,00'), allergens: ['lacteos'] },
      { key: 'd-milhojas', name: 'Milhojas de crema de manzana al horno y chocolate', price: eur('6,80'), allergens: ['lacteos'] },
      { key: 'd-pina', name: 'Piña a la brasa con helado de coco y flambéado con Ron', price: eur('7,50'), allergens: ['lacteos'] },
      { key: 'd-brownie', name: 'Brownie de chocolate con nueces y helado de Nata', price: eur('7,50'), allergens: ['lacteos'] },
      { key: 'd-sorbetes', name: 'Sinfonía de sorbetes', price: eur('6,00'), allergens: ['lacteos'] },
      { key: 'd-frutas', name: 'Frutas de temporada', price: 'S/M' },
    ],
  },
];

export interface Denominacion { slug: string; name: string }

/** Catálogo normalizado de denominaciones (orden de la carta). */
export const denominaciones: Denominacion[] = [
  { slug: 'do-alicante', name: 'DO Alicante' },
  { slug: 'do-valencia', name: 'DO Valencia' },
  { slug: 'do-utiel-requena', name: 'DO Utiel-Requena' },
  { slug: 'do-ribera-del-duero', name: 'DO Ribera del Duero' },
  { slug: 'doca-rioja', name: 'DOCa Rioja' },
  { slug: 'do-jumilla', name: 'DO Jumilla' },
  { slug: 'do-toro', name: 'DO Toro' },
  { slug: 'do-rueda', name: 'DO Rueda' },
  { slug: 'do-rias-baixas', name: 'DO Rías Baixas' },
  { slug: 'do-valdeorras', name: 'DO Valdeorras' },
  { slug: 'do-bierzo', name: 'DO Bierzo' },
  { slug: 'do-cava', name: 'DO Cava' },
  { slug: 'champagne', name: 'Champagne' },
  { slug: 'do-lanzarote', name: 'DO Lanzarote' },
  { slug: 'do-ribeira-sacra', name: 'DO Ribeira Sacra' },
  { slug: 'doc-priorat', name: 'DOC Priorat' },
  { slug: 'do-montsant', name: 'DO Montsant' },
  { slug: 'pago-chozas-carrascal', name: 'Pago Chozas Carrascal' },
  { slug: 'vino-de-espana', name: 'Vino de España' },
  { slug: 'vt-castilla-y-leon', name: 'VT Castilla y León' },
  { slug: 'amarone-della-valpolicella', name: 'Amarone della Valpolicella' },
  { slug: 'vino-de-pago-el-terrerazo', name: 'Vino de Pago El Terrerazo' },
];

export type WineType = 'tinto' | 'blanco' | 'rosado' | 'espumoso' | 'generoso' | 'dulce' | 'otro';
export type WineSection = 'joven' | 'crianza' | 'galeria' | 'blanco' | 'cava' | 'especial';

export interface CartaWine {
  key: string;
  name: string;
  type: WineType;
  section: WineSection;
  /** Nombre normalizado del catálogo, o null si la carta no indica D.O. */
  denominacion: string | null;
  origin?: string;
  description?: string;
  price: number;
  recommended?: boolean;
  note?: string;
}

const DO = Object.fromEntries(denominaciones.map((d) => [d.slug, d.name])) as Record<string, string>;

export const vinos: CartaWine[] = [
  // Jóvenes
  { key: 'w-gurgu', name: 'Gurgu, jove de trellat', type: 'tinto', section: 'joven', denominacion: DO['do-alicante'], origin: 'Gorga', description: 'Monastrell, tempranillo y otras. 6 meses de barrica', price: 16.5 },
  { key: 'w-pepe', name: 'Pepe Mendoza', type: 'tinto', section: 'joven', denominacion: DO['do-alicante'], origin: 'Llíber', description: 'Monastrell, Alicante Bouschet, Syrah. 2 meses en barrica de 500 l', price: 21 },
  { key: 'w-lynus', name: 'Lynus Infante', type: 'tinto', section: 'joven', denominacion: DO['do-ribera-del-duero'], origin: 'Quintanilla de Abajo', description: 'Tempranillo. Producción muy limitada, 4 meses de barrica', price: 17.5, recommended: true, note: 'El joven que te recomendamos descubrir' },
  { key: 'w-alcusses', name: 'Les Alcusses', type: 'tinto', section: 'joven', denominacion: DO['do-valencia'], description: 'Monastrell y otras. 8 meses de barrica', price: 18.5 },
  { key: 'w-bobal', name: 'Pasión de Bobal', type: 'tinto', section: 'joven', denominacion: DO['do-utiel-requena'], description: 'Bobal. 6 meses de barrica', price: 17.5 },
  { key: 'w-cambra', name: 'Rafa Cambra II', type: 'tinto', section: 'joven', denominacion: DO['do-valencia'], description: '30% Monastrell, 35% Cabernet Sauvignon, 35% Cabernet Franc. 8 meses de barrica', price: 19.5 },
  { key: 'w-luisxiv', name: 'Luis XIV', type: 'tinto', section: 'joven', denominacion: DO['do-alicante'], origin: 'Arcos i Roncare', description: 'Monastrell. 4 meses en ánforas de barro', price: 17.5, recommended: true, note: 'La recomendación de la tierra' },
  { key: 'w-resalso', name: 'Finca Resalso', type: 'tinto', section: 'joven', denominacion: DO['do-ribera-del-duero'], description: 'Tempranillo. 4 meses de barrica', price: 19 },
  // Crianza
  { key: 'w-anma', name: 'Anma', type: 'tinto', section: 'crianza', denominacion: DO['do-utiel-requena'], origin: 'St. Antoni de Requena', description: 'Garnacha y syrah. 14 meses en foudres de 6000 l', price: 19.5 },
  { key: 'w-torremilanos', name: 'Los Cantos de Torremilanos', type: 'tinto', section: 'crianza', denominacion: DO['do-ribera-del-duero'], origin: 'Aranda de Duero', description: 'Tempranillo. 18 meses de barrica', price: 21 },
  { key: 'w-emilio', name: 'Emilio Moro', type: 'tinto', section: 'crianza', denominacion: DO['do-ribera-del-duero'], origin: 'Pesquera de Duero', description: 'Tempranillo. 12 meses de barrica', price: 34 },
  { key: 'w-convento', name: 'El Convento de San Francisco', type: 'tinto', section: 'crianza', denominacion: DO['do-ribera-del-duero'], description: 'Tempranillo. 12 meses de barrica', price: 32 },
  { key: 'w-matarromera', name: 'Matarromera', type: 'tinto', section: 'crianza', denominacion: DO['do-ribera-del-duero'], description: 'Tempranillo, crianza. 18 meses de barrica', price: 30 },
  { key: 'w-viuda', name: 'Viuda Negra', type: 'tinto', section: 'crianza', denominacion: DO['doca-rioja'], origin: 'Laguardia, Rioja Alavesa', description: 'Tempranillo, vino de pueblo. 12 meses de barrica. Javier San Pedro', price: 17.5, recommended: true, note: 'El crianza que te recomendamos descubrir' },
  { key: 'w-lindes', name: 'Lindes de Remelluri', type: 'tinto', section: 'crianza', denominacion: DO['doca-rioja'], description: 'Tempranillo. 14 meses de barrica', price: 29 },
  { key: 'w-ramon-crianza', name: 'Ramón Bilbao Edición Limitada', type: 'tinto', section: 'crianza', denominacion: DO['doca-rioja'], description: 'Tempranillo, crianza. 15 meses de barrica', price: 19.5 },
  { key: 'w-valdeiana', name: 'Valdeiana', type: 'tinto', section: 'crianza', denominacion: DO['doca-rioja'], description: 'Tempranillo y Mazuelo. 12 meses de barrica', price: 28 },
  { key: 'w-azpilicueta', name: 'Azpilicueta', type: 'tinto', section: 'crianza', denominacion: DO['doca-rioja'], description: 'Tempranillo. 12 meses de barrica', price: 19 },
  { key: 'w-capellanes', name: 'Pago de los Capellanes', type: 'tinto', section: 'crianza', denominacion: DO['do-ribera-del-duero'], description: 'Tempranillo, crianza. 12 meses de barrica', price: 39 },
  { key: 'w-prado', name: 'Prado Rey Valdelayegua', type: 'tinto', section: 'crianza', denominacion: DO['do-ribera-del-duero'], description: 'Tempranillo y un poco de Merlot, crianza. 12 meses de barrica', price: 23 },
  { key: 'w-ocho', name: 'Las ocho', type: 'tinto', section: 'crianza', denominacion: DO['pago-chozas-carrascal'], description: 'Tempranillo, Cabernet, Bobal y otras, crianza. 12 meses de barrica', price: 25 },
  // Galería
  { key: 'w-clio', name: 'Clio', type: 'tinto', section: 'galeria', denominacion: DO['do-jumilla'], description: 'Monastrell y Cabernet. Crianza 12 meses', price: 69 },
  { key: 'w-terrerazo', name: 'Finca Terrerazo', type: 'tinto', section: 'galeria', denominacion: DO['vino-de-pago-el-terrerazo'], description: 'Bobal. Crianza', price: 48 },
  { key: 'w-albeniz', name: 'Torre Albéniz', type: 'tinto', section: 'galeria', denominacion: DO['do-ribera-del-duero'], origin: 'Aranda de Duero', description: '95% Tempranillo, 5% variedades autóctonas. Reserva, 25 a 30 meses', price: 42 },
  { key: 'w-pintia', name: 'Pintia', type: 'tinto', section: 'galeria', denominacion: DO['do-toro'], origin: 'San Román de Hornija', description: 'Tempranillo y otras. Crianza', price: 88 },
  { key: 'w-icepa', name: 'I Cepa', type: 'tinto', section: 'galeria', denominacion: DO['do-ribera-del-duero'], description: 'Tempranillo. Crianza 12 meses', price: 55 },
  { key: 'w-cabernet-cc', name: 'Cabernet Franc de Chozas Carrascal', type: 'tinto', section: 'galeria', denominacion: DO['pago-chozas-carrascal'], description: 'Cabernet Franc. Crianza', price: 51 },
  { key: 'w-mina', name: 'Finca la Mina', type: 'tinto', section: 'galeria', denominacion: null, description: 'Tempranillo. Reserva', price: 39 },
  { key: 'w-veneno', name: 'El Veneno', type: 'tinto', section: 'galeria', denominacion: DO['do-alicante'], description: 'Monastrell. Crianza 12 meses', price: 39 },
  // Blancos
  { key: 'w-clos', name: "Clos de L'Om", type: 'blanco', section: 'blanco', denominacion: DO['do-valencia'], description: 'Malvasía 100%', price: 21 },
  { key: 'w-lastres', name: 'Las Tres', type: 'blanco', section: 'blanco', denominacion: DO['pago-chozas-carrascal'], description: 'Chardonnay, Sauvignon blanc y Macabeu', price: 27 },
  { key: 'w-anahi', name: 'Anahí', type: 'blanco', section: 'blanco', denominacion: DO['doca-rioja'], origin: 'Laguardia', description: 'Malvasía, Sauvignon blanc y Tempranillo blanc. Semidulce', price: 15.5 },
  { key: 'w-pregon', name: 'Pregón', type: 'blanco', section: 'blanco', denominacion: DO['do-rueda'], description: 'Verdejo 100%', price: 14 },
  { key: 'w-ramon-blanco', name: 'Ramón Bilbao', type: 'blanco', section: 'blanco', denominacion: DO['do-rueda'], description: 'Verdejo', price: 15.5 },
  { key: 'w-laval', name: 'La Val', type: 'blanco', section: 'blanco', denominacion: DO['do-rias-baixas'], description: 'Albariño', price: 16.5 },
  { key: 'w-pegullal', name: 'Pazo de Pegullal', type: 'blanco', section: 'blanco', denominacion: DO['do-rias-baixas'], description: 'Albariño. Crianza en lías', price: 21 },
  { key: 'w-godeval', name: 'Godeval', type: 'blanco', section: 'blanco', denominacion: DO['do-valdeorras'], description: 'Godello 100%', price: 19.5 },
  { key: 'w-viernes', name: 'Viernes', type: 'blanco', section: 'blanco', denominacion: DO['do-bierzo'], description: 'Godello 100%', price: 15.5 },
  // Cavas y espumosos
  { key: 'w-roxanne', name: 'Roxanne', type: 'espumoso', section: 'cava', denominacion: DO['do-cava'], origin: 'Requena', description: 'Chardonnay y Macabeu', price: 18 },
  { key: 'w-gramona', name: 'Gramona Imperial', type: 'espumoso', section: 'cava', denominacion: DO['do-cava'], description: '50% Xarel·lo, 30% Macabeu, 15% Chardonnay, 5% Parellada', price: 31 },
  { key: 'w-laieta', name: 'Laietà', type: 'espumoso', section: 'cava', denominacion: DO['do-cava'], description: 'Xarel·lo, Macabeu, Chardonnay y Pinot Noir', price: 38 },
  { key: 'w-mirgin', name: 'Mirgin', type: 'espumoso', section: 'cava', denominacion: DO['do-cava'], description: 'Xarel·lo, Macabeu y Parellada', price: 22 },
  { key: 'w-moet', name: 'Moët & Chandon', type: 'espumoso', section: 'cava', denominacion: DO.champagne, description: 'Pinot Noir, Pinot Meunier y Chardonnay', price: 79 },
  { key: 'w-bollinger', name: 'Bollinger Rosé', type: 'espumoso', section: 'cava', denominacion: DO.champagne, description: 'Pinot Noir, Chardonnay y Pinot Meunier', price: 125 },
  { key: 'w-moet-rose', name: 'Moët & Chandon Rosé', type: 'espumoso', section: 'cava', denominacion: DO.champagne, description: 'Pinot Noir, Pinot Meunier y Chardonnay', price: 90 },
  // Vinos especiales (carta rooftop)
  { key: 'w-grifo', name: 'El Grifo Malvasía Seco', type: 'blanco', section: 'especial', denominacion: DO['do-lanzarote'], origin: 'El Grifo', description: 'Malvasía seco', price: 30 },
  { key: 'w-raventos', name: 'Raventós i Blanc', type: 'espumoso', section: 'especial', denominacion: null, origin: 'Raventós i Blanc', description: 'Espumoso tradicional', price: 30 },
  { key: 'w-polroger', name: 'Pol Roger Brut Reserve Champagne', type: 'espumoso', section: 'especial', denominacion: DO.champagne, origin: 'Pol Roger', description: 'Brut Reserve', price: 80 },
  { key: 'w-billecart', name: 'Billecart-Salmon Brut Reserve', type: 'espumoso', section: 'especial', denominacion: DO.champagne, origin: 'Billecart-Salmon', description: 'Brut Reserve', price: 90 },
  { key: 'w-gago', name: 'Gago Tinto', type: 'tinto', section: 'especial', denominacion: DO['do-toro'], origin: 'Telmo Rodríguez', price: 26 },
  { key: 'w-montesa', name: 'La Montesa', type: 'tinto', section: 'especial', denominacion: DO['doca-rioja'], origin: 'Palacios Remondo', price: 26 },
  { key: 'w-petalos', name: 'Pétalos del Bierzo', type: 'tinto', section: 'especial', denominacion: DO['do-bierzo'], origin: 'Descendientes de J. Palacios', price: 27 },
  { key: 'w-ultreia', name: 'Ultreia Saint Jacques (Raúl Pérez)', type: 'tinto', section: 'especial', denominacion: DO['do-ribeira-sacra'], origin: 'Raúl Pérez', price: 28 },
  { key: 'w-algueira', name: 'Algueira Patrimonio', type: 'tinto', section: 'especial', denominacion: DO['do-ribeira-sacra'], origin: 'Algueira', price: 28 },
  { key: 'w-porrera', name: 'Vi de Vila Porrera', type: 'tinto', section: 'especial', denominacion: DO['doc-priorat'], origin: 'Vall Llach', price: 30 },
  { key: 'w-dido', name: "Dido 'La Universal'", type: 'tinto', section: 'especial', denominacion: DO['do-montsant'], origin: 'Venus La Universal', price: 30 },
  { key: 'w-sosegada', name: 'Casa Sosegada', type: 'tinto', section: 'especial', denominacion: DO['do-valencia'], origin: 'Rafael Cambra', price: 30 },
  { key: 'w-amarone', name: 'Cantine di Ora Amarone della Valpolicella', type: 'tinto', section: 'especial', denominacion: DO['amarone-della-valpolicella'], origin: 'Cantine di Ora', price: 34 },
  { key: 'w-almirez', name: 'Almirez tinto', type: 'tinto', section: 'especial', denominacion: DO['do-toro'], origin: 'Teso La Monja', price: 35 },
  { key: 'w-giro', name: 'Pepe Mendoza Giró de Abargues', type: 'tinto', section: 'especial', denominacion: DO['do-alicante'], origin: 'Pepe Mendoza', price: 36 },
  { key: 'w-predicador', name: 'Predicador', type: 'tinto', section: 'especial', denominacion: DO['doca-rioja'], origin: 'Contador', price: 40 },
  { key: 'w-camins', name: 'Camins del Priorat', type: 'tinto', section: 'especial', denominacion: DO['doc-priorat'], origin: 'Álvaro Palacios', price: 40 },
  { key: 'w-seque', name: 'El Sequé', type: 'tinto', section: 'especial', denominacion: DO['do-alicante'], origin: 'Bodegas y Viñedos El Sequé', price: 40 },
  { key: 'w-gain', name: 'Viñas de Gain', type: 'tinto', section: 'especial', denominacion: DO['vino-de-espana'], origin: 'Artadi', price: 42 },
  { key: 'w-abadia', name: 'Abadía Retuerta Selección Especial', type: 'tinto', section: 'especial', denominacion: DO['vt-castilla-y-leon'], origin: 'Abadía Retuerta', price: 45 },
  { key: 'w-mauro', name: 'Mauro Tinto', type: 'tinto', section: 'especial', denominacion: DO['vt-castilla-y-leon'], origin: 'Bodegas Mauro', price: 49 },
  { key: 'w-monasterio', name: 'Hacienda Monasterio Crianza', type: 'tinto', section: 'especial', denominacion: DO['do-ribera-del-duero'], origin: 'Hacienda Monasterio', price: 50 },
  { key: 'w-terrasses', name: 'Álvaro Palacios Les Terrasses', type: 'tinto', section: 'especial', denominacion: DO['doc-priorat'], origin: 'Álvaro Palacios', price: 60 },
  { key: 'w-puntido', name: 'El Puntido', type: 'tinto', section: 'especial', denominacion: DO['doca-rioja'], origin: 'Viñedos de Páganos', price: 70 },
  { key: 'w-macan', name: 'Macán Tinto Clásico', type: 'tinto', section: 'especial', denominacion: DO['doca-rioja'], origin: 'Rothschild & Vega Sicilia', price: 70 },
  { key: 'w-valsotillo', name: 'Valsotillo Gran Reserva', type: 'tinto', section: 'especial', denominacion: DO['do-ribera-del-duero'], origin: 'Bodegas Ismael Arroyo', price: 80 },
];

export const RECOMMENDED_WINE_NOTES = [
  'El joven que te recomendamos descubrir',
  'La recomendación de la tierra',
  'El crianza que te recomendamos descubrir',
] as const;
