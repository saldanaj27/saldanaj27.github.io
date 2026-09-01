import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://saldanaj27.github.io',
  integrations: [
    sitemap({
      // /resume/ is a compatibility redirect to the PDF, not a real page.
      // /work/ and /writing/ are temporarily unlinked while their copy is
      // revised; they are noindex in the meantime, so keep them out of the
      // sitemap too. Remove the work/writing clauses to restore.
      filter: (page) =>
        !page.endsWith('/resume/') &&
        !page.includes('/work/') &&
        !page.includes('/writing/'),
    }),
  ],
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    },
  },
});
