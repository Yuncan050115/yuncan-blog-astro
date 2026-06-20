type Track = {
  title: string;
  author?: string;
  artist?: string;
  url: string;
  pic?: string;
  cover?: string;
  lrc?: string;
};

type MusicConfig = {
  api: string;
  server: string;
  type: string;
  id: string;
  autoplay?: boolean;
  lyricMode?: string;
  fallbackCover: string;
};

// 移动端判断：触屏设备或窄屏
const isMobile = () =>
  window.matchMedia('(max-width: 768px)').matches ||
  window.matchMedia('(pointer: coarse)').matches;

type LrcLine = { time: number; text: string };

type MusicState = {
  tracks: Track[];
  currentIndex: number;
  lrc: LrcLine[];
  loading?: Promise<void>;
  triedAutoplay?: boolean;
  currentTime?: number;
  wasPlaying?: boolean;
};

declare global {
  interface Window {
    __yuncanApp?: boolean;
    __yuncanThree?: boolean;
    __yuncanContextMenu?: boolean;
    __yuncanMusicState?: MusicState;
    __yuncanParticles?: { mouseX: number; mouseY: number };
    twikoo?: { init: (options: { envId?: string; el: string }) => void };
  }
}

export {};

const parseLrc = (lrc = '') =>
  lrc
    .split('\n')
    .map((line) => {
      const match = line.match(/\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/);
      if (!match) return null;
      const fraction = match[3] ? Number(`0.${match[3]}`) : 0;
      return { time: Number(match[1]) * 60 + Number(match[2]) + fraction, text: match[4].trim() };
    })
    .filter(Boolean) as LrcLine[];

const buildMusicUrl = (config: MusicConfig) =>
  config.api
    .replace(':server', encodeURIComponent(config.server))
    .replace(':type', encodeURIComponent(config.type))
    .replace(':id', encodeURIComponent(config.id))
    .replace(':r', String(Math.random()));

const getAutoTheme = () => {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 19 ? 'light' : 'dark';
};

const applyTheme = (value?: string | null) => {
  const root = document.documentElement;
  const saved = value ?? localStorage.getItem('yuncan-theme');
  if (saved === 'light' || saved === 'dark') {
    root.dataset.theme = saved;
  } else {
    root.dataset.theme = getAutoTheme();
  }
};

const initTheme = () => {
  applyTheme();
  const button = document.querySelector<HTMLElement>('[data-theme-toggle]');
  if (button && button.dataset.ready !== 'true') {
    button.dataset.ready = 'true';
    button.addEventListener('click', () => {
      const root = document.documentElement;
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      localStorage.setItem('yuncan-theme', next);
    });
  }
};

// Track page-scoped listeners so they can be removed on re-boot (View Transitions re-runs boot on every navigation)
let navScrollHandler: (() => void) | null = null;
let progressScrollHandler: (() => void) | null = null;
let heroSnapCleanup: (() => void) | null = null;
// nav 事件是否已绑定到 document（toggle 是 persist 元素，只绑定一次）
let navGlobalReady = false;

const initNav = () => {
  const header = document.querySelector<HTMLElement>('.site-header');
  if (!header) return;

  // 全局事件只绑定一次（toggle 是 persist 元素，不会随页面切换重建）
  if (!navGlobalReady) {
    navGlobalReady = true;
    // 汉堡按钮：用事件委托，每次点击时实时查询 mobileNav
    document.addEventListener('click', (event) => {
      const toggle = (event.target as HTMLElement).closest<HTMLElement>('[data-nav-toggle]');
      if (!toggle) return;
      event.stopPropagation();
      const mobileNav = document.querySelector<HTMLElement>('.site-nav--mobile');
      const scrim = document.querySelector<HTMLElement>('[data-nav-scrim]');
      if (!mobileNav) return;
      const willOpen = !mobileNav.classList.contains('is-open');
      mobileNav.classList.toggle('is-open', willOpen);
      scrim?.classList.toggle('is-open', willOpen);
    });

    // 遮罩点击关闭（事件委托）
    document.addEventListener('click', (event) => {
      const scrim = (event.target as HTMLElement).closest<HTMLElement>('[data-nav-scrim]');
      if (!scrim || !scrim.classList.contains('is-open')) return;
      const mobileNav = document.querySelector<HTMLElement>('.site-nav--mobile');
      mobileNav?.classList.remove('is-open');
      scrim.classList.remove('is-open');
    });

    // 移动端导航链接点击关闭（事件委托）
    document.addEventListener('click', (event) => {
      const link = (event.target as HTMLElement).closest<HTMLElement>('.site-nav--mobile a');
      if (!link) return;
      const mobileNav = document.querySelector<HTMLElement>('.site-nav--mobile');
      const scrim = document.querySelector<HTMLElement>('[data-nav-scrim]');
      mobileNav?.classList.remove('is-open');
      scrim?.classList.remove('is-open');
    });

    // ESC 键关闭
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      const mobileNav = document.querySelector<HTMLElement>('.site-nav--mobile');
      if (!mobileNav?.classList.contains('is-open')) return;
      const scrim = document.querySelector<HTMLElement>('[data-nav-scrim]');
      mobileNav.classList.remove('is-open');
      scrim?.classList.remove('is-open');
    });
  }

  // 桌面端 header 滚动收缩
  if (navScrollHandler) {
    window.removeEventListener('scroll', navScrollHandler);
  }
  const update = () => {
    header.classList.toggle('is-docked', window.scrollY > 160);
  };
  update();
  window.addEventListener('scroll', update, { passive: true });
  navScrollHandler = update;
};

// 图片放大灯箱
const initImageLightbox = () => {
  const lightbox = document.querySelector<HTMLElement>('[data-image-lightbox]');
  const lightboxImg = document.querySelector<HTMLImageElement>('[data-image-lightbox-img]');
  const closeBtn = document.querySelector<HTMLElement>('[data-image-lightbox-close]');
  if (!lightbox || !lightboxImg) return;

  // 缩放状态
  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let pinchStartDist = 0;
  let pinchStartScale = 1;

  const applyTransform = () => {
    lightboxImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  };

  const resetTransform = () => {
    scale = 1;
    translateX = 0;
    translateY = 0;
    lightboxImg.style.transform = '';
  };

  const close = () => {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    resetTransform();
  };

  const open = (src: string, alt: string) => {
    lightboxImg.src = src;
    lightboxImg.alt = alt;
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    resetTransform();
  };

  // 点击文章内的图片打开灯箱
  document.querySelectorAll<HTMLImageElement>('article img, .post-body img, .prose img').forEach((img) => {
    if (img.dataset.lightboxReady === 'true') return;
    img.dataset.lightboxReady = 'true';
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', () => {
      open(img.src, img.alt || '');
    });
  });

  // 关闭按钮
  if (closeBtn && closeBtn.dataset.ready !== 'true') {
    closeBtn.dataset.ready = 'true';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      close();
    });
  }

  // 灯箱事件只绑定一次
  if (lightbox.dataset.ready === 'true') return;
  lightbox.dataset.ready = 'true';

  // 点击背景关闭（仅当未缩放或点击的是背景而非图片时）
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) close();
  });

  // ESC 关闭
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
  });

  // 滚轮缩放（桌面）
  lightbox.addEventListener('wheel', (e) => {
    if (!lightbox.classList.contains('is-open')) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    scale = Math.max(0.5, Math.min(5, scale + delta));
    applyTransform();
  }, { passive: false });

  // 双击缩放
  lightboxImg.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    if (scale > 1) {
      resetTransform();
    } else {
      scale = 2.5;
      applyTransform();
    }
  });

  // 鼠标拖动（桌面）
  lightboxImg.addEventListener('mousedown', (e) => {
    if (scale <= 1) return;
    e.preventDefault();
    isDragging = true;
    dragStartX = e.clientX - translateX;
    dragStartY = e.clientY - translateY;
    lightboxImg.classList.add('is-dragging');
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging || !lightbox.classList.contains('is-open')) return;
    translateX = e.clientX - dragStartX;
    translateY = e.clientY - dragStartY;
    applyTransform();
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      lightboxImg.classList.remove('is-dragging');
    }
  });

  // 触摸事件（移动端）
  let touchStartX = 0;
  let touchStartY = 0;
  let lastTapTime = 0;

  lightboxImg.addEventListener('touchstart', (e) => {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.touches.length === 1) {
      // 单指：拖动或双击检测
      const now = Date.now();
      if (now - lastTapTime < 300) {
        // 双击
        if (scale > 1) {
          resetTransform();
        } else {
          scale = 2.5;
          applyTransform();
        }
        lastTapTime = 0;
      } else {
        lastTapTime = now;
      }
      if (scale > 1) {
        isDragging = true;
        touchStartX = e.touches[0].clientX - translateX;
        touchStartY = e.touches[0].clientY - translateY;
      }
    } else if (e.touches.length === 2) {
      // 双指：缩放
      isDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDist = Math.sqrt(dx * dx + dy * dy);
      pinchStartScale = scale;
    }
  }, { passive: true });

  lightboxImg.addEventListener('touchmove', (e) => {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.touches.length === 1 && isDragging && scale > 1) {
      e.preventDefault();
      translateX = e.touches[0].clientX - touchStartX;
      translateY = e.touches[0].clientY - touchStartY;
      applyTransform();
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (pinchStartDist > 0) {
        scale = Math.max(0.5, Math.min(5, pinchStartScale * (dist / pinchStartDist)));
        applyTransform();
      }
    }
  }, { passive: false });

  lightboxImg.addEventListener('touchend', () => {
    isDragging = false;
  });
};

