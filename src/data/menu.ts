/**
 * CARTA de La Ximenera — transcripción literal del PDF facilitado por Luis (22/10/2026):
 * https://drive.google.com/file/d/1-DJ_VYU45RekI01XQp2mKb7ng9PVNu8S/view
 * (PDF "Menu 15-9-22 SRA3.indd", modificado el 27/03/2026, 1 página A3 apaisada con dos caras.)
 *
 * Se respeta la redacción original, incluidas erratas ("Nuetras", "Donostiarra", "Mousee", "Browne",
 * "Entrecotte", "rustico", "celiacos"). Única normalización: "16.50 €" del ceviche → "16,50 €".
 * Alérgenos: la carta muestra como mucho UN icono por plato (Lácteos, Pescado, Moluscos,
 * Crustáceos y mariscos). No es una declaración completa de los 14 alérgenos.
 */
export type Allergen = 'lacteos' | 'pescado' | 'moluscos' | 'crustaceos';

export interface MenuItem {
  name: string;
  /** Precio tal cual en la carta (ración entera). */
  price?: string;
  /** Precio de media ración ("1/2"). */
  half?: string;
  allergens?: Allergen[];
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

export const menu: MenuSection[] = [
  {
    id: 'frios',
    tab: 'Fríos',
    title: 'Fríos',
    subtitle: 'Para compartir',
    items: [
      { name: 'Degustación de quesos Europeos con frutas frescas y secas', half: '9,80 €', price: '16,80 €', allergens: ['lacteos'] },
      { name: 'Escalibada brasa con anchoas del Norte y aceite negro', price: '4,80 € /u', allergens: ['pescado'] },
      { name: 'Tomate Raf con capellá y virutas de mojama', price: '12,90 €', allergens: ['pescado'] },
      { name: 'Bolas de aguacate rellenas de tartar de Atún y de Salmón', price: '17,50 €', allergens: ['pescado'] },
      { name: 'Carpaccio de tomate rosa con burrata al pesto y rúcula', price: '13,90 €', allergens: ['lacteos'] },
      { name: 'Tartar de Solomillo de vaca acompañado de tostadas', price: '19,50 €' },
      { name: 'Ensalada de queso de cabra caramelizada', price: '12,50 €', allergens: ['lacteos'] },
      { name: 'Pericana Alcoyana', half: '9,80 €', price: '15,50 €', allergens: ['pescado'] },
      { name: 'Turrón de Foie con almendras', price: '18,90 €' },
      { name: 'Ostras', price: '4,20 €/u', allergens: ['moluscos'] },
      { name: 'Anchoas del norte sobre una crema de pesto y tomate confitado', price: '4,50 €', allergens: ['pescado'] },
      { name: 'Ceviche de corvina salvaje y gamba roja', price: '16,50 €', allergens: ['pescado'] },
      { name: 'Marisco del día', price: 'S/M' },
    ],
  },
  {
    id: 'calientes',
    tab: 'Calientes',
    title: 'Calientes',
    subtitle: 'Para compartir',
    items: [
      { name: 'Nuetras patatas Bravas', price: '9,50 €' },
      { name: 'Tacos de Buey marinados y a la brasa', price: '15,50 €' },
      { name: 'Salteado de gambas con verduras de temporada', price: '17,50 €', allergens: ['crustaceos'] },
      { name: 'Revuelto de pericana alcoyana', price: '12,90 €', allergens: ['pescado'] },
      { name: 'Almejas a la marinera', price: '15,50 €', allergens: ['moluscos'] },
      { name: 'Mejillones a la cerveza', half: '8,50 €', price: '12,00 €', allergens: ['moluscos'] },
      { name: 'Mejillones al vapor', half: '6,20 €', price: '9,50 €', allergens: ['moluscos'] },
      { name: 'Pulpo brasa sobre puré de patata y tomate', price: '19,50 €', allergens: ['crustaceos'] },
      { name: 'Calamar a la brasa o a la andaluza', price: '16,50 €', allergens: ['crustaceos'] },
      { name: 'Vieira a la brasa con crema de puerros', price: '5,90 €/u', allergens: ['crustaceos'] },
      { name: 'Fritura de pescadito de playa', price: '15,50 €', allergens: ['pescado'] },
      { name: 'Tataki de Atún rojo a la brasa con salsa Tsuyu Moto', price: '24,50 €', allergens: ['pescado'] },
    ],
  },
  {
    id: 'brasas',
    tab: 'Brasas',
    title: 'Nuestras Brasas',
    intro: 'En nuestras Brasas trabajamos con carnes y pescados nacionales acompañados de verduras de temporada y patatas baby.',
    items: [
      { name: 'Solomillo de vaca a la brasa', price: '24,50 €' },
      { name: 'Entrecotte de ternera trinchado con verduras', price: '19,50 €' },
      { name: 'Salmón relleno de gambas a la brasa con aceite de cítricos', price: '16,50 €', allergens: ['pescado'] },
      { name: 'Rodaballo a la Donostiarra estilo tradicional', price: '19,80 €', allergens: ['pescado'] },
      { name: 'Secreto Ibérico con chimichurri a la brasa', price: '18,50 €' },
      { name: 'Chuletón de vaca Premium trinchado con guarnición', price: '100 grs / 5,85 €' },
      { name: 'Bacalao gratinado al perfume de ajo y tomate seco', price: '15,50 €', allergens: ['pescado'] },
      { name: 'Bacalao ahumado con tomillo, romero y verduras brasa', price: '17,50 €', allergens: ['pescado'] },
      { name: 'Salsas para acompañar', price: '1,80 €' },
    ],
  },
  {
    id: 'postres',
    tab: 'Postres',
    title: 'Nuestros Postres Caseros',
    items: [
      { name: 'La Bola de nieve con frutos rojos', price: '6,50 €', allergens: ['lacteos'] },
      { name: 'La Dama blanca', price: '6,00 €', allergens: ['lacteos'] },
      { name: 'Milhojas de crema de manzanas al horno y chocolate', price: '6,80 €', allergens: ['lacteos'] },
      { name: 'La Mousee de nata, tomillo, frutos rojos y sorbete de maracuyá', price: '6,50 €', allergens: ['lacteos'] },
      { name: 'Piña a la brasa con helado de coco y flambeado de ron', price: '6,50 €', allergens: ['lacteos'] },
      { name: 'Browne de chocolate con nueces y helado de nata', price: '6,80 €', allergens: ['lacteos'] },
      { name: 'Fruta de Temporada' }, // sin precio en la carta
    ],
  },
  {
    id: 'sugerencias',
    tab: 'Pan y sugerencias',
    title: 'Preguntar por nuestra sugerencia del día',
    items: [
      { name: 'Pan rustico a la brasa acompañado de tomate y all i oli', price: '2,20 €' },
    ],
    notes: ['Disponemos de pan y bebidas para celiacos'],
  },
];
