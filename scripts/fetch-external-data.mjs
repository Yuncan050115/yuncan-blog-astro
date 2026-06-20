// scripts/fetch-external-data.mjs
// 构建前预取外部数据（Steam 游戏库、朋友圈动态），写入静态 JSON 文件。
// 客户端不再 fetch 外部 API，直接 import 本地 JSON，解决"时好时坏"问题。
// 获取失败时保留旧文件不变，确保站点始终有数据可展示。
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
const DATA_DIR = join(root, 'content', 'data');
const STEAM_FILE = join(DATA_DIR, 'steam-games.json');
const CIRCLE_FILE = join(DATA_DIR, 'circle-feed.json');
const BANGUMI_FILE = join(DATA_DIR, 'bangumi-data.json');

// 读取 .env 文件（本地开发用），CI 环境变量已直接注入 process.env
function loadEnv() {
  const envFile = join(root, '.env');
  const env = {};
  if (existsSync(envFile)) {
    const content = readFileSync(envFile, 'utf8');
    const re = /^([A-Z_][A-Z0-9_]*)="([^"]*)"$/gm;
    let m;
    while ((m = re.exec(content)) !== null) {
      env[m[1]] = m[2];
    }
  }
  return env;
}

const fileEnv = loadEnv();
const getEnv = (key) => process.env[key] || fileEnv[key] || '';

async function fetchWithTimeout(url, ms = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// 与 src/lib/content.ts 中 minutesToHours 保持一致
function minutesToHours(minutes = 0) {
  if (!minutes) return '0 小时';
  const hours = minutes / 60;
  return hours >= 10 ? `${Math.round(hours)} 小时` : `${hours.toFixed(1)} 小时`;
}

async function fetchSteamGames() {
  const apiKey = getEnv('PUBLIC_STEAM_API_KEY');
  // steamId 与 src/config/yuncan.config.ts 中保持一致
  const steamId = getEnv('PUBLIC_STEAM_ID') || '';

  if (!apiKey) {
    console.log('[fetch-external-data] Steam: API Key 未配置，跳过');
    return null;
  }

  const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${steamId}&include_appinfo=true&include_played_free_games=true&format=json`;
  const data = await fetchWithTimeout(url);
  const rawGames = Array.isArray(data?.response?.games) ? data.response.games : [];

  const games = rawGames
    .map((g) => {
      const appId = String(g.appid || '');
      const playtime = Number(g.playtime_forever || 0);
      return {
        appId,
        title: String(g.name || 'Steam Game'),
        cover: appId
          ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`
          : '/assets/logo-yuncan.png',
        storeUrl: appId
          ? `https://store.steampowered.com/app/${appId}/`
          : 'https://steamcommunity.com/',
        communityUrl: appId ? `https://steamcommunity.com/app/${appId}` : undefined,
        newsUrl: appId ? `https://store.steampowered.com/news/app/${appId}` : undefined,
        steamdbUrl: appId ? `https://steamdb.info/app/${appId}/` : undefined,
        playtimeForever: playtime,
        playtimeHours: minutesToHours(playtime)
      };
    })
    .sort((a, b) => (b.playtimeForever || 0) - (a.playtimeForever || 0));

  return games;
}

async function fetchCircleFeed() {
  const circleApi = getEnv('PUBLIC_CIRCLE_API');
  if (!circleApi) {
    console.log('[fetch-external-data] Circle: API 未配置，跳过');
    return null;
  }
  const data = await fetchWithTimeout(circleApi);
  return Array.isArray(data?.article_data) ? data.article_data : [];
}

async function fetchBilibiliBangumi() {
  const vmid = getEnv('PUBLIC_BILIBILI_UID') || '';

  const results = { want: [], watching: [], watched: [] };
  // status: 1=想看, 2=在看, 3=看过
  // type: 1=番剧, 2=影视
  const statusMap = { 1: 'want', 2: 'watching', 3: 'watched' };

  for (const [status, key] of Object.entries(statusMap)) {
    for (const category of [1, 2]) {
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const url = `https://api.bilibili.com/x/space/bangumi/follow/list?vmid=${vmid}&type=${category}&follow_status=${status}&pn=${page}&ps=30`;
        try {
          const res = await fetch(url);
          const data = await res.json();
          if (data.code !== 0) throw new Error(data.message);
          const list = data.data?.list || [];
          const total = data.data?.total || 0;
          list.forEach(item => {
            results[key].push({
              id: String(item.season_id || item.media_id),
              title: item.title,
              cover: item.cover,
              url: item.url || `https://www.bilibili.com/bangumi/play/ss${item.season_id}`,
              status: Number(status),
              category,
              total: item.total_count,
              score: item.rating?.score,
              desc: item.evaluate,
              type: item.season_type_name,
              follow: item.stat?.follow,
              view: item.stat?.view,
            });
          });
          hasMore = list.length === 30 && results[key].length < total;
          page++;
          // 避免请求过快
          if (hasMore) await new Promise(r => setTimeout(r, 200));
        } catch (e) {
          console.log(`[fetch-external-data] Bilibili error (status=${status}, cat=${category}, page=${page}): ${e.message}`);
          hasMore = false;
        }
      }
    }
  }

  results.lastUpdate = new Date().toISOString();
  return results;
}

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function writeIfValid(file, payload, label) {
  if (Array.isArray(payload) && payload.length) {
    writeFileSync(file, JSON.stringify(payload));
    console.log(`[fetch-external-data] ${label}: ${payload.length} 条数据已保存`);
    return true;
  }
  if (existsSync(file)) {
    console.log(`[fetch-external-data] ${label}: 获取失败或为空，保留旧数据`);
  } else {
    writeFileSync(file, '[]');
    console.log(`[fetch-external-data] ${label}: 获取失败且无旧数据，写入空数组`);
  }
  return false;
}

async function main() {
  ensureDataDir();

  try {
    const games = await fetchSteamGames();
    writeIfValid(STEAM_FILE, games, 'Steam');
  } catch (e) {
    console.log(`[fetch-external-data] Steam 错误: ${e.message}，保留旧数据`);
    if (!existsSync(STEAM_FILE)) writeFileSync(STEAM_FILE, '[]');
  }

  try {
    const articles = await fetchCircleFeed();
    writeIfValid(CIRCLE_FILE, articles, 'Circle');
  } catch (e) {
    console.log(`[fetch-external-data] Circle 错误: ${e.message}，保留旧数据`);
    if (!existsSync(CIRCLE_FILE)) writeFileSync(CIRCLE_FILE, '[]');
  }

  // Bangumi
  try {
    const bangumiData = await fetchBilibiliBangumi();
    if (bangumiData.want.length || bangumiData.watching.length || bangumiData.watched.length) {
      writeFileSync(BANGUMI_FILE, JSON.stringify(bangumiData));
      console.log(`[fetch-external-data] Bangumi: want=${bangumiData.want.length} watching=${bangumiData.watching.length} watched=${bangumiData.watched.length}`);
    } else if (existsSync(BANGUMI_FILE)) {
      console.log('[fetch-external-data] Bangumi: fetch returned empty, keeping old data');
    }
  } catch (e) {
    console.log(`[fetch-external-data] Bangumi error: ${e.message}, keeping old data`);
  }
}

main();