const initBackTop = () => {
  document.querySelectorAll<HTMLElement>('[data-back-top]').forEach((button) => {
    if (button.dataset.ready === 'true') return;
    button.dataset.ready = 'true';
    button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  });
};

const initProgress = () => {
  const reader = document.querySelector<HTMLElement>('[data-reader-progress]');
  const tocLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('.toc-panel a[href^="#"]'));
  const headings = tocLinks
    .map((link) => document.getElementById(decodeURIComponent(link.hash.slice(1))))
    .filter(Boolean) as HTMLElement[];
  // Remove previous scroll handler before binding a new one (prevents accumulation across navigations)
  if (progressScrollHandler) {
    window.removeEventListener('scroll', progressScrollHandler);
    progressScrollHandler = null;
  }
  const update = () => {
    // 优先基于文章正文区域计算进度
    const article = document.querySelector('article.post-body, article, .post-body, main#main');
    let progress: number;
    if (article) {
      const rect = article.getBoundingClientRect();
      const articleBottom = rect.bottom;
      // 文章底边进入视口时为 100%
      if (articleBottom <= window.innerHeight) {
        progress = 1;
      } else {
        const articleTop = rect.top + window.scrollY;
        const scrollable = articleTop + rect.height - window.innerHeight;
        progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      }
    } else {
      // 回退到原逻辑
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    }
    if (reader) reader.style.width = `${Math.round(progress * 100)}%`;
    let activeId = '';
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= 140) activeId = heading.id;
    }
    tocLinks.forEach((link) => link.classList.toggle('is-active', Boolean(activeId && link.hash === `#${activeId}`)));
  };
  update();
  window.addEventListener('scroll', update, { passive: true });
  progressScrollHandler = update;
};

const initHeroSnap = () => {
  // Clean up previous page's hero listeners (hero element is page-scoped, not persisted)
  if (heroSnapCleanup) {
    heroSnapCleanup();
    heroSnapCleanup = null;
  }
  const hero = document.querySelector<HTMLElement>('.first-screen');
  if (!hero || hero.dataset.snapReady === 'true') return;
  hero.dataset.snapReady = 'true';
  let locked = false;
  let touchStart = 0;
  const jump = (top: number) => {
    locked = true;
    window.scrollTo({ top, behavior: 'smooth' });
    window.setTimeout(() => {
      locked = false;
    }, 720);
  };
  const onWheel = (event: WheelEvent) => {
    if (locked) return;
    const heroBottom = hero.offsetTop + hero.offsetHeight;
    if (event.deltaY > 20 && window.scrollY < hero.offsetHeight * 0.72) jump(heroBottom);
    if (event.deltaY < -20 && window.scrollY > 80 && window.scrollY < heroBottom + 180) jump(0);
  };
  const onTouchStart = (event: TouchEvent) => {
    touchStart = event.touches[0]?.clientY || 0;
  };
  const onTouchEnd = (event: TouchEvent) => {
    if (locked || !touchStart) return;
    const end = event.changedTouches[0]?.clientY || 0;
    const delta = touchStart - end;
    const heroBottom = hero.offsetTop + hero.offsetHeight;
    if (delta > 46 && window.scrollY < hero.offsetHeight * 0.72) jump(heroBottom);
    if (delta < -46 && window.scrollY > 80 && window.scrollY < heroBottom + 180) jump(0);
  };
  window.addEventListener('wheel', onWheel, { passive: true });
  // 移动端不绑定触摸事件，避免干扰原生滚动
  if (!isMobile()) {
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
  }
  heroSnapCleanup = () => {
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchend', onTouchEnd);
  };
};

// ========== 文章管理页 ==========
const showPostEditor = () => {
  const overlay = document.getElementById('post-editor-overlay');
  if (!overlay) return; // POST_PASSWORD 未配置时组件不渲染
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden'; // 防止背景滚动
  // 重置到密码验证界面
  const auth = document.getElementById('pe-auth');
  const panel = document.getElementById('pe-panel');
  if (auth) auth.style.display = '';
  if (panel) panel.style.display = 'none';
  const pwdInput = document.getElementById('pe-password') as HTMLInputElement;
  if (pwdInput) pwdInput.value = '';
  const err = document.getElementById('pe-error');
  if (err) err.textContent = '';
};

// 轻量级 FPS 检测：每 5 秒采样一次，采样窗口内用 rAF 计数帧数，1 秒后计算 FPS。
// 白天和夜间都运行（不持续运行 rAF 循环，仅在采样窗口内计数）。
// #fps 元素同时作为隐藏入口：连续点击 2 次打开文章管理页。
const initFps = () => {
  const fpsEl = document.querySelector<HTMLElement>('#fps');
  if (!fpsEl || fpsEl.dataset.ready === 'true') return;
  fpsEl.dataset.ready = 'true';

  let frameCount = 0;
  let lastTime = performance.now();
  let rafId: number | null = null;

  const sampleFps = () => {
    frameCount = 0;
    lastTime = performance.now();
    const countFrame = () => {
      frameCount++;
      rafId = requestAnimationFrame(countFrame);
    };
    countFrame();
    window.setTimeout(() => {
      if (rafId) cancelAnimationFrame(rafId);
      const elapsed = (performance.now() - lastTime) / 1000;
      const fps = elapsed > 0 ? Math.round(frameCount / elapsed) : 0;
      fpsEl.textContent = `FPS ${fps}`;
    }, 1000);
  };

  sampleFps();
  window.setInterval(sampleFps, 5000);

  // 保留双击打开文章管理页的隐藏入口
  let clickCount = 0;
  let clickTimer: number | undefined;
  fpsEl.addEventListener('click', () => {
    clickCount++;
    if (clickTimer) clearTimeout(clickTimer);
    clickTimer = window.setTimeout(() => { clickCount = 0; }, 2000);
    if (clickCount >= 2) {
      clickCount = 0;
      showPostEditor();
    }
  });
};

