// scripts/postbuild.mjs - 构建后处理
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

console.log('postbuild: 开始处理 dist 目录...');

// 创建 .nojekyll 空文件（GitHub Pages 用，避免 Jekyll 忽略下划线开头的文件）
const nojekyllPath = path.join(dist, '.nojekyll');
fs.writeFileSync(nojekyllPath, '');
console.log(`postbuild: 已创建 ${path.relative(root, nojekyllPath)}`);

console.log('postbuild: 完成');
