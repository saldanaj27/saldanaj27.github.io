import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('writing', ({ data }) => !data.draft);
  return rss({
    title: 'Javier Saldana · Writing',
    description:
      'Long-form engineering write-ups on authorization infrastructure, Kubernetes operators, and distributed-systems trade-offs.',
    site: context.site,
    items: posts
      .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
      .map((post) => ({
        title: post.data.title,
        description: post.data.summary,
        pubDate: post.data.date,
        link: `/writing/${post.id}/`,
      })),
  });
}