const initPostEditor = () => {
  const overlay = document.getElementById('post-editor-overlay');
  if (!overlay) return; // 未配置 POST_PASSWORD，组件不渲染
  if ((overlay as any).dataset.ready) return;
  (overlay as any).dataset.ready = 'true';

  const auth = document.getElementById('pe-auth');
  const panel = document.getElementById('pe-panel');
  const authBtn = document.getElementById('pe-auth-btn');
  const pwdInput = document.getElementById('pe-password') as HTMLInputElement;
  const errEl = document.getElementById('pe-error');
  const closeAuth = document.getElementById('pe-close-auth');
  const closePanel = document.getElementById('pe-close-panel');
  const newBtn = document.getElementById('pe-new');
  const listView = document.getElementById('pe-list-view');
  const editorView = document.getElementById('pe-editor-view');
  const backBtn = document.getElementById('pe-back');
  const saveBtn = document.getElementById('pe-save');
  const deleteBtn = document.getElementById('pe-delete');
  const copyBtn = document.getElementById('pe-copy');
  const searchInput = document.getElementById('pe-search') as HTMLInputElement;
  const listEl = document.getElementById('pe-list');
  const toastEl = document.getElementById('pe-toast');

  const config = (window as any).__peConfig || {};
  const hasToken = config.hasToken;
  const repo = config.githubRepo;
  const branch = config.githubBranch || 'master';

  // Toast 提示
  const showToast = (msg: string) => {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.style.display = 'block';
    setTimeout(() => { toastEl.style.display = 'none'; }, 3000);
  };

  // 关闭整个管理页
  const closeOverlay = () => {
    overlay.style.display = 'none';
    document.body.style.overflow = ''; // 恢复滚动
  };
  if (closeAuth) closeAuth.addEventListener('click', closeOverlay);
  if (closePanel) closePanel.addEventListener('click', closeOverlay);

  // 加载文章列表
  let allPosts: any[] = [];
  const loadPostList = async () => {
    if (!listEl) return;
    listEl.innerHTML = '<p class="pe-loading">加载中...</p>';
    try {
      // 通过 GitHub API 获取 content/posts/ 目录
      if (hasToken && repo) {
        const resp = await fetch(`https://api.github.com/repos/${repo}/contents/content/posts?ref=${branch}`, {
          headers: { 'Authorization': `token ${(window as any).__peToken}`, 'Accept': 'application/vnd.github.v3+json' }
        });
        if (resp.ok) {
          const files = await resp.json();
          allPosts = files.filter((f: any) => f.name.endsWith('.md')).map((f: any) => ({
            name: f.name,
            path: f.path,
            sha: f.sha,
            url: f.download_url
          }));
          renderList(allPosts);
        } else {
          listEl.innerHTML = '<p class="pe-empty">加载失败，请检查网络或 Token 配置</p>';
        }
      } else {
        // 降级模式：从网站已有的文章列表获取
        const resp = await fetch('/archives/index.html');
        const html = await resp.text();
        // 解析文章列表（从已渲染的归档页面提取）
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const items = doc.querySelectorAll('.archive-item');
        allPosts = Array.from(items).map(item => ({
          title: item.querySelector('strong')?.textContent || '',
          date: item.querySelector('time')?.textContent || '',
          href: item.getAttribute('href') || '',
        }));
        renderList(allPosts);
      }
    } catch (err) {
      listEl.innerHTML = '<p class="pe-empty">加载失败</p>';
    }
  };

  const renderList = (posts: any[]) => {
    if (!listEl) return;
    if (posts.length === 0) {
      listEl.innerHTML = '<p class="pe-empty">暂无文章</p>';
      return;
    }
    listEl.innerHTML = posts.map((p, i) => `
      <div class="pe-list-item" data-index="${i}">
        <span class="pe-list-item-title">${p.title || p.name || '未命名'}</span>
        ${p.date ? `<span class="pe-list-item-date">${p.date}</span>` : ''}
      </div>
    `).join('');
    // 点击编辑
    listEl.querySelectorAll('.pe-list-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.getAttribute('data-index') || '0');
        editPost(allPosts[idx]);
      });
    });
  };

  // 密码验证
  if (authBtn) {
    authBtn.addEventListener('click', () => {
      const pwd = pwdInput?.value || '';
      const expectedPwd = (window as any).__pePassword || '';
      if (pwd === expectedPwd) {
        if (auth) auth.style.display = 'none';
        if (panel) panel.style.display = 'flex';
        loadPostList();
      } else {
        if (errEl) errEl.textContent = '密码错误';
      }
    });
  }

  // 回车验证
  if (pwdInput) {
    pwdInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') authBtn?.click();
    });
  }

  // 搜索
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase();
      const filtered = allPosts.filter(p =>
        (p.title || p.name || '').toLowerCase().includes(q)
      );
      renderList(filtered);
    });
  }

  // 编辑文章
  const editPost = async (post: any) => {
    if (!editorView || !listView) return;
    listView.style.display = 'none';
    editorView.style.display = '';
    if (deleteBtn) deleteBtn.style.display = '';

    const modeLabel = document.getElementById('pe-mode-label');
    if (modeLabel) modeLabel.textContent = '编辑文章';

    // 加载文章内容
    try {
      let content = '';
      if (post.url) {
        const resp = await fetch(post.url);
        content = await resp.text();
        (document.getElementById('pe-file-sha') as HTMLInputElement).value = post.sha || '';
      } else if (post.path && hasToken) {
        const resp = await fetch(`https://api.github.com/repos/${repo}/contents/${post.path}?ref=${branch}`, {
          headers: { 'Authorization': `token ${(window as any).__peToken}`, 'Accept': 'application/vnd.github.v3+json' }
        });
        const data = await resp.json();
        content = atob(data.content.replace(/\n/g, ''));
        (document.getElementById('pe-file-sha') as HTMLInputElement).value = data.sha;
      }

      // 解析 frontmatter
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (fmMatch) {
        const fm = fmMatch[1];
        const body = fmMatch[2];
        const getFmValue = (key: string) => {
          const m = fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
          return m ? m[1].replace(/^["']|["']$/g, '') : '';
        };
        const getFmArray = (key: string) => {
          const items: string[] = [];
          const regex = new RegExp(`^${key}:\\n((?:  - .+\\n?)*)`, 'm');
          const m = fm.match(regex);
          if (m) {
            const lines = m[1].match(/  - (.+)/g);
            if (lines) lines.forEach(l => items.push(l.replace('  - ', '')));
          }
          return items;
        };

        (document.getElementById('pe-title') as HTMLInputElement).value = getFmValue('title');
        (document.getElementById('pe-categories') as HTMLInputElement).value = getFmArray('categories').join(', ');
        (document.getElementById('pe-tags') as HTMLInputElement).value = getFmArray('tags').join(', ');
        (document.getElementById('pe-description') as HTMLInputElement).value = getFmValue('description');
        (document.getElementById('pe-body') as HTMLTextAreaElement).value = body;
        (document.getElementById('pe-original-date') as HTMLInputElement).value = getFmValue('date');
        (document.getElementById('pe-file-path') as HTMLInputElement).value = post.path || `content/posts/${post.name}`;

        const sticky = getFmValue('sticky');
        const cover = getFmValue('cover') || getFmValue('top_img');
        (document.getElementById('pe-sticky') as HTMLInputElement).value = sticky || '0';
        (document.getElementById('pe-cover') as HTMLInputElement).value = cover;
      }
    } catch (err) {
      showToast('加载文章失败');
    }
  };

  // 新建文章
  if (newBtn) {
    newBtn.addEventListener('click', () => {
      if (!editorView || !listView) return;
      listView.style.display = 'none';
      editorView.style.display = '';
      if (deleteBtn) deleteBtn.style.display = 'none';

      const modeLabel = document.getElementById('pe-mode-label');
      if (modeLabel) modeLabel.textContent = '新建文章';

      // 清空表单
      (document.getElementById('pe-title') as HTMLInputElement).value = '';
      (document.getElementById('pe-categories') as HTMLInputElement).value = '';
      (document.getElementById('pe-tags') as HTMLInputElement).value = '';
      (document.getElementById('pe-description') as HTMLInputElement).value = '';
      (document.getElementById('pe-body') as HTMLTextAreaElement).value = '';
      (document.getElementById('pe-file-path') as HTMLInputElement).value = '';
      (document.getElementById('pe-file-sha') as HTMLInputElement).value = '';
      (document.getElementById('pe-original-date') as HTMLInputElement).value = '';
    });
  }

  // 返回列表
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (!editorView || !listView) return;
      editorView.style.display = 'none';
      listView.style.display = '';
    });
  }

  // 生成 markdown
  const generateMarkdown = () => {
    const title = (document.getElementById('pe-title') as HTMLInputElement).value;
    const categories = (document.getElementById('pe-categories') as HTMLInputElement).value.split(/[,，]/).map(s => s.trim()).filter(Boolean);
    const tags = (document.getElementById('pe-tags') as HTMLInputElement).value.split(/[,，]/).map(s => s.trim()).filter(Boolean);
    const description = (document.getElementById('pe-description') as HTMLInputElement).value;
    const body = (document.getElementById('pe-body') as HTMLTextAreaElement).value;
    const originalDate = (document.getElementById('pe-original-date') as HTMLInputElement).value;
    const sticky = (document.getElementById('pe-sticky') as HTMLInputElement).value;
    const cover = (document.getElementById('pe-cover') as HTMLInputElement).value;

    const now = new Date();
    const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;

    let fm = '---\n';
    fm += `title: ${title}\n`;
    if (tags.length) { fm += 'tags:\n'; tags.forEach(t => fm += `  - ${t}\n`); }
    if (categories.length) { fm += 'categories:\n'; categories.forEach(c => fm += `  - ${c}\n`); }
    if (description) fm += `description: "${description}"\n`;
    if (cover) fm += `cover: ${cover}\n`;
    if (sticky && sticky !== '0') fm += `sticky: ${sticky}\n`;
    if (originalDate) fm += `date: ${originalDate}\n`;
    fm += `updated: ${fmtDate(now)}\n`;
    if (!originalDate) fm += `date: ${fmtDate(now)}\n`;
    fm += `abbrlink: ${Date.now()}\n`;
    fm += '---\n\n';
    fm += body;
    return { content: fm, title };
  };

  // 保存到 GitHub
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const { content, title } = generateMarkdown();
      const filePath = (document.getElementById('pe-file-path') as HTMLInputElement).value;
      const sha = (document.getElementById('pe-file-sha') as HTMLInputElement).value;

      // 生成文件名
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      const fileName = filePath || `content/posts/${dateStr}-${title}.md`;

      if (hasToken && repo) {
        saveBtn.textContent = '保存中...';
        saveBtn.setAttribute('disabled', 'true');
        try {
          const resp = await fetch(`https://api.github.com/repos/${repo}/contents/${fileName}`, {
            method: 'PUT',
            headers: {
              'Authorization': `token ${(window as any).__peToken}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: `${sha ? '更新' : '新建'}文章: ${title}`,
              content: btoa(unescape(encodeURIComponent(content))),
              sha: sha || undefined,
              branch: branch
            })
          });
          if (resp.ok) {
            showToast('保存成功！等待自动部署...');
            saveBtn.textContent = '保存到 GitHub';
            saveBtn.removeAttribute('disabled');
            // 刷新列表
            setTimeout(() => loadPostList(), 2000);
          } else {
            const err = await resp.json();
            showToast(`保存失败: ${err.message || '未知错误'}`);
            saveBtn.textContent = '保存到 GitHub';
            saveBtn.removeAttribute('disabled');
          }
        } catch (err) {
          showToast('网络错误，保存失败');
          saveBtn.textContent = '保存到 GitHub';
          saveBtn.removeAttribute('disabled');
        }
      } else {
        // 降级：复制 markdown
        navigator.clipboard.writeText(content).then(() => {
          showToast('Markdown 已复制到剪贴板');
        }).catch(() => {
          showToast('复制失败，请手动复制');
        });
      }
    });
  }

  // 删除文章
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      const filePath = (document.getElementById('pe-file-path') as HTMLInputElement).value;
      const sha = (document.getElementById('pe-file-sha') as HTMLInputElement).value;
      if (!filePath || !sha) { showToast('无法删除：缺少文件信息'); return; }
      if (!confirm('确定删除这篇文章吗？此操作不可撤销。')) return;

      if (hasToken && repo) {
        try {
          const resp = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `token ${(window as any).__peToken}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: `删除文章: ${filePath}`,
              sha: sha,
              branch: branch
            })
          });
          if (resp.ok) {
            showToast('删除成功！等待自动部署...');
            setTimeout(() => {
              if (editorView) editorView.style.display = 'none';
              if (listView) listView.style.display = '';
              loadPostList();
            }, 2000);
          } else {
            showToast('删除失败');
          }
        } catch (err) {
          showToast('网络错误');
        }
      } else {
        showToast('未配置 GitHub Token，无法删除');
      }
    });
  }

  // 复制 markdown
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const { content } = generateMarkdown();
      navigator.clipboard.writeText(content).then(() => {
        showToast('Markdown 已复制到剪贴板');
      }).catch(() => {
        showToast('复制失败');
      });
    });
  }
};

