/**
 * RESEÑAS que muestra el carrusel (src/components/Reviews.astro).
 * Fuente: Google Maps, ficha "La Ximenera - Rooftop" (consultado 22/10/2026), todas de 5★.
 * Reseñas originales en español, texto LITERAL (sin corregir, con emojis), facilitadas por Luis.
 * Orden del carrusel = orden del array. `translated: true` solo si se usa una traducción.
 * No inventar ni editar textos.
 */
export interface Review {
  author: string;          // tal cual aparece en Google
  date: string;            // fecha relativa, en español
  text: string;            // texto mostrado
  translated: boolean;     // true → etiqueta "Traducida del inglés"
  rating: 1 | 2 | 3 | 4 | 5;
  source: 'Google';
  original?: string;       // texto original literal (referencia, no se muestra)
}

export const reviewsSource = {
  label: 'Reseña de Google',
  url: 'https://www.google.com/maps/place/La+Ximenera+-+Rooftop/@38.697193,-0.4809042,17z/data=!3m1!4b1!4m6!3m5!1s0xd618780a6e358c5:0xd8a97c902fb0407e',
};

export const reviews: Review[] = [
  { author: "toni troyano", date: "Hace 4 meses", rating: 5, source: 'Google', translated: false,
    text: "Excelente experiencia. Fuimos a cenar y todo estuvo perfecto. La comida estaba deliciosa, con productos de calidad y muy bien presentada. Pero lo que realmente marcó la diferencia fue el servicio: atento, profesional y siempre pendiente de que no nos faltara nada. Un trato cercano que te hace sentir como en casa. Sin duda, volveremos. ¡Servicio de 10! 👏🍽️" },
  { author: "joan francès Reina Salinas", date: "Hace 3 meses", rating: 5, source: 'Google', translated: false,
    text: "Sin lugar a dudas para mi el mejor restaurante de la zona. Calidad precio excelente. Todo exquisito" },
  { author: "Maria M", date: "Hace 3 meses", rating: 5, source: 'Google', translated: false,
    text: "Genial, todo buenísimo, el bacalao se deshacía en la boca al comer, las patatas en su punto perfecto, la carne de buena calidad. El turrón nos sorprendió mucho la verdad, es bastante dulce\nAtención muy buena, camareros cercanos y atentos." },
  { author: "Alfredo LLorens", date: "Hace un mes", rating: 5, source: 'Google', translated: false,
    text: "Ha sido un acierto el cambio de ubicación e instalaciones, habiendo ganado en espacio y comodidad, creando un acogedor entorno en una sala amplia con bodega a la vista y una terraza exterior.\nHemos estado un par de veces en el recién estrenado restaurante, atendido por personal muy pendiente del cliente, con una carta de la que pudimos probar y nos deleitamos con el Tomate con capellà y mojama, Fritura de pescadito de la playa, Calamar a la andaluza, Tataki de atún a la brasa con salsa Tsuyu Moto, Entrecotte y un Rodaballo a la Donostiarra, buen producto, bien elaborado y presentado, con raciones para compartir dos personas.\nEl maridaje lo aportó un Pepe Mendoza Casa Agrícola, tinto en una ocasión y blanco en la otra, unos vinos excelentes a un precio muy ajustado.\nOfrece una buena relación calidad precio que, sin duda, lo hace muy recomendable para visitar, siendo aconsejable la reserva previa en los fines de semana que está más concurrido." },
  { author: "Clara Maxou", date: "Hace 8 meses", rating: 5, source: 'Google', translated: false,
    text: "Lugar muy agradable, decoración bonita, buena música y variedad en la carta. Te reciben con una tapa en la mesa, nos gustó mucho. El pulpo estaba muy bueno y el solomillo. Quizás lo que menos nos convenció fue el postre, el brownie, demasiado compacto. Por lo demás muy bien." },
];
