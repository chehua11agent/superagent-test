// 小样本校验：每个词是否真的落在选项 / 判定 / 物品位，而不是只写进句子。
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_WORD_FIELDS = ['id', 'en', 'ipa', 'pos', 'zh', 'level', 'card_type', 'card_face', 'card_effect', 'nuance', 'primary_placement', 'why_slot'];
const SLOT_KINDS = new Set(['option', 'check', 'item']);

export function validateSample(sample) {
  const errors = [];
  const warnings = [];
  const words = sample.words || [];
  const nodes = sample.nodes || [];
  const acts = sample.acts || [];
  const endings = sample.endings || [];

  if (words.length !== 10) errors.push(`样本应有 10 个词，实际 ${words.length}。`);
  if (nodes.length !== 5) errors.push(`样本应有 5 个节点，实际 ${nodes.length}。`);
  if (acts.length !== 3) errors.push(`样本应有 3 幕，实际 ${acts.length}。`);

  const wordIds = new Set();
  const nodeIds = new Set(nodes.map((node) => node.id));
  const actIds = new Set();
  const endingIds = new Set(endings.map((ending) => ending.id));
  const allCheckIds = new Set(nodes.flatMap((node) => (node.checks || []).map((check) => check.id)));

  for (const word of words) {
    for (const field of REQUIRED_WORD_FIELDS) {
      if (word[field] === undefined || word[field] === '') errors.push(`词 ${word.id || '?'} 缺字段 ${field}。`);
    }
    if (wordIds.has(word.id)) errors.push(`词 id 重复：${word.id}`);
    wordIds.add(word.id);
    if (!word.ipa?.startsWith('/')) errors.push(`词 ${word.en} 音标格式不对。`);
    if (!['spell', 'item', 'check'].includes(word.card_type)) errors.push(`词 ${word.en} card_type 非法。`);
  }

  for (const act of acts) {
    if (actIds.has(act.id)) errors.push(`幕 id 重复：${act.id}`);
    actIds.add(act.id);
    if (!Array.isArray(act.nodes) || act.nodes.length === 0) errors.push(`幕 ${act.id} 没有节点。`);
    for (const nodeId of act.nodes || []) {
      if (!nodes.some((node) => node.id === nodeId)) errors.push(`幕 ${act.id} 引用了不存在的节点 ${nodeId}。`);
    }
  }

  const nodeWordSlots = new Map();
  const endingsUsed = new Set();
  let optionCount = 0;
  let checkCount = 0;
  let itemCount = 0;
  let functionalWordSlots = 0;

  for (const node of nodes) {
    if (nodeIds.size !== nodes.length) errors.push(`节点 id 有重复。`);
    if (!node.act_id || !actIds.has(node.act_id)) errors.push(`节点 ${node.id} 的 act_id 非法。`);
    if (!node.narration) errors.push(`节点 ${node.id} 缺少旁白。`);
    const options = node.options || [];
    const checks = node.checks || [];
    const items = node.items || [];
    optionCount += options.length;
    checkCount += checks.length;
    itemCount += items.length;

    const localSlotIds = new Set();
    for (const option of options) {
      if (localSlotIds.has(option.id)) errors.push(`节点 ${node.id} 槽 id 重复：${option.id}`);
      localSlotIds.add(option.id);
      if (!option.label) errors.push(`节点 ${node.id} 的选项 ${option.id} 缺少文案。`);
      if (option.word_id) {
        if (!wordIds.has(option.word_id)) errors.push(`选项 ${option.id} 引用了不存在的词 ${option.word_id}。`);
        functionalWordSlots += 1;
      }
      resolveNext(option.next, nodeIds, endingIds, endingsUsed, `选项 ${option.id}`, errors);
      if (option.end) {
        if (!endingIds.has(option.end)) errors.push(`选项 ${option.id} 的 end 不存在：${option.end}`);
        endingsUsed.add(option.end);
      }
      if (option.check_id && !checks.some((check) => check.id === option.check_id)) {
        errors.push(`选项 ${option.id} 的 check_id 不存在：${option.check_id}`);
      }
      if (option.requires_item && !items.some((item) => item.id === option.requires_item) && !nodes.some((n) => (n.items || []).some((item) => item.id === option.requires_item))) {
        warnings.push(`选项 ${option.id} 依赖的物品 ${option.requires_item} 不在本节点；确认它来自前置节点。`);
      }
    }

    for (const check of checks) {
      if (localSlotIds.has(check.id)) errors.push(`节点 ${node.id} 槽 id 重复：${check.id}`);
      localSlotIds.add(check.id);
      if (!wordIds.has(check.word_id)) errors.push(`判定 ${check.id} 引用了不存在的词 ${check.word_id}。`);
      else functionalWordSlots += 1;
      if (!check.prompt) errors.push(`判定 ${check.id} 缺少提示。`);
      if (!check.success || !check.failure) errors.push(`判定 ${check.id} 缺少成功/失败文案。`);
      resolveNext(check.next_success, nodeIds, endingIds, endingsUsed, `判定 ${check.id} 成功`, errors);
      resolveNext(check.next_failure, nodeIds, endingIds, endingsUsed, `判定 ${check.id} 失败`, errors);
      if (check.next_check) {
        if (!allCheckIds.has(check.next_check)) errors.push(`判定 ${check.id} 的 next_check 不存在：${check.next_check}`);
      }
      if (check.requires_item) {
        const exists = nodes.some((n) => (n.items || []).some((item) => item.id === check.requires_item));
        if (!exists) errors.push(`判定 ${check.id} 依赖的物品不存在：${check.requires_item}`);
      }
    }

    for (const item of items) {
      if (localSlotIds.has(item.id)) errors.push(`节点 ${node.id} 槽 id 重复：${item.id}`);
      localSlotIds.add(item.id);
      if (!wordIds.has(item.word_id)) errors.push(`物品 ${item.id} 引用了不存在的词 ${item.word_id}。`);
      else functionalWordSlots += 1;
      if (!item.name || !item.effect) errors.push(`物品 ${item.id} 缺少名称或效果。`);
      if (item.gain && !options.some((option) => option.id === item.gain) && !checks.some((check) => check.id === item.gain || `${check.id}_success` === item.gain)) {
        warnings.push(`物品 ${item.id} 的来源 ${item.gain} 不在本节点；确认它来自其他节点。`);
      }
    }

    if (!options.length && !checks.length && !items.length) errors.push(`节点 ${node.id} 没有任何可操作槽。`);
    if (!options.some((option) => option.next || option.end) && !checks.some((check) => check.next_success || check.next_failure)) {
      errors.push(`节点 ${node.id} 没有出口，可能卡死。`);
    }
  }

  // 每个词必须至少有一个功能位置。
  for (const word of words) {
    const placement = word.primary_placement;
    if (!placement || !SLOT_KINDS.has(placement.kind)) {
      errors.push(`词 ${word.en} 缺少合法的 primary_placement.kind。`);
      continue;
    }
    const node = nodes.find((n) => n.id === placement.node_id);
    if (!node) {
      errors.push(`词 ${word.en} 的 placement 指向不存在的节点 ${placement.node_id}。`);
      continue;
    }
    const slotList = placement.kind === 'option' ? node.options : placement.kind === 'check' ? node.checks : node.items;
    const slot = (slotList || []).find((entry) => entry.id === placement.slot_id);
    if (!slot) {
      errors.push(`词 ${word.en} 的 placement 指向不存在的 ${placement.kind} 槽 ${placement.slot_id}。`);
      continue;
    }
    if (slot.word_id !== word.id) {
      errors.push(`词 ${word.en} 的 placement 槽 ${slot.id} 实际属于 ${slot.word_id || 'null'}。`);
    }
    if (placement.kind === 'item') {
      if (!placement.use_check) warnings.push(`物品词 ${word.en} 没有标注 use_check；物品可能只能看不能用。`);
      else {
        const check = node.checks?.find((entry) => entry.id === placement.use_check) || nodes.flatMap((n) => n.checks || []).find((entry) => entry.id === placement.use_check);
        if (!check) errors.push(`物品词 ${word.en} 的 use_check 不存在：${placement.use_check}`);
      }
    }
    if (!nodeWordSlots.has(word.id)) nodeWordSlots.set(word.id, []);
    nodeWordSlots.get(word.id).push(`${placement.node_id}:${placement.kind}:${placement.slot_id}`);
  }

  // 语义对照检查：decline/refuse 同节点，forbid 物品 / prohibit 判定。
  const decline = words.find((word) => word.en === 'decline');
  const refuse = words.find((word) => word.en === 'refuse');
  const forbid = words.find((word) => word.en === 'forbid');
  const prohibit = words.find((word) => word.en === 'prohibit');
  if (!decline || !refuse || decline.primary_placement.node_id !== refuse.primary_placement.node_id) {
    errors.push('decline 与 refuse 应放在同一节点，形成婉拒/直拒对照。');
  }
  if (!forbid || forbid.primary_placement.kind !== 'item') errors.push('forbid 应作为可拿取/可出示的物品。');
  if (!prohibit || prohibit.primary_placement.kind !== 'check') errors.push('prohibit 应作为可失败的条例判定。');
  const cForbid = nodes.flatMap((node) => node.checks || []).find((check) => check.id === 'c_forbid');
  const cProhibit = nodes.flatMap((node) => node.checks || []).find((check) => check.id === 'c_prohibit');
  if (forbid && cForbid && cForbid.word_id !== forbid.id) errors.push('c_forbid 应该使用 forbid。');
  if (prohibit && cProhibit && cProhibit.word_id !== prohibit.id) errors.push('c_prohibit 应该使用 prohibit。');
  if (cForbid && cForbid.next_check !== 'c_prohibit') errors.push('c_forbid 成功后应接到 c_prohibit。');

  // 诗性文字不能替代功能：若一个词的英文只出现在旁白，而没有功能位置，已经在上面报错。
  for (const word of words) {
    if (!nodeWordSlots.has(word.id)) errors.push(`词 ${word.en} 没有功能位置（选项/判定/物品）。`);
  }

  // 覆盖统计。
  const slotByKind = { option: 0, check: 0, item: 0 };
  for (const word of words) slotByKind[word.primary_placement?.kind] = (slotByKind[word.primary_placement?.kind] || 0) + 1;

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    stats: {
      words: words.length,
      nodes: nodes.length,
      acts: acts.length,
      options: optionCount,
      checks: checkCount,
      items: itemCount,
      functionalWordSlots,
      slotByKind
    },
    table: words.map((word) => {
      const p = word.primary_placement || {};
      const node = nodes.find((n) => n.id === p.node_id);
      const list = p.kind === 'option' ? node?.options : p.kind === 'check' ? node?.checks : node?.items;
      const slot = (list || []).find((entry) => entry.id === p.slot_id);
      return {
        word: word.en,
        zh: word.zh,
        kind: p.kind,
        node: p.node_id,
        slot: p.slot_id,
        playerAction: slot?.label || slot?.prompt || slot?.name || '',
        why: word.why_slot
      };
    })
  };
}