const initRuntimeDays = () => {
  const el = document.querySelector<HTMLElement>('#runtime-days');
  if (!el) return;
  const start = new Date(el.dataset.siteStart || '2023-01-01T00:00:00+08:00').getTime();
  const days = Math.max(1, Math.floor((Date.now() - start) / 86400000) + 1);
  el.textContent = `运行 ${days} 天`;
};

const initCursor = () => {
  const dot = document.querySelector<HTMLElement>('.cursor-dot');
  if (!dot || dot.dataset.ready === 'true') return;
  dot.dataset.ready = 'true';

  // 首屏背景光标联动：光标往左背景高光往右（反向视差），光标不动时恢复默认
  const heroVignette = document.querySelector<HTMLElement>('.hero-vignette');
  let heroTargetX = 52; // 目标百分比
  let heroTargetY = 68;
  let heroCurrentX = 52; // 当前百分比（用于平滑插值）
  let heroCurrentY = 68;
  let heroLastMoveTime = 0;
  let heroRafId = 0;
  const heroAnimate = () => {
    // 平滑插值：当前值向目标值靠近
    heroCurrentX += (heroTargetX - heroCurrentX) * 0.08;
    heroCurrentY += (heroTargetY - heroCurrentY) * 0.08;
    if (heroVignette) {
      heroVignette.style.setProperty('--cursor-px', `${heroCurrentX.toFixed(2)}%`);
      heroVignette.style.setProperty('--cursor-py', `${heroCurrentY.toFixed(2)}%`);
    }
    // 光标静止超过 1.2 秒，目标值缓慢回归默认
    if (Date.now() - heroLastMoveTime > 1200) {
      heroTargetX += (52 - heroTargetX) * 0.02;
      heroTargetY += (68 - heroTargetY) * 0.02;
    }
    heroRafId = requestAnimationFrame(heroAnimate);
  };

  // 使用 requestAnimationFrame 批量处理 transform 更新，避免同步布局
  let pendingX = 0, pendingY = 0, needsUpdate = false;
  window.addEventListener('pointermove', (event) => {
    pendingX = event.clientX;
    pendingY = event.clientY;
    if (!needsUpdate) {
      needsUpdate = true;
      requestAnimationFrame(() => {
        dot.style.transform = `translate3d(${pendingX}px, ${pendingY}px, 0)`;
        needsUpdate = false;
      });
    }
    // 只在 cursor-active 未设置时才设置，避免每帧都 toggle
    if (!document.body.classList.contains('cursor-active')) {
      document.body.classList.add('cursor-active');
    }
    // 夜间模式下与粒子交互
    const state = window.__yuncanParticles;
    if (state) {
      state.mouseX = (pendingX / window.innerWidth) * 2 - 1;
      state.mouseY = -(pendingY / window.innerHeight) * 2 + 1;
    }
    // 首屏背景光标联动：反向映射（光标往左→背景高光往右），幅度 ±18%
    if (heroVignette) {
      const nx = pendingX / window.innerWidth;  // 0~1
      const ny = pendingY / window.innerHeight; // 0~1
      heroTargetX = 52 + (0.5 - nx) * 36; // 反向：光标在左(nx小)→目标>52
      heroTargetY = 68 + (0.5 - ny) * 24; // 反向：光标在上(ny小)→目标>68
      heroLastMoveTime = Date.now();
      if (!heroRafId) heroRafId = requestAnimationFrame(heroAnimate);
    }
  }, { passive: true });
  window.addEventListener('mousedown', () => document.body.classList.add('cursor-down'), { passive: true });
  window.addEventListener('mouseup', () => document.body.classList.remove('cursor-down'), { passive: true });
  // 缓存上次检查的 target，避免重复 closest 调用
  let lastOver: HTMLElement | null = null;
  let lastLink = false;
  document.addEventListener('pointerover', (event) => {
    const target = event.target as HTMLElement;
    if (target === lastOver) return;
    lastOver = target;
    const isLink = Boolean(target.closest('a, button, input, textarea, select, [role="button"]'));
    if (isLink !== lastLink) {
      lastLink = isLink;
      document.body.classList.toggle('cursor-link', isLink);
    }
  }, { passive: true });
  // 页面隐藏时重置光标状态，避免切回窗口后首次点击卡住
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      document.body.classList.remove('cursor-active', 'cursor-down', 'cursor-link');
      lastOver = null;
      lastLink = false;
      needsUpdate = false;
    }
  });
};

