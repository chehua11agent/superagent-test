// 把仿真放到 Worker 里，避免 2–3 秒的同步计算卡住页面。
import { runScreening, runScheduling } from './sim.js';

self.onmessage = (event) => {
  const { kind, args } = event.data || {};
  try {
    if (kind === 'screening') {
      self.postMessage({ result: runScreening(args) });
    } else if (kind === 'scheduling') {
      self.postMessage({ result: runScheduling(args) });
    } else if (kind === 'audit') {
      const out = {};
      for (const share of [0, 0.1, 0.2, 0.3]) {
        out[share] = runScheduling({ ...args, methods: ['three'], auditShare: share }).result[0];
      }
      self.postMessage({ result: out });
    } else {
      self.postMessage({ error: 'unknown worker kind: ' + kind });
    }
  } catch (error) {
    self.postMessage({ error: error && error.message ? error.message : String(error) });
  }
};
