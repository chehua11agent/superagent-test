// 单词熟练 → d20 加值：让“认识单词”提高成功率，但永远不能替代掷骰。
// 默认映射可按版本调整；规则核只消费一个数字（0–3），不依赖 SRS 的实现。

export const WORD_BONUS_BY_RECOGNITION_STAGE = [0, 1, 1, 2];
export const WORD_SPELLING_BONUS = 1;
export const WORD_BONUS_MAX = 3;

/**
 * 从 SRS 的 userWord 计算单词加值。
 * recognition stage 0–3；spelling stage 0–2；已掌握（3 + 2）时 +3。
 * 也可以直接传 recognitionStage / spellingStage。
 */
export function wordBonusFromMemory(userWord = {}, { max = WORD_BONUS_MAX } = {}) {
  const recognitionStage = userWord.recognitionStage ?? userWord.stage ?? 0;
  const spellingStage = userWord.spellingStage ?? userWord.spelling?.stage ?? 0;
  const recognitionBonus = WORD_BONUS_BY_RECOGNITION_STAGE[Math.min(Math.max(Math.trunc(recognitionStage) || 0, 0), 3)] ?? 0;
  const spellingBonus = spellingStage >= 2 ? WORD_SPELLING_BONUS : 0;
  return Math.min(recognitionBonus + spellingBonus, max);
}

export function wordBonusLabel(bonus) {
  if (bonus <= 0) return '未掌握';
  if (bonus === 1) return '认识';
  if (bonus === 2) return '熟练';
  return '已掌握';
}

/** 把单词加值转成修正层里的一条 flat 修正。 */
export function wordModifier(bonus = 0) {
  if (!bonus) return null;
  return {
    source: 'word',
    label: `单词·${wordBonusLabel(bonus)}`,
    target: 'all',
    type: 'flat',
    value: bonus
  };
}
