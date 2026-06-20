<h1 align="center">
<img width="28" src="./public/assets/logo-yuncan.png">
yuncan-blog-astro
</h1>


<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License"></a>
  <img src="https://img.shields.io/badge/Astro-static-orange?style=flat-square" alt="Astro">
  <img src="https://img.shields.io/badge/version-1.0.8-green?style=flat-square" alt="Version">
  <img src="https://api.yuncan.xyz/blog/260620_143855.webp" alt="Netlify">
</p>


yuncan-blog-astro 是我的个人独立站点主题，有博客、追番追剧、Steam 游戏库、友链友圈、评论、音乐这些常见模块，相应快速并且有移动端良好适配。

站点演示：[blog.yuncan.xyz](https://blog.yuncan.xyz)
![](https://api.yuncan.xyz/blog/260620_153929.webp)

## 内容

- 博客文章：Markdown 编写，自动生成分类 / 标签 / 归档 / 目录，代码高亮用 Shiki，数学公式用 KaTeX
- 诗集：独立页面，时间线 + 歌词式排版
- 文章内图片点击放大，支持滚轮 / 双击 / 双指缩放和拖动

## 媒体

- 追番追剧：astro-bangumi 拉 B 站数据，另有电影 / 追剧页
- Steam 游戏库：构建时预取数据，本地 JSON 兜底，不会时好时坏
- 友链朋友圈：聚合友链站点的最新文章

## 交互

- 自定义光标，点击有动效，夜间模式下会和粒子互动
- 首屏 Three.js 粒子背景，夜间有流星雨
- 首屏背景图呼吸动效，桌面端和光标反向联动
- 深色 / 浅色模式切换，跟随系统或手动
- 全局主题色设置面板
- 音乐播放器：MetingJS + 网易云歌单，桌面端自动播放
- Twikoo 评论系统
- 文章管理：隐藏入口（连点 FPS 区域 5 次），配 GitHub Token 可在线编辑文章

## 其他

- 响应式，移动端抽屉式导航，移动端关掉光标 / FPS / 右键菜单等重交互
- View Transitions 页面切换动画
- RSS、Sitemap 自动生成
- 构建时预取外部数据，客户端不直接请求外部 API

## 技术栈

| 用途 | 选型 |
| --- | --- |
| 框架 | Astro（`output: 'static'`） |
| 语言 | TypeScript |
| 样式 | 手写 CSS，没用 Tailwind |
| 内容 | Markdown + gray-matter + marked |
| 代码高亮 | Shiki |
| 数学公式 | KaTeX + marked-katex-extension |
| 3D | three.js |
| 追番 | astro-bangumi |
| 站点地图 | @astrojs/sitemap |
| RSS | @astrojs/rss |

## 本地预览

```bash
npm install      # 装依赖
npm run dev      # 开发服务器，默认 http://localhost:4321
npm run new      # 新建文章（会问标题和分类）
npm run check    # 类型检查
npm run build    # 构建，产物在 dist/
npm run preview  # 预览构建产物
```

构建流程是 `fetch-external-data.mjs` → `astro build` → `postbuild.mjs`：先预取 Steam / 朋友圈 / 追番数据写到本地 JSON，再构建静态页面，最后复制 `.nojekyll` 等文件到 dist。

## 部署

纯静态站点，dist/ 扔哪都行。

- **GitHub Pages**：仓库里带了 `.github/workflows/pages.yml`，推到 master 自动构建并通过 GitHub Actions 部署。需要在仓库 Settings → Pages → Source 选 "GitHub Actions"
- **Netlify**：有 `netlify.toml`，连仓库就行
- **Vercel**：构建命令 `npm run build`，输出目录 `dist`

## 配置

站点配置集中在 [src/config/yuncan.config.ts](src/config/yuncan.config.ts)，导航、社交链接、媒体数据源、赞赏、项目展示都在这里改。

环境变量复制 `.env.example` 为 `.env` 按需填。`PUBLIC_` 开头的会注入前端，其他是敏感凭证。

### 站点信息

| 变量 | 说明 |
| --- | --- |
| `PUBLIC_SITE_NAME` | 站点名称 |
| `PUBLIC_SITE_AUTHOR` | 作者 |
| `PUBLIC_SITE_DESC` | 站点简介 |
| `PUBLIC_SITE_URL` | 站点地址 |
| `PUBLIC_SITE_LOGO` | Logo 路径 |
| `PUBLIC_SITE_START` | 建站日期（YYYY-MM-DD） |
| `PUBLIC_SITE_ICP` | ICP 备案号 |

### API 配置

| 变量 | 说明 |
| --- | --- |
| `PUBLIC_TWIKOO_API` | Twikoo 评论 API，不填则不显示评论 |
| `PUBLIC_METING_API` | MetingJS 音乐 API，不填则不显示播放器 |
| `PUBLIC_SONG_ID` | 网易云歌单 ID |
| `PUBLIC_BG_IMAGE_API` | 默认背景图 API |
| `PUBLIC_STEAM_API_KEY` | Steam API Key |
| `PUBLIC_CIRCLE_API` | 友链朋友圈 API |
| `PUBLIC_BILIBILI_UID` | B 站 UID，追番数据源 |

### 敏感凭证

| 变量 | 说明 |
| --- | --- |
| `POST_PASSWORD` | 文章管理页密码，连点 FPS 区域 5 次触发隐藏入口 |
| `GITHUB_TOKEN` | GitHub fine-grained token，在线编辑文章用，只授目标仓库 Contents 读写权限 |
| `GITHUB_REPO` | 仓库地址（用户名/仓库名） |
| `GITHUB_BRANCH` | 源码分支，默认 master |

## 目录结构

```
.
├── content/             内容
│   ├── posts/           博客文章 Markdown
│   ├── pages/           单独页面（about、love、time）
│   ├── data/            数据文件（追番、Steam、朋友圈、友链）
│   ├── fallback/        兜底数据
│   └── poems.md         诗集
├── public/              静态资源
├── scripts/             构建脚本
│   ├── fetch-external-data.mjs   构建前预取外部数据
│   ├── new-post.mjs              新建文章
│   └── postbuild.mjs             构建后处理
├── src/
│   ├── components/      组件
│   ├── config/          站点配置
│   ├── layouts/         布局
│   ├── lib/             工具库
│   ├── pages/           页面路由
│   ├── scripts/app.ts   前端交互核心
│   └── styles/site.css  全局样式
├── astro.config.mjs
├── netlify.toml
└── package.json
```

## License

MIT

### 
