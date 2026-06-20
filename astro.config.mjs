import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import bangumi from 'astro-bangumi';

export default defineConfig({
  // 改成你自己的站点地址，影响 sitemap、RSS 等绝对链接
  site: 'https://example.com',
  output: 'static',
  integrations: [
    sitemap(),
    bangumi({
      source: 'bili',
      vmid: import.meta.env.PUBLIC_BILIBILI_UID || '',
      title: '追番列表',
      category: [1, 2],
      coverMirror: '',
      devMode: true,
      refreshEndpoint: '/api/bangumi/refresh',
    })
  ],
  image: {
    domains: ['i0.hdslb.com']
  }
});
