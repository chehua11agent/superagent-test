#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContent } from './validate-content.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const wordsData = JSON.parse(await readFile(resolve(root, 'game/content/words.json'), 'utf8'));
const chapter = JSON.parse(await readFile(resolve(root, 'game/content/chapter-1.json'), 'utf8'));
const result = validateContent(wordsData, chapter);

for (const warning of result.warnings) console.warn(`warn  ${warning}`);
for (const error of result.errors) console.error(`error ${error}`);

console.log(
  `内容校验：${result.stats.words} 词 / ${result.stats.scenes} 幕 / ${result.stats.actions} 个行动 / ` +
    `${result.stats.branchFailures} 个分支代价 / ${result.stats.clueFailures} 个线索代价`
);
console.log(result.ok ? '通过。' : `失败：${result.errors.length} 个错误。`);
process.exit(result.ok ? 0 : 1);
