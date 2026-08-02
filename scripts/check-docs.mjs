import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const configPath = join(root, 'docs.json');
const failures = [];

let config;
try {
  config = JSON.parse(readFileSync(configPath, 'utf8'));
} catch (error) {
  failures.push(`docs.json을 읽을 수 없습니다: ${error.message}`);
}

for (const field of ['name', 'theme', 'colors', 'navigation']) {
  if (config && !config[field]) failures.push(`docs.json 필수 필드 누락: ${field}`);
}
if (config?.colors && !config.colors.primary) failures.push('docs.json 필수 필드 누락: colors.primary');

const pages = (config?.navigation?.groups ?? []).flatMap((group) => group.pages ?? []);

for (const page of pages) {
  if (!existsSync(join(root, `${page}.mdx`)) && !existsSync(join(root, `${page}.md`))) {
    failures.push(`내비게이션 페이지가 없습니다: ${page}`);
  }
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const docs = walk(join(root, 'docs')).filter((file) => /\.mdx?$/.test(file));
for (const file of docs) {
  const source = readFileSync(file, 'utf8');
  if (!/^---\s*[\s\S]*?^title:\s*["'].+["']\s*$[\s\S]*?^---/m.test(source)) {
    failures.push(`title 프런트매터가 없습니다: ${relative(root, file)}`);
  }
  for (const match of source.matchAll(/\]\((\/docs\/[a-z0-9_\-/]+)\)|href=["'](\/docs\/[a-z0-9_\-/]+)["']/gi)) {
    const link = match[1] ?? match[2];
    const target = join(root, `${link.slice(1)}.mdx`);
    if (!existsSync(target) && !existsSync(target.replace(/\.mdx$/, '.md'))) {
      failures.push(`깨진 내부 링크: ${relative(root, file)} -> ${link}`);
    }
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log(`문서 검사 완료: ${docs.length}개 페이지, ${pages.length}개 내비게이션 항목`);