const initCodeCopy = () => {
  document.querySelectorAll<HTMLButtonElement>('[data-copy-code]').forEach((button) => {
    if (button.dataset.ready === 'true') return;
    button.dataset.ready = 'true';
    button.addEventListener('click', async () => {
      const code = button.closest('.code-frame')?.querySelector('code')?.textContent || '';
      await navigator.clipboard?.writeText(code).catch(() => undefined);
      const old = button.textContent;
      button.textContent = '已复制';
      window.setTimeout(() => {
        button.textContent = old || '复制';
      }, 1200);
    });
  });
};

const initContextMenu = () => {
  // 使用 window 标志确保 document/window 级监听只绑定一次，页面切换后依然生效。
  // 菜单点击通过事件委托在 document 上处理，避免菜单元素被替换后监听器丢失。
  if (window.__yuncanContextMenu) return;
  window.__yuncanContextMenu = true;

  const getMenu = () => document.querySelector<HTMLElement>('#context-menu');
  const hide = () => {
    const menu = getMenu();
    if (!menu) return;
    menu.classList.remove('show');
    menu.setAttribute('aria-hidden', 'true');
  };

  document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    const menu = getMenu();
    if (!menu) return;
    const width = menu.offsetWidth || 240;
    const height = menu.offsetHeight || 180;
    const x = Math.min(event.clientX, window.innerWidth - width - 12);
    const y = Math.min(event.clientY, window.innerHeight - height - 12);
    menu.style.left = `${Math.max(12, x)}px`;
    menu.style.top = `${Math.max(12, y)}px`;
    menu.classList.add('show');
    menu.setAttribute('aria-hidden', 'false');
  });

  document.addEventListener('click', async (event) => {
    const menu = getMenu();
    if (!menu) return;
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-context-action]');
    // 点击菜单项：执行操作并隐藏
    if (button && menu.contains(button)) {
      const action = button.dataset.contextAction;
      if (action === 'back') history.back();
      else if (action === 'forward') history.forward();
      else if (action === 'reload') location.reload();
      else if (action === 'top') window.scrollTo({ top: 0, behavior: 'smooth' });
      else if (action === 'comment') document.querySelector('#post-comment, #twikoo-wrap')?.scrollIntoView({ behavior: 'smooth' });
      else if (action === 'theme') {
        const root = document.documentElement;
        const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
        root.dataset.theme = next;
        localStorage.setItem('yuncan-theme', next);
      }
      else if (action === 'print') window.print();
      else if (action === 'copy-url') await navigator.clipboard?.writeText(location.href).catch(() => undefined);
      hide();
      return;
    }
    // 点击菜单外部：隐藏
    hide();
  }, { passive: true });

  window.addEventListener('scroll', hide, { passive: true });
};

const initPostActions = () => {
  document.querySelectorAll<HTMLButtonElement>('[data-share-current]').forEach((button) => {
    if (button.dataset.ready === 'true') return;
    button.dataset.ready = 'true';
    button.addEventListener('click', async () => {
      await navigator.clipboard?.writeText(location.href).catch(() => undefined);
      button.classList.add('is-copied');
      const old = button.innerHTML;
      button.textContent = '已复制';
      window.setTimeout(() => {
        button.classList.remove('is-copied');
        button.innerHTML = old;
      }, 1300);
    });
  });

  const dialog = document.querySelector<HTMLElement>('[data-reward-dialog]');
  const openButtons = document.querySelectorAll<HTMLButtonElement>('[data-reward-toggle]');
  const closeButtons = document.querySelectorAll<HTMLButtonElement>('[data-reward-close]');
  if (!dialog) return;
  const open = () => {
    dialog.classList.add('is-open');
    dialog.setAttribute('aria-hidden', 'false');
    document.body.classList.add('reward-lock');
  };
  const close = () => {
    dialog.classList.remove('is-open');
    dialog.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('reward-lock');
  };
  openButtons.forEach((button) => {
    if (button.dataset.ready === 'true') return;
    button.dataset.ready = 'true';
    button.addEventListener('click', open);
  });
  closeButtons.forEach((button) => {
    if (button.dataset.ready === 'true') return;
    button.dataset.ready = 'true';
    button.addEventListener('click', close);
  });
};

