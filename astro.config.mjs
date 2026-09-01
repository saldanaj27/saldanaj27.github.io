import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://saldanaj27.github.io',
  integrations: [
    sitemap({
      // /resume/ is a compatibility redirect to the PDF, not a real page.
      filter: (page) => !page.endsWith('/resume/'),
    }),
  ],
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    },
  },
});
