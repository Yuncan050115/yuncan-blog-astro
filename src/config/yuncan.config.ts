/**
 * 站点全局配置
 * 修改本文件可调整站点信息、社交链接、媒体数据源、导航等
 */

export const yuncanConfig = {
  /** 配置版本号，与 package.json 版本保持一致 */
  version: '1.0.8',

  /** 站点基本信息 */
  site: {
    /** 站点名称 */
    name: import.meta.env.PUBLIC_SITE_NAME || '我的博客',
    /** 站点标题（浏览器标签页标题） */
    title: import.meta.env.PUBLIC_SITE_TITLE || '我的博客',
    /** 站点描述（SEO） */
    description: import.meta.env.PUBLIC_SITE_DESC || '一句话介绍你的站点',
    /** 站点副标题 */
    subtitle: '一句话介绍你的站点',
    /** 站点作者 */
    author: import.meta.env.PUBLIC_SITE_AUTHOR || '你的名字',
    /** 联系邮箱 */
    email: 'you@example.com',
    /** 主站地址 */
    mainSite: import.meta.env.PUBLIC_SITE_URL || 'https://example.com',
    /** 站点起始日期（用于计算建站时长） */
    siteStart: import.meta.env.PUBLIC_SITE_START || '2026-01-01',
    /** ICP 备案号 */
    icp: import.meta.env.PUBLIC_SITE_ICP || '',
    /** GitHub 用户名 */
    githubUser: 'your-github-username',
    /** GitHub 仓库（用于 Issues 评论等） */
    repository: 'your-github-username/your-repo'
  },


  /** 社交链接（页脚展示） */
  social: [
    { label: 'GitHub', icon: 'github', href: 'https://github.com/your-github-username' },
    { label: '邮箱', icon: 'mail', href: 'mailto:you@example.com' },
    { label: '主站', icon: 'link', href: 'https://example.com' }
  ],

  /** 静态资源路径（位于 public/ 下） */
  assets: {
    /** 站点 Logo */
    logo: '/assets/logo-yuncan.png',
    /** 头像 */
    avatar: '/assets/logo-yuncan.png',
    /** 首页大图回退地址 */
    heroFallback: '/assets/logo-yuncan.png',
    /** 文章默认封面 */
    defaultPostCover: '/assets/logo-yuncan.png',
    /** 友链头像回退地址 */
    friendFallback: '/assets/logo-yuncan.png',
    /** 页面封面回退地址 */
    pageFallback: '/assets/logo-yuncan.png'
  },

  /** 背景图配置 */
  background: {
    /** 默认背景图 */
    image: import.meta.env.PUBLIC_BG_IMAGE_API || 'https://bing.ee123.net/img/rand',
    /** 浅色模式背景图 */
    lightImage: import.meta.env.PUBLIC_BG_IMAGE_API || 'https://bing.ee123.net/img/rand',
    /** 深色模式背景图 */
    darkImage: import.meta.env.PUBLIC_BG_IMAGE_API || 'https://bing.ee123.net/img/rand'
  },

  /** Twikoo 评论系统配置 */
  twikoo: {
    /** Twikoo 环境 ID（部署地址） */
    envId: import.meta.env.PUBLIC_TWIKOO_API || '',
    /** Twikoo 脚本 CDN 地址 */
    script: 'https://cdn.jsdelivr.net/npm/twikoo@1.6.44/dist/twikoo.all.min.js'
  },

  /** 音乐播放器配置（基于 MetingJS） */
  music: {
    /** 音乐数据源服务（netease/qq/xiguakugou 等） */
    server: 'netease',
    /** 数据类型（playlist/song/album 等） */
    type: 'playlist',
    /** 歌单 ID */
    playlistId: import.meta.env.PUBLIC_SONG_ID || '',
    /** MetingJS API 地址 */
    api: import.meta.env.PUBLIC_METING_API || '',
    /** 是否自动播放 */
    autoplay: true,
    /** 歌词模式（manual/auto） */
    lyricMode: 'manual',
    /** 音乐封面回退地址 */
    fallbackCover: '/assets/logo-yuncan.png'
  },

  /** 媒体数据配置（追番、追剧、Steam） */
  media: {
    /** B 站 UID */
    bilibiliUid: import.meta.env.PUBLIC_BILIBILI_UID || '',
    /** 追番页面标题 */
    bangumiSource: '追番记录',
    /** 追剧页面标题 */
    cinemaSource: '追剧记录',
    /** Steam 64 位 ID */
    steamId: '',
    /** Steam 个人资料页地址 */
    steamProfile: ''
  },

  /** 内容许可协议 */
  license: {
    /** 协议名称 */
    name: 'CC BY-NC-SA 4.0',
    /** 协议链接 */
    url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/'
  },

  /** 赞赏（打赏）配置 */
  reward: {
    /** 赞赏区块标题 */
    title: '赞赏作者',
    /** 赞赏文案 */
    text: '如果这篇文章对你有帮助，可以请我喝杯茶。',
    /** 赞赏二维码图片（请替换为自己的收款码） */
    images: [
      { label: '支付宝', src: '/assets/logo-yuncan.png' },
      { label: '微信', src: '/assets/logo-yuncan.png' }
    ]
  },

  /** 顶部导航菜单 */
  navigation: [
    {
      label: '文章',
      href: '/archives/',
      children: [
        { label: '归档', href: '/archives/' },
        { label: '标签', href: '/tags/' },
        { label: '分类', href: '/categories/' }
      ]
    },
    {
      label: '在看',
      href: '/bangumis/',
      children: [
        { label: '追番', href: '/bangumis/' },
        { label: '追剧', href: '/cinemas/' }
      ]
    },
    { label: '在玩', href: '/steamgames/' },
    { label: '留言板', href: '/comments/' },
    {
      label: '友链',
      href: '/social/link/',
      children: [
        { label: '友人帐', href: '/social/link/' },
        { label: '朋友圈', href: '/social/circle/' }
      ]
    },
    {
      label: '个人',
      href: '/personal/about/',
      children: [
        { label: '旧时光', href: '/site/time/' },
        { label: '恋爱小屋', href: '/personal/love/' },
        { label: '关于', href: '/personal/about/' },
        { label: '项目', href: '/projects/' }
      ]
    },
    { label: '诗集', href: '/poems/' },
    { label: '主站', href: 'https://example.com' }
  ],

  /** 项目展示（项目页使用） */
  projects: [
    {
      name: '示例项目',
      href: 'https://github.com/your-github-username/your-repo',
      description: '在这里写项目简介。',
      language: 'TypeScript',
      stars: 0
    }
  ]
} as const;
