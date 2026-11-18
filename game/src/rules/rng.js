// 可注入的随机源：正式游戏传 Math.random，测试传固定序列/种子。
// 规则核只依赖“返回 [0,1) 的函数”，不直接调用 Math.random。

/** mulberry32：小而稳定的种子随机数，用于可复现的示例与测试。 */
export function makeRng(seed = 1) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 固定序列随机源；超出序列后重复最后一个值。 */
export function sequenceRng(values) {
  if (!Array.isArray(values) || values.length === 0) throw new Error('sequenceRng 需要一个非空数组');
  let index = 0;
  return function next() {
    const value = values[Math.min(index, values.length - 1)];
    index += 1;
    return value;
  };
}

/** 固定 d20 序列：把 1–20 的面值换成随机源能返回的区间。 */
export function d20Sequence(values) {
  return sequenceRng(values.map((value) => (value - 0.5) / 20));
}

export function rollDie(rng, sides = 20) {
  return Math.floor(rng() * sides) + 1;
}

export function rollDice(rng, count, sides) {
  return Array.from({ length: count }, () => rollDie(rng, sides));
}
