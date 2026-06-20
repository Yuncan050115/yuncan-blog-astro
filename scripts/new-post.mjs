// scripts/new-post.mjs - 交互式创建新文章
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const postsDir = path.join(root, 'content', 'posts');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

// 生成 slug：中文转拼音太复杂，用时间戳+标题简化
function slugify(title) {
  // 如果标题是纯英文/数字，直接 slugify
  const cleaned = title.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  if (cleaned && /^[a-z0-9-]+$/.test(cleaned)) {
    return cleaned;
  }
  // 中文标题：用日期时间戳作为 abbrlink
  const now = new Date();
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  return ts;
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}:${s}`;
}

async function main() {
  console.log('\n📝 创建新文章\n');

  // 标题（必填）
  let title = '';
  while (!title.trim()) {
    title = await ask('文章标题（必填）: ');
    if (!title.trim()) console.log('  ⚠ 标题不能为空');
  }
  title = title.trim();

  // 分类（可选）
  const categoriesInput = await ask('分类（可选，逗号分隔）: ');
  const categories = categoriesInput.trim()
    ? categoriesInput.trim().split(/[,，]/).map(s => s.trim()).filter(Boolean)
    : [];

  // 标签（可选）
  const tagsInput = await ask('标签（可选，逗号分隔）: ');
  const tags = tagsInput.trim()
    ? tagsInput.trim().split(/[,，]/).map(s => s.trim()).filter(Boolean)
    : [];

  // 描述（可选）
  const description = await ask('描述（可选，留空则自动取正文前88字）: ');

  // 生成文件名和路径
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const abbrlink = slugify(title);
  const fileName = `${dateStr}-${title}.md`;
  const filePath = path.join(postsDir, fileName);

  // 检查文件是否已存在
  if (fs.existsSync(filePath)) {
    console.log(`\n❌ 文件已存在: ${filePath}`);
    rl.close();
    process.exit(1);
  }

  // 生成 frontmatter
  let fm = '---\n';
  fm += `title: ${title}\n`;
  if (tags.length > 0) {
    fm += 'tags:\n';
    tags.forEach(t => fm += `  - ${t}\n`);
  }
  if (categories.length > 0) {
    fm += 'categories:\n';
    categories.forEach(c => fm += `  - ${c}\n`);
  }
  if (description.trim()) {
    fm += `description: "${description.trim()}"\n`;
  }
  fm += `abbrlink: ${abbrlink}\n`;
  fm += `date: ${formatDate(now)}\n`;
  fm += '---\n\n';
  fm += `# ${title}\n\n`;
  fm += '开始写作...\n';

  // 写入文件
  fs.writeFileSync(filePath, fm, 'utf8');
  console.log(`\n✅ 文章已创建: ${path.relative(root, filePath)}`);
  console.log(`   abbrlink: ${abbrlink}`);
  console.log(`   访问路径: /posts/${abbrlink}/`);
  console.log(`\n💡 提示: 运行 npm run dev 预览，npm run build 构建`);

  rl.close();
}

main().catch(err => {
  console.error('创建失败:', err);
  rl.close();
  process.exit(1);
});
