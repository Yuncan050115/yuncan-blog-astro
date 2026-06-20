import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPosts } from '../lib/content';
import { site } from '../data/site';

export async function GET(context: APIContext) {
  const posts = getPosts();
  return rss({
    title: site.name,
    description: site.description,
    site: context.site || site.mainSite,
    items: posts.map((post) => ({
      title: post.title,
      pubDate: new Date(post.date),
      description: post.excerpt || '',
      link: `/posts/${post.slug}/`,
    })),
    customData: `<language>zh-cn</language>`,
  });
}
