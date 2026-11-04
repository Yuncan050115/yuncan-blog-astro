# Changelog

## v1.0.8 — 2026-06-20

- Astro-based minimal theme: online post editing, integrated music player,
  Hexo-compatible front matter, friend-circle (朋友圈) feed, GitHub Pages output.
- `scripts/fetch-external-data.mjs` runs before the build so external feeds are
  baked into static output — the deployed site makes no third-party calls at
  runtime.
- `scripts/postbuild.mjs` applies Pages-specific asset fixes.
- `scripts/new-post.mjs` scaffolds a post with the correct front matter.
- Docs site on VitePress (`docs:dev` / `docs:build`).