const initMusic = async () => {
  const dock = document.querySelector<HTMLElement>('.music-dock');
  if (!dock) return;
  const config = JSON.parse(dock.dataset.music || '{}') as MusicConfig;
  const audio = dock.querySelector<HTMLAudioElement>('[data-music-audio]');
  const playButtons = Array.from(dock.querySelectorAll<HTMLButtonElement>('[data-music-play]'));
  const title = dock.querySelector<HTMLElement>('[data-music-title]');
  const artist = dock.querySelector<HTMLElement>('[data-music-artist]');
  const lyric = dock.querySelector<HTMLElement>('[data-music-lyric]');
  const cover = dock.querySelector<HTMLImageElement>('.music-cover img');
  const prev = dock.querySelector<HTMLButtonElement>('[data-music-prev]');
  const next = dock.querySelector<HTMLButtonElement>('[data-music-next]');
  const list = dock.querySelector<HTMLElement>('[data-music-list]');
  if (!audio || !playButtons.length) return;

  const state = window.__yuncanMusicState || { tracks: [], currentIndex: 0, lrc: [] };
  window.__yuncanMusicState = state;

  const loadLrc = async (value = '') => {
    if (!value) return [];
    if (/^https?:\/\//.test(value)) {
      try {
        const res = await fetch(value);
        return parseLrc(await res.text());
      } catch {
        return [];
      }
    }
    return parseLrc(value);
  };

  const renderQueue = () => {
    if (!list) return;
    if (!state.tracks.length) {
      list.innerHTML = '<p class="music-empty">歌单正在路上</p>';
      return;
    }
    list.innerHTML = state.tracks
      .slice(0, 48)
      .map((track, index) => {
        const active = index === state.currentIndex ? ' is-active' : '';
        const artistName = track.author || track.artist || 'Unknown';
        return `<button type="button" class="music-track${active}" data-music-index="${index}"><span>${String(index + 1).padStart(2, '0')}</span><strong>${track.title || 'Music'}</strong><em>${artistName}</em></button>`;
      })
      .join('');
  };

  const applyTrack = async (index: number, keepTime = false) => {
    const track = state.tracks[index];
    if (!track) return;
    state.currentIndex = index;
    if (audio.dataset.trackIndex !== String(index)) {
      audio.src = track.url;
      audio.dataset.trackIndex = String(index);
      if (keepTime && state.currentTime) audio.currentTime = state.currentTime;
    }
    if (title) title.textContent = track.title || 'Music';
    if (artist) artist.textContent = track.author || track.artist || 'Unknown';
    if (cover) cover.src = track.pic || track.cover || config.fallbackCover;
    if (lyric) lyric.textContent = '歌词同步中';
    state.lrc = await loadLrc(track.lrc || '');
    if (lyric && !state.lrc.length) lyric.textContent = '这首歌暂时没有歌词';
    renderQueue();
  };

  const playCurrent = async () => {
    if (!state.tracks.length) return;
    await applyTrack(state.currentIndex, true);
    await audio
      .play()
      .then(() => {
        dock.classList.add('playing');
        state.wasPlaying = true;
      })
      .catch(() => {
        dock.classList.remove('playing');
        state.wasPlaying = false;
        if (lyric) lyric.textContent = '浏览器拦截了自动播放，点封面继续';
      });
  };

  if (!state.tracks.length && !state.loading) {
    state.loading = (async () => {
      try {
        const res = await fetch(buildMusicUrl(config), { mode: 'cors' });
        const data = await res.json();
        state.tracks = Array.isArray(data) ? data.filter((item) => item.url) : [];
      } catch {
        state.tracks = [];
      }
    })();
  }

  renderQueue();
  if (state.loading) await state.loading;
  if (!state.tracks.length) {
    if (lyric) lyric.textContent = '歌单接口暂时没有返回可播放曲目';
    renderQueue();
    return;
  }

  await applyTrack(state.currentIndex, true);
  dock.classList.toggle('playing', !audio.paused);
  renderQueue();

  playButtons.forEach((play) => {
    if (play.dataset.ready === 'true') return;
    play.dataset.ready = 'true';
    play.addEventListener('click', async () => {
      if (!audio.src) await applyTrack(state.currentIndex, true);
      if (audio.paused) {
        await audio
          .play()
          .then(() => {
            dock.classList.add('playing');
            state.wasPlaying = true;
          })
          .catch(() => {
            if (lyric) lyric.textContent = '播放被浏览器拦截，再点一次试试';
          });
      } else {
        audio.pause();
        dock.classList.remove('playing');
        state.wasPlaying = false;
      }
    });
  });

  if (next && next.dataset.ready !== 'true') {
    next.dataset.ready = 'true';
    next.addEventListener('click', async () => {
      state.currentIndex = (state.currentIndex + 1) % state.tracks.length;
      state.currentTime = 0;
      await playCurrent();
    });
  }

  if (prev && prev.dataset.ready !== 'true') {
    prev.dataset.ready = 'true';
    prev.addEventListener('click', async () => {
      if (!state.tracks.length) return;
      state.currentIndex =
        (state.currentIndex - 1 + state.tracks.length) % state.tracks.length;
      state.currentTime = 0;
      await playCurrent();
    });
  }

  if (list && list.dataset.ready !== 'true') {
    list.dataset.ready = 'true';
    list.addEventListener('click', async (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-music-index]');
      if (!button) return;
      state.currentIndex = Number(button.dataset.musicIndex || 0);
      state.currentTime = 0;
      await playCurrent();
    });
  }

  if (audio.dataset.ready !== 'true') {
    audio.dataset.ready = 'true';
    audio.addEventListener('ended', async () => {
      state.currentIndex = (state.currentIndex + 1) % state.tracks.length;
      state.currentTime = 0;
      await playCurrent();
    });
    audio.addEventListener('pause', () => {
      state.wasPlaying = false;
      dock.classList.remove('playing');
    });
    audio.addEventListener('play', () => {
      state.wasPlaying = true;
      dock.classList.add('playing');
    });
    audio.addEventListener('timeupdate', () => {
      state.currentTime = audio.currentTime;
      if (!lyric || !state.lrc.length) return;
      const line = [...state.lrc].reverse().find((item) => item.time <= audio.currentTime);
      const lyricText = line?.text || '';
      if (lyricText) lyric.textContent = lyricText;

      // 歌词栏更新（仅更新文本，不强制显示）
      const lyricBar = document.getElementById('lyric-bar');
      const lyricBarText = document.querySelector<HTMLElement>('[data-lyric-text]');
      if (lyricBar && lyricBarText) {
        lyricBarText.textContent = lyricText || '暂无歌词';
        // 仅在未被用户关闭时才显示歌词栏
        if (sessionStorage.getItem('lyric-bar-closed') !== '1') {
          lyricBar.classList.add('is-active');
        }
      }
    });
  }

  if (config.autoplay && !state.triedAutoplay) {
    state.triedAutoplay = true;
    // 移动端不自动播放（浏览器限制 + 流量考虑），仅桌面端自动播放
    if (!isMobile()) {
      await playCurrent();
    }
  } else if (state.wasPlaying && audio.paused) {
    await playCurrent();
  }
};

