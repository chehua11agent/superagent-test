// 《凡戴尔的失落矿坑》四段结构化数据校验。
// 用法：node scripts/lmop-validate.mjs
//
// 校验范围：
// - manifest 与实际文件一致（页数、字节数、SHA-256、计数）；
// - 每个分卷内部 id 唯一、交叉引用可解析、页码落在该分卷声明的区间内；
// - 分卷合计与 manifest 总计一致；
// - 跨分卷重复实体与 manifest 的 cross_part_entities 一致。
//
// 只读取 data/lmop/，不访问网络、不读取私有正文。

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = resolve(ROOT, 'data/lmop');
const MANIFEST_PATH = resolve(DATA_DIR, 'manifest.json');

const CORE_COLLECTIONS = ['chapters', 'scenes', 'npcs', 'monsters', 'checks', 'rewards'];

// 形如 scene-… / npc-… / lmop:monster:… 的实体 id；用于 connections 这类非 *_id 字段。
const ID_LIKE = /^(?:lmop:)?(?:chapter|scene|npc|monster|check|reward|item|faction|hazard|object|xp|map|rule|term|overview|note|sec|area|quest|ch\d{2})[-:]/;

// 以 id/ids 结尾的字段视为引用；datasetId 是数据集元数据，不是引用。
const REF_KEY = /(?:^|_)(id|ids)$|(?:Id|Ids)$/;
const SKIP_REF_KEYS = new Set(['datasetId']);

const PRINTED_PAGE_KEYS = new Set(['page', 'pages', 'page_start', 'page_end']);
const PDF_PAGE_KEYS = new Set([
  'pdfPage',
  'pdf_page',
  'pdf_pages',
  'pdf_page_start',
  'pdf_page_end'
]);

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function collectIds(value, into = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) collectIds(item, into);
  } else if (isRecord(value)) {
    if (typeof value.id === 'string') into.add(value.id);
    for (const child of Object.values(value)) collectIds(child, into);
  }
  return into;
}

function countIds(value, into = new Map()) {
  if (Array.isArray(value)) {
    for (const item of value) countIds(item, into);
  } else if (isRecord(value)) {
    if (typeof value.id === 'string') into.set(value.id, (into.get(value.id) ?? 0) + 1);
    for (const child of Object.values(value)) countIds(child, into);
  }
  return into;
}

function isInside(dir, path) {
  const rel = relative(dir, path);
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel);
}

function pageNumbers(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(pageNumbers);
  if (typeof value === 'string') {
    return [...value.matchAll(/\d+/g)].map((match) => Number(match[0]));
  }
  return [];
}

function checkBounds(numbers, bounds, where, errors) {
  if (!Array.isArray(bounds) || bounds.length !== 2) return;
  const [min, max] = bounds;
  for (const page of numbers) {
    if (page < min || page > max) {
      errors.push(`${where}: 页码 ${page} 超出区间 ${min}–${max}`);
    }
  }
}

function validatePageFields(record, paths, bounds, errors) {
  if (Array.isArray(record)) {
    record.forEach((item, index) => validatePageFields(item, [...paths, String(index)], bounds, errors));
    return;
  }
  if (!isRecord(record)) return;
  for (const [key, value] of Object.entries(record)) {
    const where = [...paths, key].join('.');
    if (PRINTED_PAGE_KEYS.has(key)) {
      checkBounds(pageNumbers(value), bounds.printed, where, errors);
    } else if (PDF_PAGE_KEYS.has(key)) {
      checkBounds(pageNumbers(value), bounds.pdf, where, errors);
    }
    if (isRecord(value) || Array.isArray(value)) {
      validatePageFields(value, [...paths, key], bounds, errors);
    }
  }
}

function validateRefs(record, idSet, paths, errors) {
  if (Array.isArray(record)) {
    record.forEach((item, index) => validateRefs(item, idSet, [...paths, String(index)], errors));
    return;
  }
  if (!isRecord(record)) return;
  for (const [key, value] of Object.entries(record)) {
    const where = [...paths, key].join('.');
    const refs = [];
    if (REF_KEY.test(key) && !SKIP_REF_KEYS.has(key)) {
      if (typeof value === 'string') refs.push(value);
      if (Array.isArray(value)) refs.push(...value.filter((item) => typeof item === 'string'));
    }
    if (key === 'connections' || key === 'connects_to') {
      const items = Array.isArray(value) ? value : [value];
      refs.push(...items.filter((item) => typeof item === 'string' && ID_LIKE.test(item)));
    }
    for (const ref of refs) {
      if (ref && ref !== '' && !idSet.has(ref)) {
        errors.push(`${where}: 引用不存在 ${ref}`);
      }
    }
    if (isRecord(value) || Array.isArray(value)) {
      validateRefs(value, idSet, [...paths, key], errors);
    }
  }
}