function resolveNext(next, nodeIds, endingIds, endingsUsed, label, errors) {
  if (!next) return;
  if (nodeIds.has(next)) return;
  if (endingIds.has(next)) {
    endingsUsed.add(next);
    return;
  }
  errors.push(`${label} 指向不存在的节点/结局：${next}`);
}

export function formatSampleReport(result, sample) {
  const lines = [];
  lines.push(`《${sample.title}》 · ${sample.subtitle}`);
  lines.push(`结构：${result.stats.acts} 幕 / ${result.stats.nodes} 节点 / ${result.stats.words} 词`);
  lines.push(
    `槽位：选项 ${result.stats.options} 个，判定 ${result.stats.checks} 个，物品 ${result.stats.items} 个；` +
      `其中带词的功能槽 ${result.stats.functionalWordSlots} 个。`
  );
  lines.push('');
  lines.push('| 词 | 中文 | 主位置 | 节点 | 槽 | 玩家做什么 |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const row of result.table) {
    const kind = { option: '选项', check: '判定', item: '物品' }[row.kind] || row.kind;
    lines.push(`| ${row.word} | ${row.zh} | ${kind} | ${row.node} | ${row.slot} | ${row.playerAction} |`);
  }
  lines.push('');
  for (const warning of result.warnings) lines.push(`warn  ${warning}`);
  for (const error of result.errors) lines.push(`error ${error}`);
  lines.push(result.ok ? '通过：每个词都有功能位置。' : `失败：${result.errors.length} 个错误。`);
  return lines.join('\n');
}

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const sample = JSON.parse(await readFile(resolve(root, 'game/content/samples/closing-notice.json'), 'utf8'));
  const result = validateSample(sample);
  console.log(formatSampleReport(result, sample));
  process.exit(result.ok ? 0 : 1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
