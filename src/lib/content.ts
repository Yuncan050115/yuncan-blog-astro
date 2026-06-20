import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import markedKatex from 'marked-katex-extension';
import YAML from 'yaml';
import { site } from '../data/site';
import { createHighlighterCoreSync } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import bashLang from 'shiki/langs/bash.mjs';
import shellLang from 'shiki/langs/shell.mjs';
import cLang from 'shiki/langs/c.mjs';
import cppLang from 'shiki/langs/cpp.mjs';
import cssLang from 'shiki/langs/css.mjs';
import scssLang from 'shiki/langs/scss.mjs';
import dockerLang from 'shiki/langs/docker.mjs';
import goLang from 'shiki/langs/go.mjs';
import htmlLang from 'shiki/langs/html.mjs';
import iniLang from 'shiki/langs/ini.mjs';
import javaLang from 'shiki/langs/java.mjs';
import jsLang from 'shiki/langs/javascript.mjs';
import jsonLang from 'shiki/langs/json.mjs';
import latexLang from 'shiki/langs/latex.mjs';
import mdLang from 'shiki/langs/markdown.mjs';
import nginxLang from 'shiki/langs/nginx.mjs';
import cmdLang from 'shiki/langs/cmd.mjs';
import psLang from 'shiki/langs/powershell.mjs';
import pyLang from 'shiki/langs/python.mjs';
import rustLang from 'shiki/langs/rust.mjs';
import sqlLang from 'shiki/langs/sql.mjs';
import tomlLang from 'shiki/langs/toml.mjs';
import tsLang from 'shiki/langs/typescript.mjs';
import xmlLang from 'shiki/langs/xml.mjs';
import yamlLang from 'shiki/langs/yaml.mjs';
import githubLight from 'shiki/themes/github-light.mjs';
import githubDark from 'shiki/themes/github-dark.mjs';

const root = process.cwd();
const oldSource = path.join(root, 'content');
const postsDir = path.join(oldSource, 'posts');

export type TocItem = {
  depth: number;
  text: string;
  id: string;
};

export type Post = {
  title: string;
  slug: string;
  date: string;
  updated?: string;
  description: string;
  tags: string[];
  categories: string[];
  html: string;
  excerpt: string;
  cover: string;
  hasCover: boolean;
  readingMinutes: number;
  toc: TocItem[];
  sticky: number;
  pinned: boolean;
};

export type MediaItem = {
  title: string;
  type?: string;
  area?: string;
  cover?: string;
  totalCount?: string | number;
  score?: string | number;
  des?: string;
  view?: string | number;
  follow?: string | number;
  url?: string;
  badge?: string;
};

export type MediaGroup = {
  key: string;
  title: string;
  items: MediaItem[];
};

marked.setOptions({
  gfm: true,
  breaks: false
});

marked.use(markedKatex({
  throwOnError: false,
  strict: false,
  output: 'html'
}));

const highlighter = createHighlighterCoreSync({
  langs: [
    bashLang, shellLang, cLang, cppLang, cssLang, scssLang, dockerLang,
    goLang, htmlLang, iniLang, javaLang, jsLang, jsonLang, latexLang,
    mdLang, nginxLang, cmdLang, psLang, pyLang, rustLang, sqlLang,
    tomlLang, tsLang, xmlLang, yamlLang
  ],
  themes: [githubLight, githubDark],
  engine: createJavaScriptRegexEngine()
});

const langAliases: Record<string, string> = {
  'c++': 'cpp', 'cxx': 'cpp', 'hpp': 'cpp', 'cc': 'cpp',
  'sh': 'bash', 'shell': 'bash', 'zsh': 'bash',
  'py': 'python', 'golang': 'go',
  'js': 'javascript', 'jsx': 'javascript', 'cjs': 'javascript', 'mjs': 'javascript',
  'ts': 'typescript', 'tsx': 'typescript',
  'yml': 'yaml',
  'bat': 'cmd', 'batch': 'cmd',
  'ps1': 'powershell',
  'dockerfile': 'docker',
  'rs': 'rust',
  'tex': 'latex',
  'md': 'markdown',
  'conf': 'ini', 'properties': 'ini'
};

const normalizeLang = (lang: string) => {
  const key = lang.toLowerCase().trim();
  return langAliases[key] || key;
};

