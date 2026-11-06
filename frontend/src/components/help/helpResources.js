export const productLabel = 'Tomatoes v1.0.0';

export const helpResources = [
  {
    id: 'documentation',
    title: 'Documentation',
    description: 'Project setup, configuration and source code.',
    icon: 'mdi-book-open-page-variant-outline',
    external: true,
    link: { href: 'https://github.com/diego-r93/tomatoes-server', target: '_blank', rel: 'noopener noreferrer' },
  },
  {
    id: 'firmware',
    title: 'ESP32 & firmware',
    description: 'Find your boards and manage firmware updates.',
    icon: 'mdi-chip',
    external: false,
    link: { to: '/help#esp32' },
  },
  {
    id: 'hydroponics',
    title: 'Hydroponics guide',
    description: 'Learn about systems, water and plant nutrition.',
    icon: 'mdi-sprout-outline',
    external: true,
    link: { href: 'https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/small-scale-hydroponics', target: '_blank', rel: 'noopener noreferrer' },
  },
];
