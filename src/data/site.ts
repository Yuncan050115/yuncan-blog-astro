import { yuncanConfig } from '../config/yuncan.config';

export const site = {
  ...yuncanConfig.site,
  // 显式映射 env 配置字段，便于维护
  icp: yuncanConfig.site.icp,
  siteStart: yuncanConfig.site.siteStart,
  version: yuncanConfig.version,
  social: yuncanConfig.social,
  heroImage: yuncanConfig.background.image,
  heroFallback: yuncanConfig.assets.heroFallback,
  logo: yuncanConfig.assets.logo,
  avatar: yuncanConfig.assets.avatar,
  twikooEnvId: yuncanConfig.twikoo.envId,
  twikooScript: yuncanConfig.twikoo.script,
  musicApi: yuncanConfig.music.api,
  music: yuncanConfig.music,
  media: yuncanConfig.media,
  license: yuncanConfig.license,
  reward: yuncanConfig.reward,
  nav: yuncanConfig.navigation,
  projects: yuncanConfig.projects,
  assets: yuncanConfig.assets,
  background: yuncanConfig.background
};