const highlightCode = (code: string, lang: string) => {
  const normalized = normalizeLang(lang);
  const options = { themes: { light: 'github-light', dark: 'github-dark' } };
  try {
    return highlighter.codeToHtml(code, { lang: normalized, ...options });
  } catch {
    try {
      return highlighter.codeToHtml(code, { lang: 'text', ...options });
    } catch {
      return `<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`;
    }
  }
};

const toArray = (value: unknown) => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value.trim()) return [value];
  return [];
};

const formatDate = (value: unknown) => {
  const date = value instanceof Date ? value : new Date(String(value || ''));
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const stripHtml = (value: string) =>
  value
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const decodeHtml = (value: string) =>
  value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[\\/:*?"<>|#%{}^~[\]`]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const convertHexoTags = (content: string) =>
  content
    .replace(/\{% note\s+(\w+)?[^%]*%\}([\s\S]*?)\{% endnote %\}/g, (_, type = 'info', body) => {
      return `<div class="note note-${type}">${body.trim()}</div>`;
    })
    .replace(/\{% timeline\s+([^%]+)%\}/g, '<div class="timeline"><h2>$1</h2>')
    .replace(/\{% endtimeline %\}/g, '</div>')
    .replace(/<!-- timeline\s+([^>]+)-->/g, '<div class="timeline-item"><time>$1</time><div>')
    .replace(/<!-- endtimeline -->/g, '</div></div>')
    .replace(/\{% tabs\s+[^%]+%\}/g, '<div class="tabs-lite">')
    .replace(/\{% endtabs %\}/g, '</div>')
    .replace(/<!-- tab\s+([^>]+)-->/g, '<section class="tab-lite"><h3>$1</h3>')
    .replace(/<!-- endtab -->/g, '</section>')
    .replace(/\{%[^%]+%\}/g, '');

const injectHeadingIds = (html: string) => {
  const toc: TocItem[] = [];
  const nextHtml = html.replace(/<h([2-3])([^>]*)>([\s\S]*?)<\/h\1>/g, (full, level, attrs, inner) => {
    if (/\sid=/.test(attrs)) return full;
    const text = stripHtml(inner);
    if (!text) return full;
    const base = slugify(text) || `heading-${toc.length + 1}`;
    let id = base;
    let index = 2;
    while (toc.some((item) => item.id === id)) {
      id = `${base}-${index}`;
      index += 1;
    }
    toc.push({ depth: Number(level), text, id });
    return `<h${level}${attrs} id="${id}">${inner}</h${level}>`;
  });

  return { html: nextHtml, toc };
};

const protectArticleImages = (html: string) =>
  html.replace(/<img\s/gi, `<img loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${site.assets.defaultPostCover}'" `);

const addCodeFrames = (html: string) =>
  html.replace(/<pre><code(?: class="language-([^"]+)")?>([\s\S]*?)<\/code><\/pre>/g, (_, lang = 'text', code) => {
    const label = String(lang || 'text').toUpperCase();
    const rawCode = decodeHtml(code);
    const highlighted = highlightCode(rawCode, String(lang || 'text'));
    return `<figure class="code-frame" data-lang="${escapeHtml(label)}"><figcaption><span></span><strong>${escapeHtml(label)}</strong><button type="button" data-copy-code>复制</button></figcaption>${highlighted}</figure>`;
  });

const renderMarkdown = (content: string) => {
  const rawHtml = marked.parse(convertHexoTags(content), { async: false }) as string;
  const withImages = protectArticleImages(rawHtml);
  const withCode = addCodeFrames(withImages);
  return injectHeadingIds(withCode);
};

const estimateReading = (content: string) => {
  const clean = content.replace(/```[\s\S]*?```/g, '').replace(/\s/g, '');
  return Math.max(1, Math.ceil(clean.length / 500));
};

const firstMarkdownImage = (content: string) => content.match(/!\[[^\]]*\]\(([^)]+)\)/)?.[1];

const normalizeCover = (value?: string) => {
  const cover = String(value || '').trim();
  if (!cover || cover === 'false') return '';
  return cover;
};

const stickyValue = (data: Record<string, unknown>) => {
  if (data.pin === true || data.top === true) return 1;
  const raw = Number(data.sticky || data.pin || data.top || 0);
  return Number.isFinite(raw) ? raw : 0;
};

let cachedPosts: Post[] | null = null;