function recordCollections(data) {
  const collections = {};
  for (const [key, value] of Object.entries(data)) {
    if (!Array.isArray(value) || value.length === 0) continue;
    if (!value.every((item) => isRecord(item) && typeof item.id === 'string')) continue;
    collections[key] = value;
  }
  return collections;
}

export async function loadLmopLibrary() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  const parts = new Map();
  for (const part of manifest.parts ?? []) {
    const path = resolve(ROOT, part.source_file.startsWith('data/')
      ? part.source_file
      : `data/lmop/${part.source_file}`);
    if (!isInside(DATA_DIR, path)) {
      throw new Error(`manifest.parts[].source_file 必须位于 data/lmop/：${part.source_file}`);
    }
    const raw = await readFile(path);
    parts.set(part.id, { raw, data: JSON.parse(raw.toString('utf8')) });
  }
  return { manifest, parts };
}

export function validateLmopLibrary({ manifest, parts }) {
  const errors = [];
  const warnings = [];
  const stats = { parts: [], totals: {} };

  if (!manifest || !isRecord(manifest)) {
    return { errors: ['manifest 不是对象'], warnings, stats };
  }
  if (manifest.schema_version !== 'lmop-v1') {
    warnings.push(`manifest.schema_version 为 ${manifest.schema_version}，预期 lmop-v1`);
  }
  if (!Array.isArray(manifest.parts) || manifest.parts.length === 0) {
    errors.push('manifest.parts 为空');
  }
  if (!isRecord(manifest.book) || !manifest.book.title) {
    errors.push('manifest.book.title 缺失');
  }

  const seenPartIds = new Set();
  const seenOrders = new Set();
  const idSets = new Map();
  const declaredFiles = new Map(
    (manifest.files ?? []).map((file) => [file.path, file])
  );
  const totals = {};

  for (const part of manifest.parts ?? []) {
    const where = `part ${part.order} (${part.id})`;
    if (seenPartIds.has(part.id)) errors.push(`${where}: 分卷 id 重复`);
    if (seenOrders.has(part.order)) errors.push(`${where}: 分卷 order 重复`);
    seenPartIds.add(part.id);
    seenOrders.add(part.order);

    for (const key of CORE_COLLECTIONS) {
      if (!part.counts || !(key in part.counts)) {
        errors.push(`${where}: counts 缺少 ${key}`);
      }
    }
    const entry = parts.get(part.id);
    if (!entry) {
      errors.push(`${where}: 缺少对应文件`);
      continue;
    }
    if (!isRecord(part.page_bounds)) {
      errors.push(`${where}: page_bounds 缺失`);
    }

    const { raw, data } = entry;
    if (Number.isInteger(part.bytes) && part.bytes !== raw.length) {
      errors.push(`${where}: 字节数 ${raw.length} 与 manifest ${part.bytes} 不一致`);
    }
    if (typeof part.sha256 === 'string') {
      const digest = createHash('sha256').update(raw).digest('hex');
      if (digest !== part.sha256) errors.push(`${where}: SHA-256 与 manifest 不一致`);
    }

    if (!isInside(DATA_DIR, resolve(ROOT, 'data/lmop', part.source_file))) {
      errors.push(`${where}: source_file 必须位于 data/lmop/`);
    }

    const collections = recordCollections(data);
    for (const key of CORE_COLLECTIONS) {
      if (!collections[key]) errors.push(`${where}: 缺少 ${key} 集合`);
    }

    // 计数：manifest 声明的每个集合都应与文件一致；文件中多出的记录集合也应暴露。
    for (const [key, records] of Object.entries(collections)) {
      const declared = part.counts?.[key];
      if (declared === undefined) {
        errors.push(`${where}: manifest.counts 未声明集合 ${key}（实际 ${records.length} 条）`);
      } else if (declared !== records.length) {
        errors.push(`${where}: ${key} 数量 ${records.length} 与 manifest ${declared} 不一致`);
      }
      totals[key] = (totals[key] ?? 0) + records.length;
      for (const record of records) {
        validatePageFields(record, [key, record.id], part.page_bounds, errors);
      }
    }
    for (const key of Object.keys(part.counts ?? {})) {
      if (!(key in collections)) errors.push(`${where}: manifest 声明了不存在的集合 ${key}`);
    }

    const ids = collectIds(data);
    for (const [id, count] of countIds(data)) {
      if (count > 1) errors.push(`${where}: id 重复 ${id}（${count} 次）`);
    }
    idSets.set(part.id, ids);

    validateRefs(data, ids, [where], errors);

    const declaredFile = declaredFiles.get(`data/lmop/${part.source_file}`);
    if (!declaredFile) {
      errors.push(`${where}: manifest.files 缺少 data/lmop/${part.source_file}`);
    } else {
      if (declaredFile.bytes !== raw.length) {
        errors.push(`${where}: files[].bytes 与文件不一致`);
      }
      if (declaredFile.sha256 !== part.sha256) {
        errors.push(`${where}: files[].sha256 与 parts[].sha256 不一致`);
      }
    }

    stats.parts.push({
      id: part.id,
      order: part.order,
      source_file: part.source_file,
      records: Object.values(collections).reduce((sum, records) => sum + records.length, 0),
      counts: Object.fromEntries(Object.entries(collections).map(([key, records]) => [key, records.length]))
    });
  }

  // 合计
  totals.parts = manifest.parts?.length ?? 0;
  totals.records = stats.parts.reduce((sum, part) => sum + part.records, 0);
  stats.totals = totals;
  for (const [key, value] of Object.entries(manifest.counts ?? {})) {
    if (key === 'parts' || key === 'records') continue;
    if (totals[key] === undefined) {
      errors.push(`manifest.counts 声明了不存在的集合 ${key}`);
    } else if (totals[key] !== value) {
      errors.push(`manifest.counts.${key} = ${value}，实际 ${totals[key]}`);
    }
  }
  for (const key of Object.keys(totals)) {
    if (key !== 'parts' && key !== 'records' && !(key in (manifest.counts ?? {}))) {
      errors.push(`实际集合 ${key} 未写入 manifest.counts`);
    }
  }
  if (manifest.counts?.parts !== undefined && manifest.counts.parts !== stats.totals.parts) {
    errors.push(`manifest.counts.parts = ${manifest.counts.parts}，实际 ${stats.totals.parts}`);
  }
  if (manifest.counts?.records !== undefined && manifest.counts.records !== stats.totals.records) {
    errors.push(`manifest.counts.records = ${manifest.counts.records}，实际 ${stats.totals.records}`);
  }

  // 跨分卷实体
  for (const entity of manifest.cross_part_entities ?? []) {
    if (!Array.isArray(entity.parts) || entity.parts.length < 2) {
      errors.push(`cross_part_entities ${entity.id}: 至少需要两个分卷`);
      continue;
    }
    for (const [index, order] of entity.parts.entries()) {
      const part = (manifest.parts ?? []).find((candidate) => candidate.order === order);
      if (!part) {
        errors.push(`cross_part_entities ${entity.id}: 分卷 ${order} 不存在`);
        continue;
      }
      const ids = idSets.get(part.id);
      const segmentId = entity.segment_ids?.[index];
      if (segmentId === undefined) {
        errors.push(`cross_part_entities ${entity.id}: segment_ids 与 parts 长度不一致`);
        continue;
      }
      if (!ids?.has(segmentId)) {
        errors.push(`cross_part_entities ${entity.id}: 分卷 ${order} 中找不到 ${segmentId}`);
      }
    }
  }

  if (!Array.isArray(manifest.notes) || manifest.notes.length === 0) {
    warnings.push('manifest.notes 为空');
  }

  return { errors, warnings, stats };
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  try {
    const library = await loadLmopLibrary();
    const result = validateLmopLibrary(library);
    const { errors, warnings, stats } = result;
    console.log('《凡戴尔的失落矿坑》数据校验');
    for (const part of stats.parts) {
      const counts = Object.entries(part.counts)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ');
      console.log(`  ${part.order}. ${part.source_file}: ${part.records} 条（${counts}）`);
    }
    console.log(`  合计：${stats.totals.records} 条记录，${stats.totals.parts} 个分卷`);
    for (const warning of warnings) console.warn(`警告：${warning}`);
    if (errors.length > 0) {
      console.error(`失败：${errors.length} 项错误`);
      for (const error of errors) console.error(`  - ${error}`);
      process.exitCode = 1;
    } else {
      console.log('通过：manifest、计数、id、交叉引用与页码区间均一致。');
    }
  } catch (error) {
    console.error(`校验无法执行：${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  }
}
