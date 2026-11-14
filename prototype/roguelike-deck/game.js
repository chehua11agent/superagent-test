"use strict";

/* 拾词者 · 词塔 — 一个画面简约的肉鸽卡牌小原型。
   所有卡牌、敌人与数值都在这一个文件里，方便直接改。 */

(() => {
  // ── utilities ──────────────────────────────────────────────
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const PARAMS = new URLSearchParams(location.search);
  const FAST = PARAMS.get("fast") === "1";
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, FAST ? Math.min(ms, 20) : ms));
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

  const COLORS = { ink: "#1e1c18", paper: "#f3ede1", red: "#a63f2c", teal: "#2c6159" };

  let uidSeq = 1;
  function makeCard(id) {
    return { uid: uidSeq++, id, up: false };
  }

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  let rng = mulberry32(Date.now() & 0xffffffff);
  const rand = () => rng();
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ── card data ──────────────────────────────────────────────
  // 每个词都来自项目第一章的 CET-4 词表（enemy 的 forget 为主题补充）。
  const CARDS = {
    sharp: {
      word: "sharp",
      ipa: "/ʃɑːp/",
      pos: "adj.",
      zh: "锋利的；尖锐的",
      type: "attack",
      cost: 1,
      fx: [{ op: "damage", n: 6 }],
      upFx: [{ op: "damage", n: 9 }],
    },
    shelter: {
      word: "shelter",
      ipa: "/ˈʃɛltə/",
      pos: "n.",
      zh: "避难所；庇护",
      type: "skill",
      cost: 1,
      fx: [{ op: "block", n: 5 }],
      upFx: [{ op: "block", n: 8 }],
    },
    guide: {
      word: "guide",
      ipa: "/ɡaɪd/",
      pos: "v.",
      zh: "指引；引导",
      type: "skill",
      cost: 1,
      fx: [{ op: "draw", n: 2 }],
      upFx: [{ op: "draw", n: 3 }],
    },
    balance: {
      word: "balance",
      ipa: "/ˈbæləns/",
      pos: "v.",
      zh: "平衡",
      type: "skill",
      cost: 1,
      fx: [{ op: "energy", n: 1 }, { op: "draw", n: 1 }],
      upFx: [{ op: "energy", n: 1 }, { op: "draw", n: 2 }],
    },
    prepare: {
      word: "prepare",
      ipa: "/prɪˈpɛə(ɹ)/",
      pos: "v.",
      zh: "准备",
      type: "skill",
      cost: 1,
      fx: [{ op: "block", n: 4 }, { op: "draw", n: 1 }],
      upFx: [{ op: "block", n: 7 }, { op: "draw", n: 1 }],
    },
    repair: {
      word: "repair",
      ipa: "/ɹɪˈpɛə(ɹ)/",
      pos: "v.",
      zh: "修理；修复",
      type: "skill",
      cost: 1,
      fx: [{ op: "heal", n: 4 }],
      upFx: [{ op: "heal", n: 7 }],
    },
    crash: {
      word: "crash",
      ipa: "/kɹæʃ/",
      pos: "v.",
      zh: "撞击；坠毁",
      type: "attack",
      cost: 2,
      fx: [{ op: "damage", n: 13 }],
      upFx: [{ op: "damage", n: 17 }],
    },
    edge: {
      word: "edge",
      ipa: "/ɛdʒ/",
      pos: "n.",
      zh: "边缘；刀刃",
      type: "attack",
      cost: 2,
      fx: [{ op: "damage", n: 6, hits: 2 }],
      upFx: [{ op: "damage", n: 8, hits: 2 }],
    },
    escape: {
      word: "escape",
      ipa: "/ɪˈskeɪp/",
      pos: "v.",
      zh: "逃脱；逃离",
      type: "skill",
      cost: 1,
      fx: [{ op: "block", n: 7 }, { op: "draw", n: 1 }],
      upFx: [{ op: "block", n: 10 }, { op: "draw", n: 1 }],
    },
    signal: {
      word: "signal",
      ipa: "/ˈsɪɡnəl/",
      pos: "n.",
      zh: "信号；暗号",
      type: "skill",
      cost: 1,
      fx: [{ op: "draw", n: 3 }],
      upFx: [{ op: "draw", n: 4 }],
    },
    reflect: {
      word: "reflect",
      ipa: "/ɹɪˈflɛkt/",
      pos: "v.",
      zh: "反射；反思",
      type: "attack",
      cost: 1,
      fx: [{ op: "damage", n: 8 }, { op: "block", n: 4 }],
      upFx: [{ op: "damage", n: 11 }, { op: "block", n: 6 }],
    },
    survive: {
      word: "survive",
      ipa: "/səˈvaɪv/",
      pos: "v.",
      zh: "生存；幸存",
      type: "skill",
      cost: 2,
      fx: [{ op: "heal", n: 9 }],
      upFx: [{ op: "heal", n: 13 }],
    },
    risk: {
      word: "risk",
      ipa: "/rɪsk/",
      pos: "n.",
      zh: "风险；冒险",
      type: "attack",
      cost: 1,
      fx: [{ op: "damage", n: 17 }, { op: "selfDamage", n: 4 }],
      upFx: [{ op: "damage", n: 22 }, { op: "selfDamage", n: 4 }],
    },
    trust: {
      word: "trust",
      ipa: "/trʌst/",
      pos: "v.",
      zh: "信任",
      type: "skill",
      cost: 2,
      fx: [{ op: "block", n: 11 }],
      upFx: [{ op: "block", n: 15 }],
    },
    courage: {
      word: "courage",
      ipa: "/ˈkʌrɪdʒ/",
      pos: "n.",
      zh: "勇气",
      type: "skill",
      cost: 2,
      fx: [{ op: "block", n: 8 }, { op: "heal", n: 4 }],
      upFx: [{ op: "block", n: 11 }, { op: "heal", n: 6 }],
    },
    rise: {
      word: "rise",
      ipa: "/ɹaɪs/",
      pos: "v.",
      zh: "上升；上涨",
      type: "skill",
      cost: 0,
      fx: [{ op: "energy", n: 1 }, { op: "draw", n: 2 }],
      upFx: [{ op: "energy", n: 2 }, { op: "draw", n: 2 }],
    },
    release: {
      word: "release",
      ipa: "/ɹɪˈliːs/",
      pos: "v.",
      zh: "释放；放开",
      type: "attack",
      cost: 3,
      fx: [{ op: "damage", n: 30 }],
      upFx: [{ op: "damage", n: 40 }],
    },
    tide: {
      word: "tide",
      ipa: "/taɪd/",
      pos: "n.",
      zh: "潮水；潮汐",
      type: "attack",
      cost: 3,
      fx: [{ op: "damage", n: 14 }, { op: "block", n: 10 }],
      upFx: [{ op: "damage", n: 18 }, { op: "block", n: 14 }],
    },
    choose: {
      word: "choose",
      ipa: "/tʃuːz/",
      pos: "v.",
      zh: "选择",
      type: "skill",
      cost: 0,
      fx: [{ op: "energy", n: 2 }, { op: "draw", n: 2 }],
      upFx: [{ op: "energy", n: 2 }, { op: "draw", n: 3 }],
    },
    harbor: {
      word: "harbor",
      ipa: "/ˈhɑːbə/",
      pos: "n.",
      zh: "港口；避风港",
      type: "skill",
      cost: 2,
      fx: [{ op: "block", n: 12 }, { op: "heal", n: 6 }],
      upFx: [{ op: "block", n: 16 }, { op: "heal", n: 9 }],
    },
  };

  const STARTER = [
    "sharp",
    "sharp",
    "sharp",
    "shelter",
    "shelter",
    "shelter",
    "guide",
    "balance",
    "prepare",
    "repair",
  ];

  const REWARD_POOLS = {
    common: ["crash", "escape", "reflect", "survive", "trust", "courage"],
    uncommon: ["edge", "signal", "risk", "rise", "harbor"],
    rare: ["release", "tide", "choose"],
  };

  // ── enemies ────────────────────────────────────────────────
  const ENEMIES = {
    shadow: {
      word: "shadow",
      ipa: "/ˈʃædəʊ/",
      pos: "n.",
      zh: "阴影",
      glyph: "影",
      kind: "normal",
      hp: 28,
      moves: [
        { fx: [{ op: "attack", n: 7 }] },
        { fx: [{ op: "attack", n: 4, hits: 2 }] },
        { fx: [{ op: "block", n: 5 }, { op: "attack", n: 5 }] },
      ],
    },
    doubt: {
      word: "doubt",
      ipa: "/daʊt/",
      pos: "v.",
      zh: "怀疑",
      glyph: "疑",
      kind: "normal",
      hp: 32,
      moves: [
        { fx: [{ op: "attack", n: 8 }] },
        { fx: [{ op: "block", n: 6 }, { op: "attack", n: 5 }] },
        { fx: [{ op: "attack", n: 4, hits: 2 }] },
      ],
    },
    warn: {
      word: "warn",
      ipa: "/wɔːn/",
      pos: "v.",
      zh: "警告",
      glyph: "警",
      kind: "normal",
      hp: 30,
      moves: [
        { fx: [{ op: "attack", n: 6 }] },
        { fx: [{ op: "block", n: 5 }, { op: "attack", n: 7 }] },
        { fx: [{ op: "attack", n: 3, hits: 3 }] },
      ],
    },
    silent: {
      word: "silent",
      ipa: "/ˈsaɪlənt/",
      pos: "adj.",
      zh: "沉默的",
      glyph: "默",
      kind: "elite",
      hp: 50,
      moves: [
        { fx: [{ op: "attack", n: 10 }] },
        { fx: [{ op: "block", n: 7 }, { op: "attack", n: 5 }] },
        { fx: [{ op: "attack", n: 4, hits: 3 }] },
      ],
    },
    forget: {
      word: "forget",
      ipa: "/fəˈɡet/",
      pos: "v.",
      zh: "遗忘",
      glyph: "忘",
      kind: "boss",
      hp: 76,
      moves: [
        { fx: [{ op: "attack", n: 11 }] },
        { fx: [{ op: "block", n: 7 }, { op: "attack", n: 6 }] },
        { fx: [{ op: "attack", n: 4, hits: 3 }] },
        { fx: [{ op: "attack", n: 15 }] },
      ],
    },
  };

  const MAP_BLUEPRINT = [
    { floor: 1, nodes: [{ id: "f1-battle", type: "battle" }] },
    {
      floor: 2,
      nodes: [
        { id: "f2-battle", type: "battle" },
        { id: "f2-rest", type: "campfire" },
      ],
    },
    { floor: 3, nodes: [{ id: "f3-elite", type: "elite", enemy: "silent" }] },
    {
      floor: 4,
      nodes: [
        { id: "f4-battle", type: "battle" },
        { id: "f4-rest", type: "campfire" },
      ],
    },
    { floor: 5, nodes: [{ id: "f5-boss", type: "boss", enemy: "forget" }] },
  ];

  const CAMPFIRE_HEAL = 28;
  const PLAYER_HP = 80;

  // ── state ──────────────────────────────────────────────────
  const G = {
    screen: "title",
    seed: 0,
    run: null,
    combat: null,
    reward: null,
    campfire: null,
    overlay: null,
    stats: null,
  };

  // ── icons ──────────────────────────────────────────────────
  const ICONS = {
    sword:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20 16 8"/><path d="M14 4h6v6"/><path d="M8 16l-4 4"/><path d="M12 12l-4 4"/></svg>',
    shield:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3v6c0 4.2-3.1 7.2-7 9-3.9-1.8-7-4.8-7-9V6l7-3z"/></svg>',
    flame:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21c3.9 0 6-2.6 6-6 0-4.2-3.8-6.3-4.4-10-2.4 1.5-3.5 3.8-3.5 6.4-1-.9-1.6-1.9-1.7-3.2-1.9 1.8-2.4 3.9-2.4 6 0 3.7 2.1 6.8 6 6.8z"/></svg>',
    diamond:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 9-8 9-8-9 8-9z"/></svg>',
    crown:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 18h16"/><path d="M6 18 4 8l5 3 3-6 3 6 5-3-2 10"/></svg>',
    sound:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8 8 0 0 1 0 12"/></svg>',
    muted:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="m16 9 5 6M21 9l-5 6"/></svg>',
    heal:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z"/></svg>',
    backpack:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8h12v12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/><path d="M9 13h6"/></svg>',
    up:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20V5"/><path d="m6 11 6-6 6 6"/></svg>',
  };

  const FIRE_SVG = `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M22 84h56" stroke-width="1.5" opacity=".6"/>
    <path d="M31 84l9-11M69 84l-9-11M42 84l5-8M58 84l-5-8" stroke-width="1.7"/>
    <path class="flame" d="M50 74c10 0 16-6.5 16-15 0-10.5-9.5-15.8-11-25-6 3.8-8.8 9.5-8.8 16-2.5-2.3-4-4.8-4.3-8-4.8 4.5-6 9.8-6 15 0 8.7 4.1 17 14.1 17z" stroke-width="2"/>
    <path class="flame flame-2" d="M50 68c5.4 0 8-3.6 8-8 0-5.3-4.7-8-5.5-12.6-3 2-4.4 5-4.4 8.4-1.3-1.2-2-2.5-2.2-4.2-2.4 2.4-3 5.2-3 8 0 4.4 2.1 8.4 7.1 8.4z" stroke-width="1.6"/>
  </svg>`;

  // ── sound ──────────────────────────────────────────────────
  const Sfx = (() => {
    let ctx = null;
    let muted = false;
    try {
      muted = localStorage.getItem("wordtower.muted") === "1";
    } catch (e) {
      muted = false;
    }

    function ensure() {
      if (!ctx) {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) return null;
        ctx = new Ctor();
      }
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    }

    function tone(freq, dur = 0.08, type = "sine", gain = 0.035, slideTo = null, delay = 0) {
      const ac = ensure();
      if (!ac) return;
      const t0 = ac.currentTime + delay;
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    }

    function hiss(dur = 0.12, gain = 0.025) {
      const ac = ensure();
      if (!ac) return;
      const len = Math.max(1, Math.floor(ac.sampleRate * dur));
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ac.createBufferSource();
      const g = ac.createGain();
      const filter = ac.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1400;
      g.gain.value = gain;
      src.buffer = buf;
      src.connect(filter).connect(g).connect(ac.destination);
      src.start();
    }

    const play = (name) => {
      if (muted) return;
      try {
        switch (name) {
          case "click":
            tone(420, 0.045, "triangle", 0.02);
            break;
          case "card":
            tone(520, 0.07, "triangle", 0.028);
            tone(760, 0.05, "sine", 0.018, null, 0.035);
            break;
          case "hit":
            hiss(0.13, 0.03);
            tone(150, 0.13, "sawtooth", 0.03, 70);
            break;
          case "block":
            tone(330, 0.09, "triangle", 0.022);
            tone(220, 0.11, "sine", 0.018, 200, 0.02);
            break;
          case "heal":
            tone(560, 0.1, "sine", 0.024);
            tone(840, 0.12, "sine", 0.02, null, 0.08);
            break;
          case "turn":
            tone(300, 0.08, "triangle", 0.02);
            break;
          case "win":
            [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, "sine", 0.028, null, i * 0.1));
            break;
          case "lose":
            tone(220, 0.3, "sine", 0.03, 110);
            tone(165, 0.4, "sine", 0.02, 82, 0.16);
            break;
          case "deny":
            tone(150, 0.09, "square", 0.018, 120);
            break;
          default:
            break;
        }
      } catch (e) {
        /* audio is optional */
      }
    };

    return {
      play,
      isMuted: () => muted,
      toggle() {
        muted = !muted;
        try {
          localStorage.setItem("wordtower.muted", muted ? "1" : "0");
        } catch (e) {
          /* private mode */
        }
        if (!muted) play("click");
        return muted;
      },
      unlock() {
        if (!muted) ensure();
      },
    };
  })();

  // ── text helpers ───────────────────────────────────────────
  function cardCost(inst) {
    return CARDS[inst.id].cost;
  }

  function cardFx(inst) {
    const def = CARDS[inst.id];
    return inst.up && def.upFx ? def.upFx : def.fx;
  }

  function fxText(fx) {
    return fx
      .map((f) => {
        switch (f.op) {
          case "damage":
            return `造成 ${f.n} 点伤害${f.hits > 1 ? ` ×${f.hits}` : ""}`;
          case "block":
            return `获得 ${f.n} 点格挡`;
          case "draw":
            return `抽 ${f.n} 张牌`;
          case "energy":
            return `获得 ${f.n} 点费用`;
          case "heal":
            return `回复 ${f.n} 点生命`;
          case "selfDamage":
            return `失去 ${f.n} 点生命`;
          default:
            return "";
        }
      })
      .join("，");
  }

  function intentText(def, move, bonus = 0) {
    const chips = move.fx.map((f) => {
      if (f.op === "attack") {
        const n = f.n + bonus;
        return `<span class="intent-chip">${ICONS.sword}<span>攻击 <b>${n}</b>${
          f.hits > 1 ? ` ×${f.hits}` : ""
        }</span></span>`;
      }
      if (f.op === "block") {
        return `<span class="intent-chip intent-chip--calm">${ICONS.shield}<span>格挡 <b>${f.n}</b></span></span>`;
      }
      if (f.op === "heal") {
        return `<span class="intent-chip intent-chip--calm">${ICONS.heal}<span>回复 <b>${f.n}</b></span></span>`;
      }
      return "";
    });
    return chips.join("");
  }

  function cardHTML(inst, opts = {}) {
    const def = CARDS[inst.id];
    const up = !!inst.up;
    const cost = cardCost(inst);
    const rule = fxText(cardFx(inst));
    const label = `${def.word}，${def.zh}，${cost} 费。${rule}`;
    const Tag = opts.asButton ? "button" : "div";
    const classes = [
      "card",
      `card--${def.type}`,
      up ? "is-upgraded" : "",
      opts.unaffordable ? "is-unaffordable" : "",
      opts.deal ? "card--deal" : "",
      opts.selected ? "card--selected" : "",
    ]
      .filter(Boolean)
      .join(" ");
    return `<${Tag} class="${classes}" ${Tag === "button" ? 'type="button"' : ""} ${
      opts.index != null ? `data-card-index="${opts.index}"` : ""
    } ${opts.uid ? `data-uid="${opts.uid}"` : ""} ${
      opts.disabled ? "disabled" : ""
    } aria-label="${label}" ${Tag === "div" ? 'role="listitem"' : ""}>
      <span class="card-ghost" aria-hidden="true">${def.word.slice(0, 1).toUpperCase()}</span>
      <span class="card-cost">${cost}</span>
      <span class="card-type">${def.type === "attack" ? "攻" : "技"}</span>
      <span class="card-word">${def.word}</span>
      <span class="card-ipa">${def.ipa}</span>
      <span class="card-zh"><em>${def.pos}</em> ${def.zh}</span>
      <span class="card-rule">${rule}</span>
      ${up ? '<span class="card-up-seal" title="已打磨">改</span>' : ""}
    </${Tag}>`;
  }

  // ── effects ────────────────────────────────────────────────
  function announce(msg) {
    const live = $("#live");
    if (live) live.textContent = msg;
  }

  function floatAt(el, text, variant = "") {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const span = document.createElement("span");
    span.className = `float-num float-num--world ${variant}`.trim();
    span.textContent = text;
    const blockOffset = variant.includes("float-num--block") ? -16 : 0;
    span.style.left = `${rect.left + rect.width / 2 + (Math.random() * 18 - 9)}px`;
    span.style.top = `${rect.top + rect.height / 2 + blockOffset + (Math.random() * 8 - 4)}px`;
    document.body.appendChild(span);
    window.setTimeout(() => span.remove(), 950);
  }

  function shake(el) {
    if (!el) return;
    el.classList.remove("is-hit");
    void el.offsetWidth;
    el.classList.add("is-hit");
    window.setTimeout(() => el.classList.remove("is-hit"), 320);
  }

  function bump(el) {
    if (!el || !el.animate) return;
    el.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.22)" },
        { transform: "scale(1)" },
      ],
      { duration: 260, easing: "ease-out" }
    );
  }

  // ── map ────────────────────────────────────────────────────
  function buildMap() {
    const pool = shuffle(["shadow", "doubt", "warn"]);
    let poolIndex = 0;
    return MAP_BLUEPRINT.map((floor) => ({
      floor: floor.floor,
      nodes: floor.nodes.map((node) => {
        const copy = { ...node, floor: floor.floor };
        if (copy.type === "battle") copy.enemy = pool[poolIndex++ % pool.length];
        return copy;
      }),
    }));
  }

  function startRun() {
    const seedParam = PARAMS.get("seed");
    G.seed = seedParam ? Number(seedParam) >>> 0 : (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
    rng = mulberry32(G.seed);
    uidSeq = 1;
    G.run = {
      hp: PLAYER_HP,
      maxHp: PLAYER_HP,
      floor: 1,
      map: buildMap(),
      deck: STARTER.map((id) => makeCard(id)),
      path: [],
      enemiesBeaten: 0,
      cardsPlayed: 0,
      turnsPlayed: 0,
      won: false,
    };
    G.combat = null;
    G.reward = null;
    G.campfire = null;
    G.stats = null;
    closeOverlay();
    showScreen("map");
    updateTopbar();
    announce("新的攀登开始。选择第一层的战斗。");
  }

  function nodeState(node) {
    const run = G.run;
    if (run.path.includes(node.id)) return "is-done";
    if (node.floor === run.floor) return "is-available";
    if (node.floor < run.floor) return "is-skipped";
    return "is-locked";
  }

  function nodeIcon(type) {
    return type === "battle"
      ? ICONS.sword
      : type === "campfire"
      ? ICONS.flame
      : type === "elite"
      ? ICONS.diamond
      : ICONS.crown;
  }

  function nodeTitle(node) {
    if (node.type === "battle") return { label: "战斗", sub: `${ENEMIES[node.enemy].zh} · ${node.enemy}` };
    if (node.type === "campfire") return { label: "篝火", sub: "休息或打磨" };
    if (node.type === "elite") return { label: "精英", sub: `${ENEMIES[node.enemy].zh} · ${node.enemy}` };
    return { label: "首领", sub: `${ENEMIES[node.enemy].zh} · ${node.enemy}` };
  }

  function renderMap() {
    const run = G.run;
    const mapEl = $("#map");
    let html = '<div class="map-edge map-edge--top">塔顶 · 遗忘</div>';
    for (let f = 5; f >= 1; f--) {
      const floor = run.map[f - 1];
      const split = floor.nodes.length > 1 ? " map-floor--split" : "";
      const edge = f === 5 ? " map-floor--top" : f === 1 ? " map-floor--bottom" : "";
      html += `<div class="map-floor${split}${edge}"><span class="map-floor-num">${String(f).padStart(
        2,
        "0"
      )}</span>`;
      for (const node of floor.nodes) {
        const state = nodeState(node);
        const t = nodeTitle(node);
        const available = state === "is-available";
        const done = state === "is-done";
        const skipped = state === "is-skipped";
        html += `<button class="map-node ${state}" data-node="${node.id}" type="button" ${
          available ? "" : "disabled"
        } aria-label="${t.label}：${t.sub}${done ? "，已通过" : skipped ? "，已错过" : ""}">
          <span class="node-orb">${nodeIcon(node.type)}</span>
          <span class="node-label">${t.label}</span>
          <span class="node-sub">${t.sub}</span>
        </button>`;
      }
      html += "</div>";
    }
    html += '<div class="map-edge map-edge--bottom">入口 · 第一层</div>';
    mapEl.innerHTML = html;
    $("#map-floor").textContent = String(Math.min(run.floor, 5));
    $("#map-steps").textContent = String(run.path.length);
    updateTopbar();
  }

  function chooseNode(id) {
    const run = G.run;
    if (!run) return;
    const node = run.map.flatMap((f) => f.nodes).find((n) => n.id === id);
    if (!node || node.floor !== run.floor) return;
    run.path.push(node.id);
    run.floor = node.floor;
    Sfx.play("click");
    if (node.type === "campfire") openCampfire(node);
    else startCombat(node);
  }

  function advanceAfterNode(node) {
    const run = G.run;
    run.floor = node.floor + 1;
    if (run.floor > 5) {
      showResult(run.won);
      return;
    }
    renderMap();
    showScreen("map");
    updateTopbar();
    announce(`继续向上，第 ${run.floor} 层。`);
  }

  // ── combat ─────────────────────────────────────────────────
  function startCombat(node) {
    const def = ENEMIES[node.enemy];
    const combat = {
      node,
      def,
      enemyHp: def.hp,
      enemyMaxHp: def.hp,
      enemyBlock: 0,
      enemyRage: 0,
      drawPile: shuffle(G.run.deck.map((c) => c)),
      discardPile: [],
      hand: [],
      energy: 3,
      maxEnergy: 3,
      turn: 1,
      playerBlock: 0,
      busy: false,
      over: false,
    };
    G.combat = combat;
    $("#enemy-art").innerHTML = enemyArt(def);
    $("#enemy").dataset.kind = def.kind;
    $("#enemy-zh").textContent = def.zh;
    $("#enemy-word").textContent = def.word;
    $("#combat-kind").textContent =
      node.type === "elite" ? "精英" : node.type === "boss" ? "首领" : "战斗";
    $("#combat-floor").textContent = `第 ${node.floor} 层`;
    $("#enemy").classList.remove("is-defeated", "is-hit");
    drawCards(5);
    showScreen("combat");
    renderCombat(true);
    announce(`遭遇${def.zh}。第 1 回合，你的回合。`);
  }

  function enemyArt(def) {
    const boss = def.kind === "boss";
    const elite = def.kind === "elite";
    const ring = boss
      ? '<circle class="mask-ring" cx="100" cy="100" r="91"/><circle class="mask-ring" cx="100" cy="100" r="84" stroke-dasharray="1 5"/>'
      : elite
      ? '<circle class="mask-ring" cx="100" cy="100" r="88"/>'
      : "";
    const shards = elite
      ? '<path class="mask-shard" d="M28 52l10 4-9 7z"/><path class="mask-shard" d="M174 136l-9 5 3-10z"/>'
      : "";
    return `<svg viewBox="0 0 200 200" role="img" aria-label="${def.zh}">
      <defs>
        <filter id="torn" x="-18%" y="-18%" width="136%" height="136%">
          <feTurbulence type="fractalNoise" baseFrequency="0.032" numOctaves="2" seed="7" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </defs>
      ${ring}
      ${shards}
      <path class="mask-blob" filter="url(#torn)" d="M100 13c39 0 72 27 76 67 4 39-21 76-59 87-38 11-79-7-94-42-15-35 2-79 34-96 12-7 27-16 43-16z"/>
      <text class="mask-glyph" x="100" y="126" text-anchor="middle">${def.glyph}</text>
    </svg>`;
  }

  function currentMove(combat = G.combat) {
    if (!combat) return null;
    return combat.def.moves[(combat.turn - 1) % combat.def.moves.length];
  }

  // After turn 9 the enemy stops waiting; this keeps a defensive deck from stalling forever.
  function fatigueBonus(combat = G.combat) {
    return combat ? Math.max(0, combat.turn - 9) : 0;
  }

  function attackBonus(combat = G.combat) {
    return (combat?.enemyRage || 0) + fatigueBonus(combat);
  }

  function drawCards(n) {
    const combat = G.combat;
    const drawn = [];
    for (let i = 0; i < n; i++) {
      if (combat.hand.length >= 10) break;
      if (!combat.drawPile.length) {
        if (!combat.discardPile.length) break;
        combat.drawPile = shuffle(combat.discardPile);
        combat.discardPile = [];
      }
      const card = combat.drawPile.pop();
      combat.hand.push(card);
      drawn.push(card);
    }
    return drawn;
  }

  function renderHand(deal) {
    const combat = G.combat;
    const handEl = $("#hand");
    if (!combat) {
      handEl.innerHTML = "";
      return;
    }
    const dealSet = deal === true ? null : deal;
    handEl.innerHTML = combat.hand
      .map((inst, index) =>
        cardHTML(inst, {
          asButton: true,
          index,
          unaffordable: combat.energy < cardCost(inst),
          deal: deal === true || (dealSet && dealSet.has(inst.uid)),
          disabled: combat.busy || combat.over,
        })
      )
      .join("");
  }

  function renderIntent() {
    const combat = G.combat;
    if (!combat) return;
    const move = currentMove(combat);
    $("#intent").innerHTML = combat.over ? "" : intentText(combat.def, move, attackBonus(combat));
  }

  function renderCombat(dealHand) {
    const combat = G.combat;
    if (!combat) return;
    updateTopbar();
    $("#turn-label").textContent = `第 ${combat.turn} 回合`;
    $("#enemy-hp-fill").style.width = `${clamp(
      (combat.enemyHp / combat.enemyMaxHp) * 100,
      0,
      100
    )}%`;
    $("#enemy-hp-text").textContent = `${combat.enemyHp} / ${combat.enemyMaxHp}`;
    const enemyBlock = $("#enemy-block");
    enemyBlock.hidden = combat.enemyBlock <= 0;
    enemyBlock.innerHTML = `格挡 <b>${combat.enemyBlock}</b>`;
    renderIntent();
    const playerBlock = $("#player-block");
    playerBlock.hidden = combat.playerBlock <= 0;
    playerBlock.innerHTML = `${ICONS.shield}格挡 <b>${combat.playerBlock}</b>`;
    const orbCount = Math.max(combat.maxEnergy, combat.energy);
    $("#energy").innerHTML = Array.from({ length: orbCount }, (_, i) =>
      `<span class="energy-dot ${i >= combat.energy ? "is-empty" : ""}"></span>`
    ).join("");
    $("#energy").setAttribute("aria-label", `剩余费用 ${combat.energy}`);
    $("#draw-pile").innerHTML = `牌库 <b>${combat.drawPile.length}</b>`;
    $("#discard-pile").innerHTML = `弃牌 <b>${combat.discardPile.length}</b>`;
    const endBtn = $("#btn-end");
    endBtn.disabled = combat.busy || combat.over;
    $("#combat-note").textContent = combat.over
      ? ""
      : combat.busy
      ? "敌人行动中…"
      : combat.enemyRage
      ? "遗忘正在加深：它的攻击 +3。"
      : fatigueBonus(combat) > 0
      ? `敌人失去耐心：攻击 +${fatigueBonus(combat)}。尽快结束战斗。`
      : "敌人意图可见。打完牌后结束回合。";
    renderHand(dealHand || false);
  }

  function updateCombatBars() {
    const combat = G.combat;
    if (!combat) return;
    $("#enemy-hp-fill").style.width = `${clamp(
      (combat.enemyHp / combat.enemyMaxHp) * 100,
      0,
      100
    )}%`;
    $("#enemy-hp-text").textContent = `${combat.enemyHp} / ${combat.enemyMaxHp}`;
    const enemyBlock = $("#enemy-block");
    enemyBlock.hidden = combat.enemyBlock <= 0;
    enemyBlock.innerHTML = `格挡 <b>${combat.enemyBlock}</b>`;
    const playerBlock = $("#player-block");
    playerBlock.hidden = combat.playerBlock <= 0;
    playerBlock.innerHTML = `${ICONS.shield}格挡 <b>${combat.playerBlock}</b>`;
    const orbCount = Math.max(combat.maxEnergy, combat.energy);
    $("#energy").innerHTML = Array.from({ length: orbCount }, (_, i) =>
      `<span class="energy-dot ${i >= combat.energy ? "is-empty" : ""}"></span>`
    ).join("");
    $("#energy").setAttribute("aria-label", `剩余费用 ${combat.energy}`);
    $("#draw-pile").innerHTML = `牌库 <b>${combat.drawPile.length}</b>`;
    $("#discard-pile").innerHTML = `弃牌 <b>${combat.discardPile.length}</b>`;
    $("#hud-hp-fill").style.width = `${clamp(
      (G.run.hp / G.run.maxHp) * 100,
      0,
      100
    )}%`;
    $("#hud-hp-text").textContent = `${G.run.hp}/${G.run.maxHp}`;
  }

  function damageEnemy(n) {
    const combat = G.combat;
    const blocked = Math.min(combat.enemyBlock, n);
    combat.enemyBlock -= blocked;
    const loss = n - blocked;
    combat.enemyHp = Math.max(0, combat.enemyHp - loss);
    if (loss > 0) {
      floatAt($("#enemy-art"), `-${loss}`, "float-num--enemy");
      shake($("#enemy"));
      Sfx.play("hit");
    } else {
      floatAt($("#enemy-art"), "格挡", "float-num--block");
      Sfx.play("block");
    }
    if (combat.def.kind === "boss" && combat.enemyRage === 0 && combat.enemyHp <= combat.enemyMaxHp / 2) {
      combat.enemyRage = 3;
      announce("遗忘正在加深，它的攻击提高了。");
      $("#combat-note").textContent = "遗忘正在加深：它的攻击 +3。";
      renderIntent();
    }
    updateCombatBars();
  }

  function damagePlayer(n) {
    const combat = G.combat;
    const blocked = Math.min(combat.playerBlock, n);
    combat.playerBlock -= blocked;
    const loss = n - blocked;
    G.run.hp = Math.max(0, G.run.hp - loss);
    if (loss > 0) {
      floatAt($("#hud-hp-text"), `-${loss}`);
      const screen = $(".screen--combat");
      screen.classList.remove("shake");
      void screen.offsetWidth;
      screen.classList.add("shake");
      Sfx.play("hit");
    } else {
      floatAt($("#player-block"), "格挡", "float-num--block");
      Sfx.play("block");
      bump($("#player-block"));
    }
    updateCombatBars();
    return loss;
  }

  function healPlayer(n) {
    const combat = G.combat;
    const before = G.run.hp;
    G.run.hp = Math.min(G.run.maxHp, G.run.hp + n);
    const healed = G.run.hp - before;
    if (healed > 0) {
      floatAt($("#hud-hp-text"), `+${healed}`, "float-num--heal");
      Sfx.play("heal");
    }
    updateCombatBars();
  }

  function resolveCard(inst) {
    const combat = G.combat;
    for (const f of cardFx(inst)) {
      if (combat.enemyHp <= 0) break;
      switch (f.op) {
        case "damage": {
          const hits = f.hits || 1;
          for (let i = 0; i < hits; i++) {
            if (combat.enemyHp <= 0) break;
            damageEnemy(f.n);
          }
          break;
        }
        case "block":
          combat.playerBlock += f.n;
          updateCombatBars();
          floatAt($("#player-block"), `+${f.n}`, "float-num--block");
          Sfx.play("block");
          bump($("#player-block"));
          break;
        case "draw": {
          const drawn = drawCards(f.n);
          renderHand(new Set(drawn.map((c) => c.uid)));
          break;
        }
        case "energy":
          combat.energy = Math.min(combat.maxEnergy + 2, combat.energy + f.n);
          break;
        case "heal":
          healPlayer(f.n);
          break;
        case "selfDamage":
          G.run.hp = Math.max(0, G.run.hp - f.n);
          floatAt($("#hud-hp-text"), `-${f.n}`);
          updateCombatBars();
          break;
        default:
          break;
      }
    }
    updateCombatBars();
  }

  function playCard(index) {
    const combat = G.combat;
    if (!combat || combat.busy || combat.over) return;
    const inst = combat.hand[index];
    if (!inst) return;
    const cost = cardCost(inst);
    if (combat.energy < cost) {
      Sfx.play("deny");
      const el = $(`#hand [data-card-index="${index}"]`);
      shake(el);
      announce("费用不足。");
      return;
    }
    combat.energy -= cost;
    combat.hand.splice(index, 1);
    Sfx.play("card");
    G.run.cardsPlayed += 1;
    const def = CARDS[inst.id];
    announce(`打出 ${def.word}（${def.zh}）。${fxText(cardFx(inst))}。`);
    const cardEl = $(`#hand [data-card-index="${index}"]`);
    if (cardEl) {
      cardEl.classList.add("card--played");
    }
    resolveCard(inst);
    combat.discardPile.push(inst);
    renderHand(false);
    updateCombatBars();
    $("#btn-end").disabled = combat.busy || combat.over;
    if (G.run.hp <= 0) {
      handleDefeat();
    } else if (combat.enemyHp <= 0) {
      handleVictory();
    }
  }

  async function endTurn() {
    const combat = G.combat;
    if (!combat || combat.busy || combat.over) return;
    combat.busy = true;
    combat.hand.forEach((card) => combat.discardPile.push(card));
    combat.hand = [];
    renderHand(false);
    renderCombat(false);
    Sfx.play("turn");
    announce("你的回合结束。");
    await wait(380);
    const move = currentMove(combat);
    combat.enemyBlock = 0;
    updateCombatBars();
    for (const f of move.fx) {
      if (f.op === "block") {
        combat.enemyBlock += f.n;
        floatAt($("#enemy-art"), `+${f.n}`, "float-num--block");
        updateCombatBars();
        await wait(340);
      } else if (f.op === "attack") {
        const hits = f.hits || 1;
        for (let i = 0; i < hits; i++) {
          damagePlayer(f.n + attackBonus(combat));
          await wait(300);
          if (G.run.hp <= 0) break;
        }
      } else if (f.op === "heal") {
        combat.enemyHp = Math.min(combat.enemyMaxHp, combat.enemyHp + f.n);
        floatAt($("#enemy-art"), `+${f.n}`, "float-num--heal");
        updateCombatBars();
        await wait(300);
      }
    }
    if (G.run.hp <= 0) {
      handleDefeat();
      return;
    }
    await wait(380);
    combat.turn += 1;
    G.run.turnsPlayed = combat.turn - 1;
    combat.playerBlock = 0;
    combat.enemyBlock = 0;
    combat.energy = combat.maxEnergy;
    const drawn = drawCards(5);
    combat.busy = false;
    renderCombat(new Set(drawn.map((c) => c.uid)));
    announce(`第 ${combat.turn} 回合，你的回合。抽 ${drawn.length} 张牌。`);
  }

  async function handleVictory() {
    const combat = G.combat;
    if (!combat || combat.over) return;
    combat.over = true;
    combat.busy = true;
    $("#btn-end").disabled = true;
    $("#intent").innerHTML = "";
    $("#enemy").classList.add("is-defeated");
    Sfx.play("win");
    G.run.enemiesBeaten += 1;
    announce(`战斗胜利。击败了${combat.def.zh}。`);
    updateCombatBars();
    await wait(700);
    if (combat.node.type === "boss") {
      G.run.won = true;
      G.run.floor = 5;
      showResult(true);
      return;
    }
    openReward(combat.node.type === "elite" ? "elite" : "normal");
  }

  function handleDefeat() {
    const combat = G.combat;
    if (!combat || combat.over) return;
    combat.over = true;
    combat.busy = true;
    $("#btn-end").disabled = true;
    Sfx.play("lose");
    announce("你倒下了。");
    window.setTimeout(() => showResult(false), FAST ? 30 : 650);
  }

  // ── rewards ────────────────────────────────────────────────
  function pickRewards(kind) {
    const wanted = kind === "elite" ? ["rare", "rare", "uncommon"] : ["common", "common", "uncommon"];
    const picks = [];
    for (const rarity of wanted) {
      let pool = REWARD_POOLS[rarity].filter((id) => !picks.some((p) => p.id === id));
      if (!pool.length) pool = REWARD_POOLS.common.filter((id) => !picks.some((p) => p.id === id));
      if (!pool.length) break;
      picks.push(makeCard(pick(pool)));
    }
    return picks;
  }

  function openReward(kind) {
    G.reward = { choices: pickRewards(kind), kind };
    $("#reward-sub").textContent =
      kind === "elite"
        ? "精英的词更稀有。选一张加入牌组，或者跳过。"
        : "选一张加入牌组，或者跳过。";
    $("#reward-cards").innerHTML = G.reward.choices
      .map((inst, index) =>
        cardHTML(inst, { asButton: true, index, deal: true })
      )
      .join("");
    showScreen("reward");
    updateTopbar();
    announce("战斗胜利。选择一张词卡加入牌组。");
  }

  function chooseReward(index) {
    if (!G.reward) return;
    const inst = G.reward.choices[index];
    if (!inst) return;
    G.run.deck.push(inst);
    Sfx.play("card");
    const def = CARDS[inst.id];
    announce(`${def.word}（${def.zh}）加入牌组。`);
    const node = G.combat.node;
    G.reward = null;
    advanceAfterNode(node);
  }

  function skipReward() {
    if (!G.reward) return;
    const node = G.combat.node;
    G.reward = null;
    Sfx.play("click");
    advanceAfterNode(node);
  }

  // ── campfire ───────────────────────────────────────────────
  function openCampfire(node) {
    G.campfire = { node, done: false, message: "" };
    $("#fire-art").innerHTML = FIRE_SVG;
    $("#campfire-options").hidden = false;
    $("#campfire-result").hidden = true;
    $("#campfire-sub").textContent = "火还亮着。你可以坐一会儿，或者磨一磨手里的词。";
    $("#campfire-options").innerHTML = `
      <button class="fire-option" id="btn-rest" type="button">
        <span class="fire-option-title">${ICONS.heal}休息</span>
        <span class="fire-option-desc">回复 ${CAMPFIRE_HEAL} 点生命（当前 ${G.run.hp}/${G.run.maxHp}），并从灰烬里捡一张词卡。</span>
      </button>
      <button class="fire-option" id="btn-upgrade" type="button">
        <span class="fire-option-title">${ICONS.up}打磨</span>
        <span class="fire-option-desc">升级一张词卡：伤害、格挡、治疗或抽牌数值提高。</span>
      </button>`;
    const noUpgrade = G.run.deck.every((c) => c.up);
    $("#btn-upgrade").disabled = noUpgrade;
    const fullHp = G.run.hp >= G.run.maxHp;
    if (fullHp) $("#btn-rest").querySelector(".fire-option-desc").textContent = "生命已满，休息不会回复生命。";
    showScreen("campfire");
    updateTopbar();
    announce("你到达了篝火。");
  }

  function campfireRest() {
    const camp = G.campfire;
    if (!camp || camp.done) return;
    const before = G.run.hp;
    G.run.hp = Math.min(G.run.maxHp, G.run.hp + CAMPFIRE_HEAL);
    const healed = G.run.hp - before;
    const pool = [...REWARD_POOLS.common, ...REWARD_POOLS.uncommon];
    const found = makeCard(pick(pool));
    G.run.deck.push(found);
    const foundDef = CARDS[found.id];
    camp.done = true;
    camp.message = `你靠着火堆睡了一会儿，回复了 ${healed} 点生命；灰烬里还压着一张没烧完的词卡：${foundDef.word}（${foundDef.zh}）。`;
    Sfx.play("heal");
    showCampfireResult();
    updateTopbar();
    announce(camp.message);
    announce(`拾到词卡 ${foundDef.word}（${foundDef.zh}）。`);
  }

  function campfireUpgrade() {
    const camp = G.campfire;
    if (!camp || camp.done) return;
    openDeck("upgrade");
  }

  function doUpgrade(uid) {
    const camp = G.campfire;
    if (!camp || camp.done) return;
    const card = G.run.deck.find((c) => c.uid === Number(uid));
    if (!card || card.up) return;
    card.up = true;
    camp.done = true;
    const def = CARDS[card.id];
    camp.message = `你打磨了 ${def.word}（${def.zh}）。它的数值提高了。`;
    Sfx.play("card");
    closeOverlay();
    showCampfireResult();
    announce(camp.message);
  }

  function showCampfireResult() {
    const camp = G.campfire;
    $("#campfire-options").hidden = true;
    $("#campfire-result").hidden = false;
    $("#campfire-sub").textContent = "火苗矮下去了。";
    $("#campfire-result").innerHTML = `<p>${camp.message}</p>
      <button class="primary-btn" id="btn-camp-continue" type="button">继续攀登</button>`;
    $("#btn-camp-continue").addEventListener("click", () => {
      Sfx.play("click");
      const node = camp.node;
      G.campfire = null;
      advanceAfterNode(node);
    });
  }

  // ── result ─────────────────────────────────────────────────
  function showResult(won) {
    const run = G.run;
    run.won = !!won;
    G.reward = null;
    G.campfire = null;
    $("#result-kicker").textContent = won ? "五层走完" : "攀登中断";
    const titleEl = $("#result-title");
    titleEl.textContent = won ? "登顶" : "止步";
    titleEl.classList.toggle("result-title--defeat", !won);
    $("#result-line").textContent = won
      ? "你把「遗忘」打了回去。塔顶只剩一张空白的词卡，等你写下下一个词。"
      : `你停在了第 ${run.floor} 层。忘掉的词还在上面，但你已经记住了一些。`;
    $("#result-stats").innerHTML = `
      <div class="stat"><span class="stat-num">${won ? 5 : Math.min(run.floor, 5)}</span><span class="stat-label">最深层数</span></div>
      <div class="stat"><span class="stat-num">${run.enemiesBeaten}</span><span class="stat-label">击败敌人</span></div>
      <div class="stat"><span class="stat-num">${run.cardsPlayed}</span><span class="stat-label">打出卡牌</span></div>
      <div class="stat"><span class="stat-num">${run.deck.length}</span><span class="stat-label">牌组张数</span></div>`;
    showScreen("result");
    updateTopbar();
    if (won) Sfx.play("win");
  }

  // ── deck overlay ───────────────────────────────────────────
  function openDeck(mode = "view") {
    if (!G.run) return;
    G.overlay = { mode };
    const title = mode === "upgrade" ? "选择一张词卡打磨" : "牌组";
    $("#overlay-title").textContent = `${title} · ${G.run.deck.length} 张`;
    const hint =
      mode === "upgrade"
        ? "打磨会提高一张牌的数值：伤害、格挡、治疗或抽牌。选一张。"
        : "这是你本局的牌组。每场战斗结束后可以三选一加牌。";
    const cards = [...G.run.deck]
      .sort((a, b) => cardCost(a) - cardCost(b) || CARDS[a.id].word.localeCompare(CARDS[b.id].word))
      .map((inst) =>
        cardHTML(inst, {
          asButton: mode === "upgrade",
          uid: inst.uid,
          disabled: mode === "upgrade" && inst.up,
          deal: false,
        })
      )
      .join("");
    $("#overlay-body").innerHTML = `<p class="sheet-hint">${hint}</p><div class="deck-grid" role="list">${cards}</div>`;
    $("#overlay").hidden = false;
    document.body.style.overflow = "hidden";
    $("#overlay-close").focus();
  }

  function openRules() {
    G.overlay = { mode: "rules" };
    $("#overlay-title").textContent = "怎么玩";
    $("#overlay-body").innerHTML = `<div class="rules-list">
      <div class="rule"><b>每回合 3 点费用</b><p>点击手牌打出。牌左上角的数字是费用。打完后点「结束回合」，敌人会按头上的意图行动。</p></div>
      <div class="rule"><b>意图可见</b><p>敌人下一回合要攻击多少、获得多少格挡，都写在它头顶。先加格挡，再考虑输出。</p></div>
      <div class="rule"><b>格挡只持续一回合</b><p>你的格挡在你下回合开始时清零。敌人也一样。</p></div>
      <div class="rule"><b>往上爬</b><p>五层：三场普通战斗、一场精英、一个首领。战斗后三选一加牌；篝火可以回血或打磨一张牌。</p></div>
      <div class="rule"><b>键盘</b><p>数字键 1–9 打出手牌，E 结束回合，Esc 关闭面板。手机直接点按即可。</p></div>
    </div>`;
    $("#overlay").hidden = false;
    document.body.style.overflow = "hidden";
    $("#overlay-close").focus();
  }

  function closeOverlay() {
    if ($("#overlay").hidden) return;
    $("#overlay").hidden = true;
    document.body.style.overflow = "";
    G.overlay = null;
  }

  // ── screen & top bar ───────────────────────────────────────
  function showScreen(name) {
    G.screen = name;
    $$(".float-num--world").forEach((el) => el.remove());
    $$("[data-screen]").forEach((section) => {
      section.hidden = section.dataset.screen !== name;
    });
    $("#topbar").hidden = name === "title";
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    if (name === "combat") renderCombat(false);
    if (name === "map") renderMap();
    updateTopbar();
  }

  function updateTopbar() {
    if (!G.run) return;
    $("#hud-hp-fill").style.width = `${clamp((G.run.hp / G.run.maxHp) * 100, 0, 100)}%`;
    $("#hud-hp-text").textContent = `${G.run.hp}/${G.run.maxHp}`;
    $("#hud-floor").textContent = `第 ${Math.min(G.run.floor, 5)} / 5 层`;
    $("#sound-icon").innerHTML = Sfx.isMuted() ? ICONS.muted : ICONS.sound;
    $("#btn-sound").setAttribute("aria-label", Sfx.isMuted() ? "打开音效" : "关闭音效");
  }

  // ── keyboard & events ──────────────────────────────────────
  function bindEvents() {
    $("#btn-start").addEventListener("click", () => {
      Sfx.unlock();
      Sfx.play("click");
      startRun();
    });
    $("#btn-howto").addEventListener("click", () => {
      Sfx.play("click");
      openRules();
    });
    $("#btn-again").addEventListener("click", () => {
      Sfx.play("click");
      startRun();
    });
    $("#btn-result-deck").addEventListener("click", () => {
      Sfx.play("click");
      openDeck("view");
    });
    $("#btn-deck").addEventListener("click", () => {
      Sfx.play("click");
      openDeck("view");
    });
    $("#btn-sound").addEventListener("click", () => {
      const muted = Sfx.toggle();
      updateTopbar();
      announce(muted ? "音效已关闭。" : "音效已打开。");
    });
    $("#overlay-close").addEventListener("click", () => {
      Sfx.play("click");
      closeOverlay();
    });
    $("#overlay").addEventListener("click", (event) => {
      if (event.target === $("#overlay")) closeOverlay();
    });
    $("#map").addEventListener("click", (event) => {
      const node = event.target.closest("[data-node]");
      if (node && !node.disabled) chooseNode(node.dataset.node);
    });
    $("#hand").addEventListener("click", (event) => {
      const card = event.target.closest("[data-card-index]");
      if (!card) return;
      playCard(Number(card.dataset.cardIndex));
    });
    $("#btn-end").addEventListener("click", () => {
      endTurn();
    });
    $("#reward-cards").addEventListener("click", (event) => {
      const card = event.target.closest("[data-card-index]");
      if (!card) return;
      chooseReward(Number(card.dataset.cardIndex));
    });
    $("#btn-skip").addEventListener("click", () => {
      skipReward();
    });
    $("#campfire-options").addEventListener("click", (event) => {
      if (event.target.closest("#btn-rest")) campfireRest();
      if (event.target.closest("#btn-upgrade")) {
        Sfx.play("click");
        campfireUpgrade();
      }
    });
    $("#overlay-body").addEventListener("click", (event) => {
      const card = event.target.closest("[data-uid]");
      if (!card || G.overlay?.mode !== "upgrade") return;
      doUpgrade(card.dataset.uid);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (!$("#overlay").hidden) closeOverlay();
        return;
      }
      if (!$("#overlay").hidden) return;
      if (G.screen === "title" && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        Sfx.unlock();
        startRun();
        return;
      }
      if (G.screen === "combat") {
        if (/^[1-9]$/.test(event.key)) {
          event.preventDefault();
          playCard(Number(event.key) - 1);
        } else if (event.key.toLowerCase() === "e" || event.key === " ") {
          event.preventDefault();
          endTurn();
        }
      }
      if (event.key.toLowerCase() === "d" && G.screen !== "title") {
        event.preventDefault();
        openDeck("view");
      }
    });

    document.addEventListener("pointerdown", () => Sfx.unlock(), { once: true });
  }

  // ── boot ───────────────────────────────────────────────────
  function init() {
    bindEvents();
    updateTopbar();
    showScreen("title");
    if (PARAMS.get("start") === "1") {
      startRun();
    }
  }

  init();

  // A small debug/test surface. Harmless in production, useful for the QA script.
  window.__wordtower = {
    state() {
      return {
        screen: G.screen,
        seed: G.seed,
        run: G.run
          ? {
              hp: G.run.hp,
              maxHp: G.run.maxHp,
              floor: G.run.floor,
              path: [...G.run.path],
              deck: G.run.deck.map((c) => ({ id: c.id, up: c.up })),
              enemiesBeaten: G.run.enemiesBeaten,
              cardsPlayed: G.run.cardsPlayed,
              won: G.run.won,
            }
          : null,
        combat: G.combat
          ? {
              enemy: G.combat.def.word,
              enemyHp: G.combat.enemyHp,
              enemyMaxHp: G.combat.enemyMaxHp,
              enemyBlock: G.combat.enemyBlock,
              turn: G.combat.turn,
              energy: G.combat.energy,
              hand: G.combat.hand.map((c) => c.id),
              draw: G.combat.drawPile.length,
              discard: G.combat.discardPile.length,
              playerBlock: G.combat.playerBlock,
              busy: G.combat.busy,
              over: G.combat.over,
              intent: currentMove()?.fx || [],
              enemyRage: G.combat.enemyRage,
              enemyKind: G.combat.def.kind,
            }
          : null,
        reward: G.reward ? G.reward.choices.map((c) => c.id) : null,
        campfire: G.campfire ? { done: G.campfire.done } : null,
      };
    },
    start: startRun,
    node: chooseNode,
    play: playCard,
    end: endTurn,
    reward: chooseReward,
    skip: skipReward,
    rest: campfireRest,
    upgrade: campfireUpgrade,
    doUpgrade,
    continueCampfire() {
      $("#btn-camp-continue")?.click();
    },
    deck: openDeck,
    close: closeOverlay,
  };
})();