export function getPosts(): Post[] {
  if (cachedPosts) return cachedPosts;
  if (!fs.existsSync(postsDir)) {
    cachedPosts = [];
    return cachedPosts;
  }

  const result = fs
    .readdirSync(postsDir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const raw = fs.readFileSync(path.join(postsDir, file), 'utf8');
      const parsed = matter(raw);
      const data = parsed.data;
      const title = String(data.title || file.replace(/\.md$/, ''));
      const slug = String(data.abbrlink || slugify(title));
      const rendered = renderMarkdown(parsed.content);
      const text = stripHtml(rendered.html);
      const cover = normalizeCover(data.cover || data.top_img || firstMarkdownImage(parsed.content));
      const sticky = stickyValue(data);

      return {
        title,
        slug,
        date: formatDate(data.date),
        updated: formatDate(data.updated || data.update),
        description: String(data.description || text.slice(0, 88)),
        tags: toArray(data.tags),
        categories: toArray(data.categories),
        html: rendered.html,
        excerpt: text.slice(0, 118),
        cover: cover || site.assets.defaultPostCover,
        hasCover: Boolean(cover),
        readingMinutes: estimateReading(parsed.content),
        toc: rendered.toc,
        sticky,
        pinned: sticky > 0
      };
    })
    .sort((a, b) => b.sticky - a.sticky || +new Date(b.date) - +new Date(a.date));

  cachedPosts = result;
  return result;
}

export function getPost(slug: string) {
  return getPosts().find((post) => post.slug === slug);
}

export type TaxonomyItem = { name: string; slug: string; posts: Post[] };

let cachedTaxonomy: Record<'tags' | 'categories', TaxonomyItem[]> | null = null;

const computeTaxonomy = (type: 'tags' | 'categories'): TaxonomyItem[] => {
  const map = new Map<string, Post[]>();
  getPosts().forEach((post) => {
    post[type].forEach((name) => {
      const posts = map.get(name) || [];
      posts.push(post);
      map.set(name, posts);
    });
  });
  return Array.from(map.entries())
    .map(([name, posts]) => ({ name, slug: slugify(name), posts }))
    .sort((a, b) => b.posts.length - a.posts.length || a.name.localeCompare(b.name, 'zh-CN'));
};

export function getTaxonomy(type: 'tags' | 'categories'): TaxonomyItem[] {
  if (!cachedTaxonomy) {
    cachedTaxonomy = {
      tags: computeTaxonomy('tags'),
      categories: computeTaxonomy('categories')
    };
  }
  return cachedTaxonomy[type];
}

export function getPageMarkdown(relativePath: string) {
  const file = path.join(oldSource, relativePath);
  if (!fs.existsSync(file)) return { title: '', html: '', data: {} };
  const parsed = matter(fs.readFileSync(file, 'utf8'));
  return {
    title: String(parsed.data.title || ''),
    html: renderMarkdown(parsed.content).html,
    data: parsed.data
  };
}

export function getLinks() {
  const file = path.join(oldSource, 'data', 'link.yml');
  if (!fs.existsSync(file)) return [];
  const doc = YAML.parse(fs.readFileSync(file, 'utf8')) as Array<{
    class_name: string;
    class_desc?: string;
    link_list: Array<{ name: string; link: string; avatar?: string; avater?: string; descr?: string; siteshot?: string; screenshot?: string }>;
  }>;

  return doc.map((group) => ({
    ...group,
    link_list: group.link_list.map((item) => ({
      ...item,
      avatar: item.avatar || item.avater || site.assets.friendFallback,
      siteshot: item.siteshot || item.screenshot || ''
    }))
  }));
}

export type BangumiItem = {
  title: string;
  cover: string;
  url: string;
  type?: string;
  total?: number;
  follow?: number;
  view?: number;
  score?: number;
  desc?: string;
  category?: number;
};

export type BangumiData = {
  want: BangumiItem[];
  watching: BangumiItem[];
  watched: BangumiItem[];
  lastUpdate: string;
};

export function getBangumiData(categoryFilter?: 1 | 2): BangumiData {
  try {
    const dataPath = path.join(process.cwd(), 'content', 'data', 'bangumi-data.json');
    if (!fs.existsSync(dataPath)) return { want: [], watching: [], watched: [], lastUpdate: '' };
    const raw = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const filter = (items: any[]) =>
      categoryFilter ? items.filter(item => String(item.category || 1) === String(categoryFilter)) : items;
    return {
      want: filter(raw.want || []),
      watching: filter(raw.watching || []),
      watched: filter(raw.watched || []),
      lastUpdate: raw.lastUpdate || '',
    };
  } catch {
    return { want: [], watching: [], watched: [], lastUpdate: '' };
  }
}
