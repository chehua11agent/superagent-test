// 极小的合成音效：不依赖外部音频文件，也不引入运行时依赖。
// 浏览器会在第一次用户手势后允许播放；任何环境异常都静默降级，不影响游戏。

let context = null;

const CUES = {
  click: [
    { type: 'triangle', from: 660, to: 600, duration: 0.045, gain: 0.035 }
  ],
  success: [
    { type: 'sine', from: 523.25, to: 523.25, duration: 0.09, gain: 0.05 },
    { type: 'sine', from: 783.99, to: 783.99, duration: 0.16, gain: 0.045, delay: 0.07 }
  ],
  fail: [
    { type: 'sawtooth', from: 196, to: 110, duration: 0.26, gain: 0.035 },
    { type: 'sine', from: 98, to: 82.4, duration: 0.3, gain: 0.03, delay: 0.02 }
  ]
};

function getContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!context) context = new AudioContextClass();
  if (context.state === 'suspended') context.resume().catch(() => {});
  return context;
}

function scheduleVoice(ctx, voice, startAt) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = voice.type;
  oscillator.frequency.setValueAtTime(voice.from, startAt);
  if (voice.to !== voice.from) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, voice.to), startAt + voice.duration);
  }
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(voice.gain, startAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + voice.duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + voice.duration + 0.02);
}

/** 播放一个 UI 音效；enabled 为 false 时直接返回。 */
export function playCue(name, enabled = true) {
  if (!enabled) return;
  const notes = CUES[name];
  if (!notes) return;
  try {
    const ctx = getContext();
    if (!ctx) return;
    const now = ctx.currentTime + 0.005;
    for (const voice of notes) {
      scheduleVoice(ctx, voice, now + (voice.delay || 0));
    }
  } catch {
    // 音频被浏览器策略、设备或测试环境禁用时保持安静。
  }
}
