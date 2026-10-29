/**
 * GALERÍA. Fotos oficiales del Instagram @laximenera_restaurante (640px), en src/assets/instagram/.
 * Se muestran PRIMERO; después, fotos públicas de clientes (provisionales).
 * Para añadir más: copia el archivo a src/assets/instagram/ y añade su entrada aquí.
 */
export const instagram = {
  handle: '@laximenera_restaurante',
  url: 'https://www.instagram.com/laximenera_restaurante/',
  // Bio literal del perfil "La Ximenera Rooftop" (22/10/2026):
  bio: 'Un nuevo espacio singular con encanto. Brasería mediterránea y cocina de producto. Rooftop. Alcoi/Alcoy',
};

export const instagramMeta: Record<string, { alt: string; post: string }> = {
  'ig-01.jpg': { alt: 'Cazuela de mejillones', post: 'https://www.instagram.com/p/DeJ19kfoLI7/' },
  'ig-02.jpg': { alt: 'Plato de pescado crudo con aguacate en la mesa del restaurante', post: 'https://www.instagram.com/p/DdPQAwSxfdo/' },
  'ig-03.jpg': { alt: 'Carne a la brasa con verduras', post: 'https://www.instagram.com/p/DdMOik1IjBI/' },
  'ig-04.jpg': { alt: 'Ceviche de gambas con aguacate, boniato y maíz', post: 'https://www.instagram.com/p/Dct-LsUxnu_/' },
  'ig-05.jpg': { alt: 'Carne de vaca a la brasa trinchada sobre tabla con verduras', post: 'https://www.instagram.com/p/DcqG3KRI_a1/' },
  'ig-06.jpg': { alt: 'Tartar de atún con algas', post: 'https://www.instagram.com/p/Dco239wxU2v/' },
  'ig-07.jpg': { alt: 'Tartar de carne con yema de huevo', post: 'https://www.instagram.com/p/Dbff1ReoXAb/' },
};
