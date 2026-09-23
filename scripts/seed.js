// Crea la configuración inicial y contenido de ejemplo (sólo si no existe).
// Es seguro ejecutarlo varias veces: no sobrescribe contenido ya editado.
import { prisma } from '../src/config/prisma.js';
import { getSiteSettings, getHeader, getFooter } from '../src/services/siteService.js';

const DEFAULT_SECTIONS = [
  {
    type: 'hero',
    title: 'Detalles que enamoran',
    subtitle: 'Bienvenida',
    body: 'Productos seleccionados con cariño para ti. Explora nuestro catálogo y encuentra tu favorito.',
    buttonText: 'Ver catálogo',
    buttonUrl: '/catalogo',
  },
  {
    type: 'features',
    title: '¿Por qué elegirnos?',
    subtitle: 'Calidad, atención y estilo en cada pedido.',
    items: [
      { title: 'Calidad', text: 'Seleccionamos cuidadosamente cada producto.' },
      { title: 'Atención personal', text: 'Te acompañamos antes y después de tu compra.' },
      { title: 'Envíos', text: 'Entregas seguras y a tiempo.' },
    ],
  },
  {
    type: 'imageText',
    title: 'Nuestra historia',
    body: 'Cuéntale a tus clientes quién eres, qué te inspira y por qué hacen bien en elegirte. Este texto se edita desde el panel administrativo.',
    buttonText: 'Conoce el catálogo',
    buttonUrl: '/catalogo',
  },
  {
    type: 'cta',
    title: '¿Tienes alguna pregunta?',
    body: 'Escríbenos y con gusto te ayudamos.',
    buttonText: 'Contáctanos',
    buttonUrl: '/contacto',
  },
];

async function main() {
  await getSiteSettings();
  await getHeader();
  await getFooter();
  console.log('✔ Configuración del sitio, header y footer listos');

  const count = await prisma.contentSection.count();
  if (count === 0) {
    await prisma.contentSection.createMany({
      data: DEFAULT_SECTIONS.map((s, i) => ({ ...s, sortOrder: i })),
    });
    console.log(`✔ ${DEFAULT_SECTIONS.length} secciones de contenido creadas`);
  } else {
    console.log('• Ya existen secciones de contenido, no se modificaron');
  }
}

main()
  .catch((err) => {
    console.error('✖ Error en el seed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
