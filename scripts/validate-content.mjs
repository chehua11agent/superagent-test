// 内容校验：对应设计文档 8.6 的 MVP 子集。
// 用法：node scripts/validate.mjs

export const CARD_TYPES = new Set(['spell', 'item', 'check']);
export const EFFECT_TAGS = new Set([
  'shield',
  'damage',
  'heal',
  'reveal',
  'traverse',
  'persuade',
  'hide',
  'detect',
  'restore',
  'delay'
]);
export const FAILURE_COSTS = new Set(['hp', 'clue', 'branch']);
export const EFFECT_TYPES = new Set(['clue', 'heal', 'shield', 'reveal', 'damage', 'none']);

export function validateContent(wordsData, chapter) {
  const errors = [];
  const warnings = [];
  const words = wordsData.words || [];
  const byId = new Map();
  const ranks = new Set();

  if (words.length !== 48) errors.push(`第一章应有 48 个词，实际 ${words.length}。`);

  for (const word of words) {
    const label = word.id || word.lemma || '(unknown)';
    if (byId.has(word.id)) errors.push(`词 id 重复：${word.id}`);
    byId.set(word.id, word);
    if (word.chapter !== 1) errors.push(`${label}: chapter 应为 1。`);
    if (!Number.isInteger(word.freq_rank) || word.freq_rank < 1) errors.push(`${label}: freq_rank 非法。`);
    if (ranks.has(word.freq_rank)) errors.push(`freq_rank 重复：${word.freq_rank}`);
    ranks.add(word.freq_rank);
    if (!word.lemma || !/^[a-z]+$/i.test(word.lemma)) errors.push(`${label}: lemma 必须是单个英文单词。`);
    if (!word.ipa || !word.ipa.startsWith('/')) errors.push(`${label}: 缺少音标。`);
    if (!word.pos) errors.push(`${label}: 缺少词性。`);
    if (!Array.isArray(word.meanings) || word.meanings.length === 0) errors.push(`${label}: 缺少中文释义。`);
    if (!word.example_en || !word.example_en.toLowerCase().includes(word.lemma.toLowerCase())) {
      errors.push(`${label}: 英文例句必须包含目标词。`);
    }
    if (!word.example_zh) errors.push(`${label}: 缺少例句翻译。`);
    if (!CARD_TYPES.has(word.card_type)) errors.push(`${label}: card_type 非法（${word.card_type}）。`);
    if (!EFFECT_TAGS.has(word.effect_tag)) errors.push(`${label}: effect_tag 非法（${word.effect_tag}）。`);
    if (!FAILURE_COSTS.has(word.failure_cost)) errors.push(`${label}: failure_cost 非法（${word.failure_cost}）。`);
    if (![1, 2, 3].includes(word.difficulty)) errors.push(`${label}: difficulty 必须是 1–3。`);
    if (!word.effect_text) errors.push(`${label}: 缺少效果文案。`);
  }
  for (let rank = 1; rank <= words.length; rank += 1) {
    if (!ranks.has(rank)) errors.push(`freq_rank 不连续：缺少 ${rank}。`);
  }

  const scenes = chapter.scenes || [];
  if (scenes.length !== 12) errors.push(`第一章应有 12 幕，实际 ${scenes.length}。`);
  if (chapter.word_count !== 48) errors.push('chapter.word_count 应为 48。');
  if (chapter.scene_count !== 12) errors.push('chapter.scene_count 应为 12。');

  const featuredSeen = new Map();
  const ids = new Set();
  const actionIds = new Set();

  for (const scene of scenes) {
    const label = scene.id || '(scene)';
    if (ids.has(scene.id)) errors.push(`场景 id 重复：${scene.id}`);
    ids.add(scene.id);
    if (!Number.isInteger(scene.ord) || scene.ord < 1 || scene.ord > 12) errors.push(`${label}: ord 非法。`);
    if (!scene.title) errors.push(`${label}: 缺少标题。`);
    if (!scene.narration || [...scene.narration].length > 120) errors.push(`${label}: 旁白超过 120 字。`);
    if (!scene.art?.camera || !scene.art?.time || !scene.art?.weather) errors.push(`${label}: art 配置不完整。`);
    if (!scene.map || scene.map.x < 0 || scene.map.x > 100 || scene.map.y < 0 || scene.map.y > 100) {
      errors.push(`${label}: 地图坐标非法。`);
    }
    if (!Array.isArray(scene.featured_words) || scene.featured_words.length !== 4) {
      errors.push(`${label}: 每幕必须有 4 个 featured_words。`);
    }
    for (const wordId of scene.featured_words || []) {
      if (!byId.has(wordId)) errors.push(`${label}: featured word 不存在：${wordId}`);
      featuredSeen.set(wordId, (featuredSeen.get(wordId) || 0) + 1);
    }
    if (!Array.isArray(scene.actions) || scene.actions.length < 1 || scene.actions.length > 2) {
      errors.push(`${label}: 每幕必须有 1–2 个词行动。`);
    }
    for (const action of scene.actions || []) {
      const alabel = `${label}/${action.id || '?'}`;
      if (actionIds.has(action.id)) errors.push(`行动 id 重复：${action.id}`);
      actionIds.add(action.id);
      if (!scene.featured_words?.includes(action.target_word)) {
        errors.push(`${alabel}: target_word 必须属于本幕 featured_words。`);
      }
      const target = byId.get(action.target_word);
      if (target && action.prompt && action.prompt.toLowerCase().includes(target.lemma.toLowerCase())) {
        errors.push(`${alabel}: 行动提示里出现了英文答案 ${target.lemma}。`);
      }
      if (!action.prompt || [...action.prompt].length > 60) errors.push(`${alabel}: 行动提示超过 60 字。`);
      if (!CARD_TYPES.has(action.card_type)) errors.push(`${alabel}: card_type 非法。`);
      if (![1, 2, 3].includes(action.difficulty)) errors.push(`${alabel}: difficulty 必须是 1–3。`);
      if (!action.success?.text || [...action.success.text].length > 80) errors.push(`${alabel}: 成功文本缺失或超过 80 字。`);
      if (!EFFECT_TYPES.has(action.success?.effect?.type)) errors.push(`${alabel}: success.effect.type 非法。`);
      if (!action.failure?.text || [...action.failure.text].length > 80) errors.push(`${alabel}: 失败文本缺失或超过 80 字。`);
      if (!FAILURE_COSTS.has(action.failure?.cost?.type)) errors.push(`${alabel}: failure.cost.type 非法。`);
      if (action.failure?.cost?.type === 'hp' && ![10, 15, 20].includes(action.failure.cost.amount)) {
        warnings.push(`${alabel}: HP 代价 ${action.failure.cost.amount} 不在 10/15/20 内。`);
      }
      if (action.failure?.cost?.type === 'clue' && action.failure.cost.amount > 1) {
        warnings.push(`${alabel}: 线索代价超过 1。`);
      }
    }
  }

  for (const [wordId, count] of featuredSeen.entries()) {
    if (count !== 1) errors.push(`词 ${wordId} 在章节中出现了 ${count} 次（应恰好 1 次）。`);
  }
  for (const word of words) {
    if (!featuredSeen.has(word.id)) errors.push(`词 ${word.id} 没有被任何场景使用。`);
  }

  const boss = chapter.boss;
  if (!boss) errors.push('缺少章节 BOSS。');
  else {
    if (boss.check_word_ids?.length !== 5) errors.push('BOSS 必须有 5 个检定词。');
    for (const id of boss.check_word_ids || []) {
      if (!byId.has(id)) errors.push(`BOSS 检定词不存在：${id}`);
    }
    if (boss.required !== 3) errors.push('BOSS 通过数应为 3。');
    if (!boss.intro || !boss.success_text || !boss.failure_text) errors.push('BOSS 文案不完整。');
  }

  const chapterScenes = scenes.length;
  const actionCount = scenes.reduce((sum, scene) => sum + (scene.actions?.length || 0), 0);
  const branchCount = scenes.reduce(
    (sum, scene) => sum + (scene.actions || []).filter((action) => action.failure?.cost?.type === 'branch').length,
    0
  );
  const clueCount = scenes.reduce(
    (sum, scene) => sum + (scene.actions || []).filter((action) => action.failure?.cost?.type === 'clue').length,
    0
  );

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    stats: {
      words: words.length,
      scenes: chapterScenes,
      actions: actionCount,
      branchFailures: branchCount,
      clueFailures: clueCount
    }
  };
}