const initThree = async () => {
  if (window.__yuncanThree) return;
  const canvas = document.querySelector<HTMLCanvasElement>('#breath-scene');
  if (!canvas) return;
  window.__yuncanThree = true;

  const THREE = await import('three');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 8;

  const isDark = () => document.documentElement.dataset.theme === 'dark';

  // 光标排斥状态：由 initCursor 的 mousemove 回调写入，夜间模式下驱动粒子避开光标
  const particleState = { mouseX: 0, mouseY: 0 };
  window.__yuncanParticles = particleState;

  // 粒子数量：桌面端 320，移动端降到 120 保证流畅
  const COUNT = isMobile() ? 120 : 320;
  const WORLD_H = 14;
  const origins = new Float32Array(COUNT * 3);
  const sizes = new Float32Array(COUNT);
  const speeds = new Float32Array(COUNT);
  const phases = new Float32Array(COUNT);
  const colorWarm = new Float32Array(COUNT * 3);
  const colorCool = new Float32Array(COUNT * 3);

  for (let i = 0; i < COUNT; i += 1) {
    origins[i * 3] = (Math.random() - 0.5) * 20;
    origins[i * 3 + 1] = (Math.random() - 0.5) * WORLD_H;
    origins[i * 3 + 2] = (Math.random() - 0.5) * 6;
    sizes[i] = Math.random() * 0.7 + 0.25;
    speeds[i] = Math.random() * 0.35 + 0.12;
    phases[i] = Math.random() * Math.PI * 2;

    // 白天：暖色与冷色混合，避免全黄
    const wr = Math.random();
    if (wr < 0.3) { colorWarm[i * 3] = 1.0; colorWarm[i * 3 + 1] = 0.78; colorWarm[i * 3 + 2] = 0.32; }
    else if (wr < 0.5) { colorWarm[i * 3] = 1.0; colorWarm[i * 3 + 1] = 0.92; colorWarm[i * 3 + 2] = 0.55; }
    else if (wr < 0.75) { colorWarm[i * 3] = 0.9; colorWarm[i * 3 + 1] = 0.95; colorWarm[i * 3 + 2] = 1.0; }
    else { colorWarm[i * 3] = 0.6; colorWarm[i * 3 + 1] = 0.8; colorWarm[i * 3 + 2] = 1.0; }

    // 夜间：蓝色、紫色、白色
    const cr = Math.random();
    if (cr < 0.4) { colorCool[i * 3] = 0.4; colorCool[i * 3 + 1] = 0.62; colorCool[i * 3 + 2] = 1.0; }
    else if (cr < 0.7) { colorCool[i * 3] = 0.62; colorCool[i * 3 + 1] = 0.42; colorCool[i * 3 + 2] = 1.0; }
    else { colorCool[i * 3] = 0.95; colorCool[i * 3 + 1] = 0.95; colorCool[i * 3 + 2] = 1.0; }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(origins, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute('aColorWarm', new THREE.BufferAttribute(colorWarm, 3));
  geometry.setAttribute('aColorCool', new THREE.BufferAttribute(colorCool, 3));

  const uniforms = {
    uTime: { value: 0 },
    uDark: { value: isDark() ? 1 : 0 },
    uPixelRatio: { value: renderer.getPixelRatio() },
    uWorldH: { value: WORLD_H },
    uMouse: { value: new THREE.Vector2(0, 0) }
  };

  // 所有逐粒子计算（上升、漂浮、闪烁）都在 GPU 顶点着色器完成，CPU 仅更新时间
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms,
    vertexShader: `
      attribute float aSize;
      attribute float aSpeed;
      attribute float aPhase;
      attribute vec3 aColorWarm;
      attribute vec3 aColorCool;
      varying vec3 vColor;
      varying float vTwinkle;
      uniform float uTime;
      uniform float uDark;
      uniform float uPixelRatio;
      uniform float uWorldH;
      uniform vec2 uMouse;
      void main() {
        // 白天气泡快速上升，夜间星星缓慢漂浮
        float rise = mod(position.y + uTime * aSpeed * mix(1.0, 0.15, uDark) + uWorldH * 0.5, uWorldH) - uWorldH * 0.5;
        vec3 pos = vec3(
          position.x + sin(uTime * 0.3 + aPhase) * 0.5,
          rise,
          position.z + cos(uTime * 0.18 + aPhase) * 0.3
        );
        // 光标排斥：夜间模式下粒子避开鼠标位置
        vec2 toMouse = pos.xy - uMouse;
        float dist = max(length(toMouse), 0.001);
        float repel = 1.0 - smoothstep(0.0, 3.0, dist);
        pos.xy += (toMouse / dist) * repel * 0.9;
        // 颜色：白天暖色 / 夜间冷色
        vColor = mix(aColorWarm, aColorCool, uDark);
        // 闪烁：白天温和呼吸，夜间明显闪烁
        float twinkle = 0.55 + 0.45 * sin(uTime * 2.2 + aPhase * 3.5);
        vTwinkle = mix(0.75 + 0.15 * sin(uTime * 0.8 + aPhase), twinkle, uDark);
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = aSize * uPixelRatio * (300.0 / -mvPosition.z) * (0.7 + 0.3 * twinkle);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float dist = length(p);
        if (dist > 0.5) discard;
        float glow = smoothstep(0.5, 0.0, dist);
        float core = smoothstep(0.16, 0.0, dist);
        vec3 color = vColor * (glow * 0.8 + core * 1.0);
        float alpha = (glow * 0.85 + core * 0.5) * vTwinkle;
        gl_FragColor = vec4(color, alpha);
      }
    `
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  // 流星（仅夜间），用 LineSegments 表示拖尾
  const MAX_METEORS = 3;
  type Meteor = { active: boolean; x: number; y: number; vx: number; vy: number; life: number; maxLife: number };
  const meteorState: Meteor[] = [];
  for (let i = 0; i < MAX_METEORS; i += 1) {
    meteorState.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0 });
  }
  const meteorPositions = new Float32Array(MAX_METEORS * 2 * 3);
  const meteorGeom = new THREE.BufferGeometry();
  meteorGeom.setAttribute('position', new THREE.BufferAttribute(meteorPositions, 3));
  const meteorMat = new THREE.LineBasicMaterial({ color: 0xb0c8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const meteorLines = new THREE.LineSegments(meteorGeom, meteorMat);
  meteorLines.frustumCulled = false;
  scene.add(meteorLines);

  let viewW = 10;
  let viewH = 8;
  const resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    viewH = 2 * Math.tan((camera.fov * Math.PI) / 180 / 2) * camera.position.z;
    viewW = viewH * camera.aspect;
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });

  let rafId: number | null = null;
  const startAnimation = () => {
    if (rafId === null && isDark()) {
      rafId = requestAnimationFrame(animate);
    }
  };
  new MutationObserver(() => {
    uniforms.uDark.value = isDark() ? 1 : 0;
    startAnimation();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  const startTime = performance.now();
  let lastFrame = startTime;
  let nextMeteorTime = 2 + Math.random() * 3;

  const spawnMeteor = (m: Meteor) => {
    m.active = true;
    m.x = (Math.random() - 0.2) * viewW * 0.8;
    m.y = viewH * 0.4 + Math.random() * 2;
    const angle = -Math.PI / 4 + (Math.random() - 0.5) * 0.4;
    const speed = 12 + Math.random() * 8;
    m.vx = Math.cos(angle) * speed;
    m.vy = Math.sin(angle) * speed;
    m.maxLife = 1.2 + Math.random() * 0.8;
    m.life = m.maxLife;
  };

  // requestAnimationFrame 自适应调度，使用真实 delta time，FPS 节流约 36fps 减少 GPU 压力
  const TARGET_INTERVAL = 1000 / 36; // 约 27.8ms
  let lastFrameTime = 0;
  const animate = (time: number) => {
    // 白天模式停止 rAF 循环，由 MutationObserver 在切回夜间时重启
    if (!isDark()) {
      rafId = null;
      return;
    }
    const delta = time - lastFrameTime;
    if (delta < TARGET_INTERVAL) {
      rafId = requestAnimationFrame(animate);
      return;
    }
    lastFrameTime = time - (delta % TARGET_INTERVAL);

    const now = performance.now();
    const dt = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    const t = (now - startTime) / 1000;
    uniforms.uTime.value = t;
    // 更新光标位置（夜间模式下驱动粒子排斥），归一化坐标映射到可视世界范围
    uniforms.uMouse.value.set(particleState.mouseX * viewW * 0.5, particleState.mouseY * viewH * 0.5);

    const dark = isDark();
    meteorMat.opacity = dark ? 0.85 : 0;
    if (dark && t > nextMeteorTime) {
      nextMeteorTime = t + 2.5 + Math.random() * 4;
      const free = meteorState.find((m) => !m.active);
      if (free) spawnMeteor(free);
    }

    for (let i = 0; i < MAX_METEORS; i += 1) {
      const m = meteorState[i];
      if (m.active) {
        m.life -= dt;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (m.life <= 0) m.active = false;
      }
      const base = i * 6;
      if (m.active) {
        const trailLen = 1.5;
        const speedInv = 1 / Math.hypot(m.vx, m.vy);
        meteorPositions[base] = m.x;
        meteorPositions[base + 1] = m.y;
        meteorPositions[base + 2] = 0;
        meteorPositions[base + 3] = m.x - m.vx * speedInv * trailLen;
        meteorPositions[base + 4] = m.y - m.vy * speedInv * trailLen;
        meteorPositions[base + 5] = 0;
      } else {
        meteorPositions[base] = 0;
        meteorPositions[base + 1] = 0;
        meteorPositions[base + 2] = 0;
        meteorPositions[base + 3] = 0;
        meteorPositions[base + 4] = 0;
        meteorPositions[base + 5] = 0;
      }
    }
    meteorGeom.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
    rafId = requestAnimationFrame(animate);
  };
  startAnimation();
};

const initSettings = () => {
  const panel = document.getElementById('settings-popup');
  const toggle = document.querySelector<HTMLElement>('[data-settings-toggle]');
  if (!panel || !toggle) return;

  // 每次重置弹窗状态
  panel.style.display = 'none';

  // 设置项映射
  const fontSizeMap: Record<string, string> = {
    small: '14px',
    medium: '16px',
    large: '18px',
    xlarge: '20px'
  };
  const fontFamilyMap: Record<string, string> = {
    default: '',
    JinghuaLaosong: "'JinghuaLaosong', serif",
    LXGWWenKai: "'LXGWWenKai', serif",
    SourceHanSansOLD: "'SourceHanSansOLD', sans-serif",
    FZYanSong: "'FZYanSong', serif"
  };
  const envBgApi = import.meta.env.PUBLIC_BG_IMAGE_API || '';
  const bgImageMap: Record<string, string> = {
    default: '',
    none: 'none',
    bing: 'https://bing.ee123.net/img/rand',
    random: 'https://wp.upx8.com/api.php',
    custom: envBgApi
  };

  const getDefault = (key: string): string => {
    const defaults: Record<string, string> = {
      fontSize: 'medium', fontFamily: 'default', bgImage: 'default'
    };
    return defaults[key] || '';
  };

  // 应用设置到 DOM
  const applySettings = () => {
    const fontSize = localStorage.getItem('setting-fontSize') || 'medium';
    const fontFamily = localStorage.getItem('setting-fontFamily') || 'default';
    const bgImage = localStorage.getItem('setting-bgImage') || 'default';

    // 字体大小
    document.documentElement.style.fontSize = fontSizeMap[fontSize] || '16px';

    // 字体族
    if (fontFamily !== 'default') {
      document.body.style.fontFamily = fontFamilyMap[fontFamily] || '';
    } else {
      document.body.style.fontFamily = '';
    }

    // 背景图片
    const bgEl = document.querySelector('.global-bg') as HTMLElement;
    if (bgEl) {
      if (bgImage === 'none') {
        bgEl.style.backgroundImage = 'none';
      } else if (bgImage === 'bing' || bgImage === 'random') {
        bgEl.style.backgroundImage = `url("${bgImageMap[bgImage]}")`;
        bgEl.style.backgroundSize = 'cover';
        bgEl.style.backgroundPosition = 'center';
        bgEl.style.backgroundAttachment = 'fixed';
      } else {
        bgEl.style.backgroundImage = '';
        bgEl.style.backgroundSize = '';
        bgEl.style.backgroundPosition = '';
        bgEl.style.backgroundAttachment = '';
      }
    }

    // 更新按钮 active 状态
    document.querySelectorAll('[data-setting]').forEach((group) => {
      const setting = group.getAttribute('data-setting');
      if (!setting) return;
      const value = localStorage.getItem(`setting-${setting}`) || getDefault(setting);
      group.querySelectorAll('.setting-opt').forEach((btn) => {
        btn.classList.toggle('active', btn.getAttribute('data-value') === value);
      });
    });
  };

  // 每次都应用设置（从 localStorage 恢复）
  applySettings();

  // 防重复绑定（参照 initTheme 模式）
  if (toggle.dataset.ready === 'true') return;
  toggle.dataset.ready = 'true';

  // 以下是事件绑定（只执行一次）
  const close = document.querySelector('[data-settings-close]');
  const reset = document.querySelector('[data-settings-reset]');

  const togglePanel = () => {
    const isShown = panel.style.display !== 'none';
    panel.style.display = isShown ? 'none' : 'block';
  };

  toggle.addEventListener('click', (e) => { e.stopPropagation(); togglePanel(); });

  if (close) {
    close.addEventListener('click', () => { panel.style.display = 'none'; });
  }

  // document 点击外部关闭
  document.addEventListener('click', (e) => {
    if (panel.style.display !== 'none' && !panel.contains(e.target as Node) && !toggle.contains(e.target as Node)) {
      panel.style.display = 'none';
    }
  });

  // setting-opt 按钮
  document.querySelectorAll('.setting-opt').forEach((btn) => {
    btn.addEventListener('click', function(this: Element) {
      const group = this.closest('[data-setting]');
      if (!group) return;
      const setting = group.getAttribute('data-setting');
      if (!setting) return;
      const value = this.getAttribute('data-value');
      if (value) {
        localStorage.setItem(`setting-${setting}`, value);
        applySettings();
      }
    });
  });

  // 恢复默认
  if (reset) {
    reset.addEventListener('click', () => {
      ['fontSize', 'fontFamily', 'bgImage'].forEach(key => {
        localStorage.removeItem(`setting-${key}`);
      });
      applySettings();
    });
  }
};

let firstBoot = true;

const initImageCursorEffect = () => {
  const images = document.querySelectorAll<HTMLImageElement>('article img, .post-body img');
  images.forEach((img) => {
    if (img.dataset.cursorReady === 'true') return;
    img.dataset.cursorReady = 'true';

    img.addEventListener('pointermove', (e) => {
      const rect = img.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;  // -0.5 to 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      const maxTilt = 6; // 最大倾斜角度
      const maxShift = 8; // 最大位移 px
      img.style.transform = `scale(1.03) translate(${x * maxShift}px, ${y * maxShift}px) rotateX(${-y * maxTilt}deg) rotateY(${x * maxTilt}deg)`;
    });

    img.addEventListener('pointerenter', () => {
      img.classList.add('img-cursor-active');
    });

    img.addEventListener('pointerleave', () => {
      img.classList.remove('img-cursor-active');
      img.style.transform = '';
    });
  });
};

const boot = () => {
  // 重新应用主题（View Transitions 导航后 <html> 被替换，需要恢复主题）
  applyTheme();

  // 立即应用当前主题到 header，避免闪白
  const header = document.querySelector('.site-header');
  if (header) {
    header.classList.add('theme-ready');
  }

  if (firstBoot) {
    // 控制台输出 ASCII 画 + 版本信息
    const asciiArt = [
      '   __    __  ___  ___  ___  ___  ___',
      '  / /_  / / / _ |/ _ |/ _ |/ _ |/ _ |',
      ' / __/ / /_/ __ / __ / __ / __ / __ /',
      '/_/   /___/_/ /_/ /_/ /_/ /_/ /_/ /_/',
      ''
    ].join('\n');
    console.log(
      `%c${asciiArt}`,
      'color: #32b9a8; font-family: monospace; font-weight: bold; line-height: 1.1;'
    );
    console.log(
      '%c yuncan-blog %c v1.0.8 %c Powered by Astro ',
      'background:#32b9a8;color:#fff;padding:3px 10px;border-radius:4px 0 0 4px;font-weight:bold;font-size:13px;',
      'background:#1a1a1a;color:#32b9a8;padding:3px 10px;font-weight:bold;font-size:13px;',
      'color:#888;padding:3px 0;font-size:12px;'
    );

    // 仅首次加载时运行的初始化（这些函数有单例守卫或绑定的 DOM 元素使用 transition:persist）
    initTheme();
    initSettings();
    // 自定义光标仅在桌面端启用（移动端无鼠标，光标会停在原点）
    if (!isMobile()) {
      initCursor();
    }
    // 右键菜单仅在桌面端启用（移动端长按会触发系统菜单，拦截影响体验）
    if (!isMobile()) {
      initContextMenu();
    }
    initPostEditor();
    // FPS 检测仅在桌面端运行（移动端不显示，也省 rAF 开销）
    if (!isMobile()) {
      initFps();
    }
    // Three.js 延迟加载，不阻塞首次渲染（移动端粒子数已降低，夜间流星雨也保留）
    (window.requestIdleCallback || window.setTimeout)(() => initThree());
    // 音乐延迟加载（移动端隐藏播放器，跳过初始化节省流量）
    if (!isMobile()) {
      (window.requestIdleCallback || window.setTimeout)(() => initMusic());
    }
    firstBoot = false;
  }

  // 每次页面加载都需要重新绑定（页面内容在 View Transitions 后被替换）
  initNav();
  initBackTop();
  initProgress();
  initHeroSnap();
  initPostActions();
  initCodeCopy();
  initRuntimeDays();
  initImageLightbox();
  // 图片光标交互仅在桌面端启用
  if (!isMobile()) {
    initImageCursorEffect();
  }

  // 歌词栏逻辑
  const lyricBar = document.getElementById('lyric-bar');
  if (lyricBar) {
    // 读取 sessionStorage 决定初始状态
    if (sessionStorage.getItem('lyric-bar-closed') === '1') {
      lyricBar.classList.remove('is-active');
    }
    // 点击关闭（先移除旧的事件监听器避免重复绑定）
    const closeHandler = () => {
      lyricBar.classList.remove('is-active');
      sessionStorage.setItem('lyric-bar-closed', '1');
    };
    lyricBar.removeEventListener('click', closeHandler);
    lyricBar.addEventListener('click', closeHandler);
  }

  window.__yuncanApp = true;
};

// View Transitions: 在 DOM 替换前恢复主题，避免夜间模式导航栏闪白
document.addEventListener('astro:before-swap', (event) => {
  const saved = localStorage.getItem('yuncan-theme');
  const hour = new Date().getHours();
  const theme = saved === 'light' || saved === 'dark' ? saved : (hour >= 6 && hour < 19 ? 'light' : 'dark');
  event.newDocument.documentElement.dataset.theme = theme;
});

document.addEventListener('astro:page-load', boot);
