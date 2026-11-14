/* 苔灯旅店 · D&D 式一夜
   单页演示：剧情 → d20 检定 → 回合制战斗 → 复习
   无依赖、无外部请求、可直接 file:// 打开。 */
(() => {
  "use strict";

  /* ────────────────────────────── 工具 ────────────────────────────── */

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const d = (sides) => 1 + Math.floor(Math.random() * sides);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const REDUCED =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ────────────────────────────── 数据 ────────────────────────────── */

  const WORDS = {
    ward: {
      en: "ward",
      ipa: "/wɔːrd/",
      pos: "v. / n.",
      zh: "守护；防护",
      example: "A rune wards the old door.",
    },
    scorch: {
      en: "scorch",
      ipa: "/skɔːrtʃ/",
      pos: "v.",
      zh: "烧焦；灼烧",
      example: "The fire scorched half the ledger.",
    },
    mend: {
      en: "mend",
      ipa: "/mend/",
      pos: "v.",
      zh: "修补；缝补",
      example: "Mara mends the burnt cloak.",
    },
    daze: {
      en: "daze",
      ipa: "/deɪz/",
      pos: "v.",
      zh: "使恍惚；使发呆",
      example: "The third bell dazed us all.",
    },
  };

  const SPELLS = {
    ward: { effect: "AC +3 直到你下回合；挡住「誊抄」" },
    scorch: { effect: "2d6 火焰 · 敏捷豁免 DC 13 减半" },
    mend: { effect: "治疗 1d8+3" },
    daze: { effect: "感知豁免 DC 13 · 失败跳过行动" },
  };
  const SPELL_ORDER = ["ward", "scorch", "mend", "daze"];

  const wordMark = (key) =>
    `<button class="word" type="button" data-word="${key}">${WORDS[key].en}<span class="word-zh">${WORDS[key].zh}</span></button>`;

  /* 剧情节点。每个节点：幕、标题、场景、段落、选项。
     选项可直接 next/effects，也可带 d20 检定。 */
  const STORY = {
    s1: {
      act: "第 1 幕 · 桥头",
      title: "雾里的两盏灯",
      art: "bridge",
      paragraphs: [
        "木桥的尽头挂着两盏苔灯，绿光只照到桥心。你走了一夜，靴底全是雾水。",
        "守桥人内德横着长矛，盾牌上钉着三枚生锈的钉子。「今晚不接客。雾里有东西在抄词。」",
        "他身后，旅店的窗纸上有一个伏案的影子。笔尖划过纸面的声音，一下，又一下。",
      ],
      choices: [
        {
          label: "亮出拾词者的铜徽",
          sub: "无需检定 · 直接通过",
          result: {
            text: "内德盯着徽章看了很久，把长矛往旁边一靠，侧身让开。「进去吧。别碰那本账。」",
            next: "s2",
            effects: { trusted: true },
          },
        },
        {
          label: "说服他放行",
          sub: "魅力（说服）· d20+4 · DC 12",
          check: { name: "魅力（说服）", mod: 4, dc: 12 },
          success: {
            text: "「我只待到天亮。」你看着他握矛的手，「你也想让今晚平安过去。」内德沉默了一会儿，让开了。",
            next: "s2",
            effects: { trusted: true },
          },
          fail: {
            text: "内德没有让开。你从他胳膊底下挤了过去，长矛在你肩上划开一道口子，血渗进斗篷。",
            next: "s2",
            hp: -3,
          },
        },
        {
          label: "绕到后门",
          sub: "敏捷（隐匿）· d20+4 · DC 14",
          check: { name: "敏捷（隐匿）", mod: 4, dc: 14 },
          success: {
            text: "你踩着一排松动的瓦片绕到后窗，翻进厨房，顺手从架子上拿了一瓶治疗药水。",
            next: "s2",
            effects: { potion: 1 },
          },
          fail: {
            text: "你踩碎了一块瓦。内德追到后门，你挨了一矛才钻进屋里，肩胛火辣辣地疼。",
            next: "s2",
            hp: -4,
          },
        },
      ],
    },

    s2: {
      act: "第 2 幕 · 大厅",
      title: "补了一半的斗篷",
      art: "inn",
      paragraphs: [
        `壁炉里的火只剩一层红。玛拉坐在炉边，替一件烧焦的斗篷补领口——${wordMark("mend")}，针脚很密。`,
        `「这件斗篷的主人爱放火。」她说，「${wordMark("scorch")}。他走的时候，把半页账也烧了。」`,
        `墙上挂着一盏苔灯，灯罩刻着一道旧符：${wordMark("ward")}。柜台上的账本停在一页空白，像被人从中间撕走。`,
        `「抄写员每夜来一次，把词从账本上抄走。钟响三下，人就会 ${wordMark("daze")}，站在原地等它抄完。」`,
      ],
      choices: [
        {
          label: "看那盏苔灯",
          sub: "感知（洞悉）· d20+1 · DC 13",
          check: { name: "感知（洞悉）", mod: 1, dc: 13 },
          success: {
            text: "你看懂了灯罩上的符：光走到哪里，字就显到哪里。战斗的第一回合，你能先看清它。",
            next: "s3",
            effects: { lantern: true },
          },
          fail: {
            text: "灯油快见底了。你只看见自己的影子，和灯罩上一道模糊的划痕。",
            next: "s3",
          },
        },
        {
          label: "翻开账本",
          sub: "智力（奥秘）· d20+3 · DC 12",
          check: { name: "智力（奥秘）", mod: 3, dc: 12 },
          success: {
            text: "缺页的边缘是焦的。它怕火——你的灼烧术会烧得更深（+2 伤害）。",
            next: "s3",
            effects: { weakness: true },
          },
          fail: {
            text: "你刚碰到纸页，楼上的笔声停了。它知道你来了。",
            next: "s3",
            effects: { warned: true },
          },
        },
        {
          label: "先在炉边暖暖手",
          sub: "恢复 4 点生命 · 获得苔铃",
          result: {
            text: "玛拉把一枚苔铃塞进你手里：「别让它连响三下。」热汤下去，肩上的伤口不那么疼了。",
            next: "s3",
            effects: { bell: true },
            hp: 4,
          },
        },
      ],
    },

    s3: {
      act: "第 3 幕 · 雾中",
      title: "没有脸的抄写员",
      art: "scribe",
      paragraphs: [
        "雾从门缝里渗进来，在地板上摊成一张纸。",
        "它站起来的时候没有声音：一件湿透的长袍，一枚铜袖扣，一张空白的脸。手里那支笔还在滴墨。",
        "「把『守护』还回来。」你说。",
        `四个词在你舌尖发烫：${wordMark("ward")}、${wordMark("scorch")}、${wordMark("mend")}、${wordMark("daze")}。`,
      ],
      choices: [
        {
          label: "拔剑",
          sub: "进入战斗",
          result: { text: "", next: "combat" },
        },
      ],
    },

    s4_win: {
      act: "尾声 · 天亮之前",
      title: "字回到纸上",
      art: "dawn",
      paragraphs: [
        "抄写员散成纸屑，像一群白蛾。账本上那页空白慢慢显出一行字：ward——守护。",
        "玛拉把苔灯从墙上取下来，递给你。「下次雾起，跟着灯走。」",
        "内德在门口替你扶住门，没有提通行费的事。你走进雾里，肩上的伤还在发烫。",
      ],
      choices: [
        {
          label: "回到账本前",
          sub: "结算这一夜的四个词",
          result: { text: "", next: "review" },
        },
      ],
    },

    s4_lose: {
      act: "尾声 · 天亮之前",
      title: "词被抄走了",
      art: "ash",
      paragraphs: [
        "你倒在炉边。最后看到的是它的笔尖，停在账本上「ward」那一行。",
        "再睁眼时天已经亮了。玛拉在补那件斗篷，好像什么都没发生。账本少了一页。",
        "「词被抄走了，」她说，「但你还在。明天再来。」",
      ],
      choices: [
        {
          label: "回到账本前",
          sub: "结算这一夜的四个词",
          result: { text: "", next: "review" },
        },
      ],
    },
  };

  /* ────────────────────────────── 状态 ────────────────────────────── */

  const freshState = () => ({
    screen: "title",
    hp: 28,
    maxHp: 28,
    ac: 14,
    slots: 2,
    maxSlots: 2,
    potions: 1,
    flags: {
      trusted: false,
      lantern: false,
      weakness: false,
      bell: false,
      warned: false,
    },
    seen: new Set(),
    words: {
      ward: { used: false, right: 0, wrong: 0, disabled: false },
      scorch: { used: false, right: 0, wrong: 0, disabled: false },
      mend: { used: false, right: 0, wrong: 0, disabled: false },
      daze: { used: false, right: 0, wrong: 0, disabled: false },
    },
    quiz: { q1: null, q2: null },
    storyNode: null,
    storyPending: null,
    combat: null,
    sound: true,
  });

  let S = freshState();

  /* ────────────────────────────── 音效 ────────────────────────────── */

  let audioCtx = null;
  let noiseBuffer = null;

  function ensureAudio() {
    if (audioCtx) {
      if (audioCtx.state === "suspended") audioCtx.resume();
      return audioCtx;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
      const len = Math.floor(audioCtx.sampleRate * 0.4);
      noiseBuffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
      return audioCtx;
    } catch {
      return null;
    }
  }

  function tone({ freq = 440, dur = 0.12, type = "sine", gain = 0.05, when = 0, slide = 0 }) {
    const ctx = ensureAudio();
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  function noise({ dur = 0.16, gain = 0.05, when = 0, freq = 1200 }) {
    const ctx = ensureAudio();
    if (!ctx || !noiseBuffer) return;
    const t0 = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(freq, t0);
    filter.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(g).connect(ctx.destination);
    src.start(t0);
    src.stop(t0 + dur);
  }

  function sfx(name) {
    if (!S.sound) return;
    try {
      if (name === "dice") {
        noise({ dur: 0.22, gain: 0.06, freq: 900 });
        tone({ freq: 220, dur: 0.08, type: "triangle", gain: 0.02, when: 0.02 });
      } else if (name === "hit") {
        noise({ dur: 0.12, gain: 0.07, freq: 380 });
        tone({ freq: 90, dur: 0.18, type: "sine", gain: 0.07, slide: -40 });
      } else if (name === "miss") {
        noise({ dur: 0.1, gain: 0.03, freq: 2400 });
      } else if (name === "heal") {
        tone({ freq: 523.25, dur: 0.16, type: "sine", gain: 0.04 });
        tone({ freq: 783.99, dur: 0.22, type: "sine", gain: 0.035, when: 0.1 });
      } else if (name === "magic") {
        tone({ freq: 392, dur: 0.2, type: "triangle", gain: 0.035 });
        tone({ freq: 587.33, dur: 0.28, type: "sine", gain: 0.03, when: 0.08 });
      } else if (name === "fail") {
        tone({ freq: 196, dur: 0.28, type: "sawtooth", gain: 0.03, slide: -60 });
      } else if (name === "win") {
        [392, 523.25, 659.25, 783.99].forEach((f, i) =>
          tone({ freq: f, dur: 0.3, type: "sine", gain: 0.04, when: i * 0.11 }),
        );
      } else if (name === "lose") {
        [220, 196, 164.81].forEach((f, i) =>
          tone({ freq: f, dur: 0.42, type: "triangle", gain: 0.045, when: i * 0.16 }),
        );
      }
    } catch {
      /* 音频失败不影响游戏 */
    }
  }

  /* ────────────────────────────── 场景画 ────────────────────────────── */

  function sceneArt(kind) {
    const defs = `
      <defs>
        <linearGradient id="sky-${kind}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0d0a07"/><stop offset="1" stop-color="#251b12"/>
        </linearGradient>
        <linearGradient id="warm-${kind}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#e8b75a"/><stop offset="1" stop-color="#8d4f20"/>
        </linearGradient>
        <radialGradient id="glow-${kind}" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#e8b75a" stop-opacity="0.5"/>
          <stop offset="1" stop-color="#e8b75a" stop-opacity="0"/>
        </radialGradient>
        <filter id="blur-${kind}"><feGaussianBlur stdDeviation="5"/></filter>
      </defs>`;

    if (kind === "bridge") {
      return `<svg viewBox="0 0 480 360" role="img" aria-label="雾夜木桥，桥头挂着两盏苔灯">
        ${defs}<rect width="480" height="360" fill="url(#sky-bridge)"/>
        <circle cx="356" cy="72" r="40" fill="url(#glow-bridge)"/><circle cx="356" cy="72" r="18" fill="#e9ddc0" opacity="0.8"/>
        <path d="M0 250c70-18 120 12 190 0s150-18 290 6v104H0z" fill="#0c0906"/>
        <path d="M0 268c80-26 150 10 240-2s170 14 240 2" fill="none" stroke="#33271a" stroke-width="3"/>
        <path d="M18 250v60M92 236v72M170 228v76M300 240v66M386 238v64" stroke="#241b12" stroke-width="5"/>
        <path d="M150 318c50-10 130-8 190 2" stroke="#2b2118" stroke-width="6" fill="none" opacity="0.7"/>
        <g class="lantern-glow">
          <circle cx="240" cy="214" r="24" fill="url(#glow-bridge)"/>
          <path d="M240 194v-6M231 198h18l-3 15h-12z" fill="#3a2e20" stroke="#c9a227" stroke-width="1.4"/>
          <path d="M234 202h12l-2 8h-8z" fill="url(#warm-bridge)"/>
        </g>
        <g class="lantern-glow" style="animation-delay:-2s">
          <circle cx="118" cy="232" r="18" fill="url(#glow-bridge)"/>
          <path d="M118 216v-5M110 219h16l-3 12h-10z" fill="#3a2e20" stroke="#c9a227" stroke-width="1.2"/>
          <path d="M113 222h10l-2 6h-6z" fill="url(#warm-bridge)"/>
        </g>
        <g opacity="0.9"><path d="M282 270c4-28 10-52 22-58 12-6 22 14 21 36-1 20-4 38-7 48h-34z" fill="#070504"/>
          <circle cx="306" cy="204" r="12" fill="#070504"/>
          <path d="M304 200l-22-34" stroke="#070504" stroke-width="5" stroke-linecap="round"/>
          <path d="M300 182l14 6" stroke="#070504" stroke-width="4" stroke-linecap="round"/></g>
        <g class="fog" opacity="0.55"><ellipse cx="120" cy="300" rx="160" ry="26" fill="#cfc3a6" opacity="0.09"/><ellipse cx="360" cy="322" rx="180" ry="30" fill="#cfc3a6" opacity="0.07"/></g>
      </svg>`;
    }

    if (kind === "inn") {
      return `<svg viewBox="0 0 480 360" role="img" aria-label="旅店大厅：壁炉、柜台、苔灯与账本">
        ${defs}<rect width="480" height="360" fill="#171009"/>
        <rect x="0" y="250" width="480" height="110" fill="#1e150d"/>
        <path d="M0 250h480M0 300h480" stroke="#2a1e12" stroke-width="2"/>
        <rect x="296" y="70" width="150" height="180" rx="4" fill="url(#warm-inn)" opacity="0.14"/>
        <rect x="312" y="86" width="118" height="148" fill="#0f0a06" stroke="#3a2a1a" stroke-width="3"/>
        <path d="M312 86l118 148M430 86L312 234" stroke="#3a2a1a" stroke-width="2" opacity="0.6"/>
        <g class="lantern-glow"><circle cx="392" cy="270" r="46" fill="url(#glow-inn)"/>
          <path d="M392 232v-6" stroke="#4a3a26" stroke-width="3"/>
          <path d="M382 236h20l-3 18h-14z" fill="#2b2118" stroke="#c9a227" stroke-width="1.5"/>
          <path d="M385 241h14l-2 10h-10z" fill="url(#warm-inn)"/></g>
        <g><rect x="40" y="110" width="170" height="24" rx="3" fill="#2b1f13" stroke="#4a3623" stroke-width="2"/>
          <path d="M52 134v80M198 134v80" stroke="#2b1f13" stroke-width="8"/>
          <rect x="58" y="126" width="40" height="56" rx="2" fill="#23190f" stroke="#4a3623"/>
          <rect x="110" y="126" width="40" height="56" rx="2" fill="#2b1f13" stroke="#4a3623"/>
          <path d="M78 126v56M130 126v56" stroke="#4a3623" stroke-width="2"/></g>
        <g class="fog"><ellipse cx="160" cy="286" rx="150" ry="22" fill="#cfc3a6" opacity="0.06"/></g>
        <g><rect x="150" y="238" width="70" height="12" rx="2" fill="#3b2b19" stroke="#6b4d2c"/>
          <rect x="156" y="226" width="58" height="12" rx="2" fill="#4a3623" stroke="#c9a227" stroke-width="1"/>
          <path d="M186 246v12M172 258h32" stroke="#4a3623" stroke-width="3"/></g>
        <g opacity="0.9"><path d="M244 300c2-30 8-58 26-64 15-5 26 18 24 44-2 22-5 40-8 52h-42z" fill="#0a0705"/>
          <circle cx="270" cy="222" r="14" fill="#0a0705"/>
          <path d="M264 244c12 6 26 4 34-4" stroke="#0a0705" stroke-width="6" fill="none"/></g>
      </svg>`;
    }

    if (kind === "scribe") {
      return `<svg viewBox="0 0 480 360" role="img" aria-label="雾中站着没有脸的抄写员，手持滴墨的笔">
        ${defs}<rect width="480" height="360" fill="#0c0906"/>
        <path d="M240 340V120M120 360l120-240 120 240" fill="none" stroke="#231a11" stroke-width="40" opacity="0.5"/>
        <circle cx="240" cy="180" r="130" fill="url(#glow-scribe)" opacity="0.5"/>
        <g class="fog" opacity="0.7">
          <ellipse cx="140" cy="300" rx="180" ry="30" fill="#cfc3a6" opacity="0.08"/>
          <ellipse cx="360" cy="330" rx="190" ry="34" fill="#cfc3a6" opacity="0.06"/>
        </g>
        <g><path d="M198 330c6-72 18-128 42-142 24-14 44 20 40 74-3 32-8 58-12 68h-70z" fill="#0a0705"/>
          <path d="M210 330c4-50 12-96 30-112l10 6c-16 26-20 70-24 106z" fill="#161009" opacity="0.8"/>
          <ellipse cx="240" cy="172" rx="24" ry="30" fill="#0a0705"/>
          <ellipse cx="240" cy="176" rx="17" ry="22" fill="#efe4cc" opacity="0.9"/>
          <path d="M232 214l-34 44" stroke="#0a0705" stroke-width="11" stroke-linecap="round"/>
          <path d="M198 258l-14 26" stroke="#c9a227" stroke-width="3" stroke-linecap="round"/>
          <path d="M184 284l-4 12" stroke="#c9a227" stroke-width="2"/>
          <path d="M270 232l24 44" stroke="#0a0705" stroke-width="9" stroke-linecap="round"/>
        </g>
        <g fill="#d9c9a8" opacity="0.65"><rect x="110" y="120" width="26" height="34" transform="rotate(-12 110 120)"/>
          <rect x="336" y="150" width="24" height="30" transform="rotate(16 336 150)"/>
          <rect x="140" y="214" width="18" height="24" transform="rotate(9 140 214)"/></g>
        <g class="fog"><ellipse cx="240" cy="352" rx="260" ry="26" fill="#cfc3a6" opacity="0.12"/></g>
      </svg>`;
    }

    if (kind === "dawn") {
      return `<svg viewBox="0 0 480 360" role="img" aria-label="天亮后的旅店大厅，账本一页重新显字">
        ${defs}<rect width="480" height="360" fill="#2a2317"/>
        <rect x="306" y="56" width="132" height="170" rx="3" fill="url(#warm-dawn)" opacity="0.35"/>
        <rect x="316" y="66" width="112" height="150" fill="#f0e6d2" opacity="0.14"/>
        <path d="M316 66l112 150M428 66L316 216" stroke="#4a3a26" stroke-width="3" opacity="0.6"/>
        <rect x="0" y="250" width="480" height="110" fill="#241b10"/>
        <rect x="120" y="236" width="120" height="16" rx="3" fill="#3b2b19" stroke="#6b4d2c"/>
        <rect x="134" y="214" width="92" height="20" rx="2" fill="#4a3623" stroke="#c9a227" stroke-width="1.2"/>
        <path d="M146 224h30M184 224h28" stroke="#c9a227" stroke-width="1" opacity="0.7"/>
        <g opacity="0.9"><path d="M262 300c2-28 8-52 24-58 14-5 24 16 22 40-2 20-5 36-8 46h-38z" fill="#181109"/>
          <circle cx="286" cy="228" r="13" fill="#181109"/></g>
        <path d="M40 60h26M60 50v20" stroke="#c9a227" stroke-width="1" opacity="0.4"/>
        <g class="fog"><ellipse cx="200" cy="320" rx="180" ry="20" fill="#f0e6d2" opacity="0.05"/></g>
      </svg>`;
    }

    return `<svg viewBox="0 0 480 360" role="img" aria-label="天亮后旅店地上的纸灰">
      ${defs}<rect width="480" height="360" fill="#231d15"/>
      <rect x="300" y="50" width="140" height="180" fill="#3a3222" opacity="0.5"/>
      <rect x="0" y="262" width="480" height="98" fill="#1b150e"/>
      <path d="M150 300c40-26 120-30 180-10 20 6 30 18 22 26-40 18-160 18-210-2z" fill="#0e0b07"/>
      <g fill="#cfc3a6" opacity="0.5"><rect x="180" y="288" width="30" height="18" transform="rotate(-14 180 288)"/>
        <rect x="240" y="300" width="26" height="14" transform="rotate(20 240 300)"/>
        <rect x="300" y="286" width="22" height="16" transform="rotate(-8 300 286)"/>
        <rect x="212" y="312" width="18" height="11" transform="rotate(7 212 312)"/></g>
      <path d="M60 120h26M46 140h18" stroke="#c9a227" stroke-width="1" opacity="0.25"/>
      <g class="fog"><ellipse cx="240" cy="340" rx="240" ry="24" fill="#cfc3a6" opacity="0.05"/></g>
    </svg>`;
  }

  function combatantArt(kind) {
    if (kind === "enemy") {
      return `<svg viewBox="0 0 240 160" role="img" aria-label="抄写员剪影">
        <defs><radialGradient id="eg" cx="0.5" cy="0.45" r="0.55"><stop offset="0" stop-color="#c9a227" stop-opacity="0.28"/><stop offset="1" stop-color="#c9a227" stop-opacity="0"/></radialGradient></defs>
        <rect width="240" height="160" fill="#120d08"/>
        <circle cx="120" cy="76" r="66" fill="url(#eg)"/>
        <g>
          <path d="M92 150c3-40 10-72 28-80 18-8 32 12 29 42-2 20-5 32-8 38h-49z" fill="#080604"/>
          <ellipse cx="120" cy="58" rx="14" ry="18" fill="#080604"/>
          <ellipse cx="120" cy="60" rx="9" ry="12" fill="#e9ddc0" opacity="0.85"/>
          <path d="M114 82l-18 26" stroke="#080604" stroke-width="7" stroke-linecap="round"/>
          <path d="M96 108l-9 16" stroke="#c9a227" stroke-width="2.4" stroke-linecap="round"/>
          <path d="M139 88l16 24" stroke="#080604" stroke-width="6" stroke-linecap="round"/>
          <circle cx="156" cy="116" r="2.6" fill="#c9a227"/>
        </g>
        <g fill="#d9c9a8" opacity="0.45"><rect x="52" y="42" width="14" height="18" transform="rotate(-12 52 42)"/>
          <rect x="176" y="70" width="12" height="16" transform="rotate(15 176 70)"/>
          <rect x="66" y="104" width="10" height="13" transform="rotate(8 66 104)"/></g>
      </svg>`;
    }
    return `<svg viewBox="0 0 240 160" role="img" aria-label="拾词者剪影">
      <defs><radialGradient id="pg" cx="0.5" cy="0.45" r="0.55"><stop offset="0" stop-color="#5c8a63" stop-opacity="0.25"/><stop offset="1" stop-color="#5c8a63" stop-opacity="0"/></radialGradient>
      <linearGradient id="sword" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#efe4cc"/><stop offset="1" stop-color="#8a7a5c"/></linearGradient></defs>
      <rect width="240" height="160" fill="#120d08"/>
      <circle cx="120" cy="78" r="66" fill="url(#pg)"/>
      <g>
        <path d="M96 150c2-38 8-70 24-78 16-8 30 12 28 40-2 18-4 30-7 38h-45z" fill="#0a0806"/>
        <circle cx="121" cy="55" r="15" fill="#0a0806"/>
        <path d="M134 86l16 14" stroke="#0a0806" stroke-width="8" stroke-linecap="round"/>
        <path d="M150 100l-2-30" stroke="url(#sword)" stroke-width="4" stroke-linecap="round"/>
        <path d="M146 70h8" stroke="#c9a227" stroke-width="3" stroke-linecap="round"/>
        <path d="M110 92l-16 22" stroke="#0a0806" stroke-width="7" stroke-linecap="round"/>
      </g>
      <g fill="#efe4cc" opacity="0.35"><rect x="58" y="118" width="8" height="10"/>
        <rect x="176" y="108" width="8" height="10"/></g>
    </svg>`;
  }

  /* ────────────────────────────── 通用渲染 ────────────────────────────── */

  const screens = $$("[data-screen]");
  const topbar = $("#topbar");

  function showScreen(name) {
    S.screen = name;
    screens.forEach((el) => {
      el.hidden = el.dataset.screen !== name;
    });
    topbar.hidden = name === "title";
    updateHud();
    window.scrollTo({ top: 0, behavior: REDUCED ? "auto" : "smooth" });
    const target = $(`[data-screen="${name}"]`);
    if (!target) return;
    const heading = $("h1", target);
    if (heading) {
      heading.focus({ preventScroll: true });
      if (document.activeElement !== heading) heading.setAttribute("tabindex", "-1");
    }
  }

  function updateHud() {
    $("#hud-hp-fill").style.width = `${(S.hp / S.maxHp) * 100}%`;
    $("#hud-hp-text").textContent = `${S.hp}/${S.maxHp}`;
    $("#hud-ac").textContent = S.ac;
    $("#hud-slots").textContent = S.slots > 0 ? "●".repeat(S.slots) : "—";
    $("#word-count").textContent = S.seen.size;
    $("#sheet-hp").textContent = `${S.hp} / ${S.maxHp}`;
    $("#sheet-ac").textContent = S.ac;
    $("#sheet-slots").textContent = S.slots;
    $("#sheet-potions").textContent = S.potions;
    renderSheetItems();
  }

  function renderSheetItems() {
    const items = [];
    if (S.potions > 0) items.push(`治疗药水 ×${S.potions}`);
    if (S.flags.bell) items.push("苔铃 ×1");
    if (S.flags.lantern) items.push("点亮的苔灯");
    const list = $("#sheet-items");
    if (!list) return;
    list.innerHTML = items.length
      ? items.map((t) => `<li>${t}</li>`).join("")
      : `<li style="color:var(--muted-2)">空</li>`;

    const flags = [];
    if (S.flags.trusted) flags.push("内德站在你这边");
    if (S.flags.lantern) flags.push("看得清雾里的字");
    if (S.flags.weakness) flags.push("知道它怕火");
    if (S.flags.warned) flags.push("它知道你来了");
    const flagList = $("#sheet-flags");
    if (!flagList) return;
    flagList.innerHTML = flags.length
      ? flags.map((t) => `<li>${t}</li>`).join("")
      : `<li class="is-empty">还没有做出选择</li>`;
  }

  /* ────────────────────────────── 剧情 ────────────────────────────── */

  function goStory(id) {
    const node = STORY[id];
    if (!node) return;
    S.storyNode = id;
    S.storyPending = null;
    showScreen("story");
    renderStory();
  }

  function renderStory() {
    const node = STORY[S.storyNode];
    if (!node) return;
    $("#story-kicker").textContent = node.act;
    $("#story-title").textContent = node.title;
    $("#scene-art").innerHTML = sceneArt(node.art);
    $("#story-text").innerHTML = node.paragraphs.map((p) => `<p>${p}</p>`).join("");
    $$(".word", $("#story-text")).forEach((el) => S.seen.add(el.dataset.word));
    updateHud();
    renderChoices();
  }

  function renderChoices() {
    const node = STORY[S.storyNode];
    const wrap = $("#story-choices");
    const resultWrap = $("#story-result");
    wrap.innerHTML = "";
    resultWrap.hidden = true;
    resultWrap.innerHTML = "";

    if (S.storyPending) {
      wrap.innerHTML = "";
      const r = S.storyPending;
      renderRollResult(r);
      return;
    }

    node.choices.forEach((choice, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice";
      btn.dataset.choice = String(i);
      btn.innerHTML = `<span class="choice-key">${"ABC"[i] || i + 1}</span>
        <span class="choice-copy"><span class="choice-label">${choice.label}</span>
        <span class="choice-sub">${choice.sub || ""}</span></span>`;
      if (choice.result && choice.result.next === "combat") {
        btn.classList.add("choice--continue");
      }
      btn.addEventListener("click", () => chooseStory(i));
      wrap.appendChild(btn);
    });
  }

  function chooseStory(index) {
    const node = STORY[S.storyNode];
    const choice = node.choices[index];
    if (!choice) return;
    $$("#story-choices .choice").forEach((b) => (b.disabled = true));
    if (choice.check) {
      const r = rollCheck(choice);
      S.storyPending = r;
      renderRollResult(r);
      return;
    }
    const result = choice.result;
    if (!result.text) {
      advanceStory(result);
      return;
    }
    {
      S.storyPending = {
        ...result,
        check: null,
        roll: null,
        total: null,
        dc: null,
        success: true,
        verdict: "",
        outcome: result.text,
        auto: true,
      };
      renderRollResult(S.storyPending);
      return;
    }
    advanceStory(result);
  }

  function rollCheck(choice) {
    sfx("dice");
    const roll = d(20);
    const total = roll + choice.check.mod;
    const success = total >= choice.check.dc;
    const branch = success ? choice.success : choice.fail;
    return {
      ...branch,
      check: choice.check,
      roll,
      total,
      dc: choice.check.dc,
      success,
      verdict: success ? "成功" : "失败",
      outcome: branch.text,
    };
  }

  function renderRollResult(r) {
    const wrap = $("#story-result");
    $("#story-choices").innerHTML = "";
    wrap.hidden = false;
    const isAuto = r.auto === true;
    const die = r.roll == null ? "" : `<div class="d20 ${r.roll === 20 ? "is-crit" : r.roll === 1 ? "is-fumble" : ""}">${r.roll}</div>`;
    const formula = isAuto
      ? `<span class="roll-formula">不需要检定</span>`
      : `<span class="roll-formula">d20 ${r.roll} + ${r.check.mod} = ${r.total} · DC ${r.dc}</span>`;
    const verdict = isAuto
      ? `<span class="roll-verdict is-success">继续</span>`
      : `<span class="roll-verdict ${r.success ? "is-success" : "is-fail"}">${r.verdict}</span>`;
    wrap.setAttribute("aria-live", "polite");
    wrap.innerHTML = `<div class="roll-card">
      <div class="roll-top">
        ${die || `<div class="d20">◆</div>`}
        <div class="roll-meta">${formula}${verdict}</div>
      </div>
      ${r.outcome ? `<p class="roll-outcome">${r.outcome}</p>` : ""}
      <div class="roll-actions"><button class="ghost-btn" type="button" id="roll-continue">继续</button></div>
    </div>`;
    $("#roll-continue").addEventListener("click", () => {
      const pending = S.storyPending;
      S.storyPending = null;
      advanceStory(pending);
    });
  }

  function applyStoryEffects(result) {
    if (!result) return;
    if (result.effects) {
      Object.entries(result.effects).forEach(([k, v]) => {
        if (k === "potion") S.potions += v;
        else S.flags[k] = v;
      });
    }
    if (result.hp) {
      S.hp = clamp(S.hp + result.hp, 1, S.maxHp);
    }
    updateHud();
  }

  function advanceStory(result) {
    if (!result) return;
    applyStoryEffects(result);
    if (result.next === "review") {
      showReview();
      return;
    }
    if (result.next === "combat") {
      startCombat();
      return;
    }
    goStory(result.next);
  }

  /* ────────────────────────────── 战斗 ────────────────────────────── */

  function startCombat() {
    const pInit = d(20) + 2;
    const sInit = d(20) + 1;
    const order = pInit >= sInit ? ["player", "scribe"] : ["scribe", "player"];
    S.combat = {
      round: 1,
      turnIndex: 0,
      order,
      awaiting: false,
      ended: false,
      scribe: { hp: 26, maxHp: 26, ac: 12, dazed: false, intent: null },
      playerWard: false,
      playerDodge: false,
      advantage: Boolean(S.flags.lantern),
      slots: S.slots,
      disabled: [],
      potions: S.potions,
      bellUsed: false,
      lastRoll: null,
      log: [],
      initiative: { player: pInit, scribe: sInit },
      allyArrowDone: false,
    };
    showScreen("combat");
    addLog(`先攻：你 <b>${pInit}</b>，抄写员 <b>${sInit}</b>。${pInit >= sInit ? "你先行动。" : "它先行动。"}`, "roll");
    if (S.flags.warned) addLog("它知道你会来，雾比刚才更浓。", "info");
    if (S.flags.lantern) addLog("苔灯照亮了第一回合：你的第一次攻击有优势。", "good");
    beginRound();
    nextTurn();
  }

  function beginRound() {
    const C = S.combat;
    C.scribe.intent = scribeIntent(C.round);
    if (C.round === 2 && !C.allyArrowDone && S.flags.trusted) {
      C.allyArrowDone = true;
      setTimeout(() => {
        if (!S.combat || S.combat.ended) return;
        addLog("内德从门外射来一箭：<b>6</b> 点伤害。", "good");
        damageScribe(6);
      }, 500);
    }
  }

  function scribeIntent(round) {
    if (round === 2) {
      return {
        type: "erase",
        label: "誊抄",
        text: "抄走一张词术",
        detail: "除非你身上有「守护」，或带着点亮的苔灯。",
      };
    }
    if (round === 3 || round === 5) {
      return { type: "heavy", label: "撕页", text: "2d6+2 精神伤害", detail: "它把一页纸撕成刀。" };
    }
    return { type: "needle", label: "墨针", text: "1d6+2 精神伤害", detail: "笔尖滴下的墨会扎进念头里。" };
  }

  function drawCombat() {
    const C = S.combat;
    if (!C) return;
    updateHud();
    const ea = $("#enemy-art");
    const pa = $("#player-art");
    if (ea && !ea.dataset.drawn) {
      ea.innerHTML = combatantArt("enemy");
      ea.dataset.drawn = "1";
    }
    if (pa && !pa.dataset.drawn) {
      pa.innerHTML = combatantArt("player");
      pa.dataset.drawn = "1";
    }
    const railStatus = $("#rail-status");
    if (railStatus) {
      railStatus.innerHTML =
        `<span class="rs-hp"><i style="width:${(S.hp / S.maxHp) * 100}%"></i></span>` +
        `<span class="rs-text">生命 <b>${S.hp}/${S.maxHp}</b></span>` +
        `<span class="rs-text">AC <b>${S.ac + (C.playerWard ? 3 : 0)}</b></span>` +
        `<span class="rs-text">法术位 <b>${S.slots > 0 ? "●".repeat(S.slots) : "—"}</b></span>` +
        `<span class="rs-text">药水 <b>${C.potions}</b></span>`;
    }
    $("#combat-round").textContent = `第 ${C.round} 回合`;
    $("#combat-turn").textContent = C.awaiting ? "你的回合" : "它的回合";
    $("#combat-initiative").textContent = `先攻 ${C.initiative.player} / ${C.initiative.scribe}`;
    $("#enemy-hp-text").textContent = `${C.scribe.hp} / ${C.scribe.maxHp}`;
    $("#enemy-hp-fill").style.width = `${(C.scribe.hp / C.scribe.maxHp) * 100}%`;
    $("#enemy-ac").textContent = C.scribe.ac;
    $("#player-hp-text").textContent = `${S.hp} / ${S.maxHp}`;
    $("#player-hp-fill").style.width = `${(S.hp / S.maxHp) * 100}%`;
    $("#player-ac").textContent = S.ac + (C.playerWard ? 3 : 0);
    $("#player-resources").innerHTML =
      `<span>法术位 <b class="slots">${S.slots > 0 ? "●".repeat(S.slots) : "—"}</b></span>` +
      `<span>药水 <b>${C.potions}</b></span>` +
      `<span>${C.playerWard ? "<b>守护 +3 AC</b>" : C.playerDodge ? "<b>闪避中</b>" : "&nbsp;"}</span>`;
    const intent = C.scribe.intent;
    $("#enemy-intent-text").textContent = intent ? `${intent.label} · ${intent.text}` : "——";
    $("#enemy-card").classList.toggle("is-active", !C.awaiting && !C.ended);
    $("#player-card").classList.toggle("is-active", C.awaiting && !C.ended);
    $("#combat-turn").textContent = C.awaiting ? "你的回合" : "它的回合";
    renderSpells();
    renderLog();
    const disabled = C.ended || !C.awaiting;
    ["btn-attack", "btn-dodge", "btn-potion"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.disabled = disabled;
    });
    const bell = $("#btn-bell");
    if (bell) {
      bell.hidden = !(S.flags.bell && !C.bellUsed);
      bell.disabled = disabled;
    }
    const potionBtn = $("#btn-potion");
    if (potionBtn) potionBtn.disabled = disabled || C.potions <= 0;
    $("#potion-count").textContent = String(C.potions);
    $("#action-hint").textContent = C.awaiting
      ? "选择动作。词术要先想起词义才能真正施放。"
      : "抄写员正在行动……";
  }

  function renderSpells() {
    const C = S.combat;
    const row = $("#spell-row");
    if (!row) return;
    row.innerHTML = "";
    SPELL_ORDER.forEach((key) => {
      const word = WORDS[key];
      const disabled = C.disabled.includes(key) || S.slots <= 0;
      const el = document.createElement("button");
      el.type = "button";
      el.className = `spell-card${C.disabled.includes(key) ? " is-disabled" : ""}`;
      el.disabled = disabled || !C.awaiting || C.ended;
      el.dataset.spell = key;
      el.innerHTML = `<span class="spell-word">${word.en}<span class="spell-ipa">${word.ipa}</span></span>
        <span class="spell-zh">${word.zh}</span>
        <span class="spell-effect">${SPELLS[key].effect}</span>
        <span class="spell-slot">1 法术位</span>
        <kbd>${["Q", "W", "E", "R"][SPELL_ORDER.indexOf(key)]}</kbd>`;
      el.addEventListener("click", () => openWordCheck(key));
      row.appendChild(el);
    });
  }

  function renderLog() {
    const C = S.combat;
    const log = $("#log");
    if (!log || !C) return;
    log.innerHTML = C.log
      .slice(-9)
      .map((entry) => `<p class="${entry.cls || ""}">${entry.html}</p>`)
      .join("");
    log.scrollTop = log.scrollHeight;
  }

  function addLog(html, cls) {
    const C = S.combat;
    if (!C) return;
    C.log.push({ html, cls });
    renderLog();
  }

  function nextTurn() {
    const C = S.combat;
    if (!C || C.ended) return;
    if (C.turnIndex >= C.order.length) {
      C.round += 1;
      C.turnIndex = 0;
      beginRound();
    }
    const actor = C.order[C.turnIndex];
    if (actor === "player") {
      C.awaiting = true;
      C.playerWard = false;
      C.playerDodge = false;
      C.advantage = C.advantage && C.round === 1; // 苔灯只照亮第一回合
      drawCombat();
      return;
    }
    C.awaiting = false;
    drawCombat();
    window.setTimeout(() => {
      if (!S.combat || S.combat.ended) return;
      enemyTurn();
    }, 650);
  }

  function endPlayerAction() {
    const C = S.combat;
    if (!C || C.ended) return;
    C.awaiting = false;
    drawCombat();
    window.setTimeout(() => {
      if (!S.combat || S.combat.ended) return;
      C.turnIndex += 1;
      nextTurn();
    }, 420);
  }

  function enemyTurn() {
    const C = S.combat;
    if (!C || C.ended) return;
    if (C.scribe.dazed) {
      C.scribe.dazed = false;
      addLog("抄写员还陷在恍惚里，这一回合什么也没写成。", "good");
      finishEnemyTurn();
      return;
    }
    const intent = C.scribe.intent || scribeIntent(C.round);
    if (intent.type === "erase") {
      const blocked = C.playerWard || S.flags.lantern;
      if (blocked) {
        addLog(
          C.playerWard
            ? "它伸笔来抄，守护符弹开了笔尖。<b>什么也没被抄走。</b>"
            : "苔灯的光钉住了它的笔。它抄了个空。<b>什么也没被抄走。</b>",
          "good",
        );
      } else {
        const pool = SPELL_ORDER.filter((k) => !C.disabled.includes(k));
        if (pool.length) {
          const stolen = pick(pool);
          C.disabled.push(stolen);
          S.words[stolen].disabled = true;
          addLog(`它俯身誊抄，把 <b>${stolen}</b> 从你的舌尖抄走了。本场战斗无法再施放它。`, "bad");
        } else {
          addLog("它想再抄一个词，但你能用的词已经空了。", "info");
        }
        sfx("fail");
      }
      finishEnemyTurn();
      return;
    }
    // 攻击
    const heavy = intent.type === "heavy";
    const dis = C.playerDodge;
    const r1 = d(20);
    const r2 = dis ? d(20) : null;
    const roll = dis ? Math.min(r1, r2) : r1;
    const ac = S.ac + (C.playerWard ? 3 : 0);
    const total = roll + 4;
    if (roll === 1) {
      addLog(`它掷出 <b>1</b>，笔尖偏了。落空。`, "info");
      sfx("miss");
      finishEnemyTurn();
      return;
    }
    if (roll === 20 || total >= ac) {
      const dmg = heavy ? d(6) + d(6) + 2 : d(6) + 2;
      addLog(
        `d20 ${roll}${dis ? `（劣势，取低）` : ""} + 4 = <b>${total}</b> vs AC ${ac}，命中：<b>${dmg}</b> 点伤害。`,
        "bad",
      );
      damagePlayer(dmg);
      sfx("hit");
    } else {
      addLog(`d20 ${roll}${dis ? "（劣势，取低）" : ""} + 4 = ${total} vs AC ${ac}，落空。`, "info");
      sfx("miss");
    }
    finishEnemyTurn();
  }

  function finishEnemyTurn() {
    const C = S.combat;
    if (!C || C.ended) return;
    C.turnIndex += 1;
    window.setTimeout(() => {
      if (!S.combat || S.combat.ended) return;
      nextTurn();
    }, 420);
  }

  function damageScribe(n) {
    const C = S.combat;
    if (!C || C.ended) return;
    C.scribe.hp = Math.max(0, C.scribe.hp - n);
    $("#enemy-card").classList.remove("is-hit");
    void $("#enemy-card").offsetWidth;
    $("#enemy-card").classList.add("is-hit");
    floatNumber($("#enemy-card"), `-${n}`, "bad");
    drawCombat();
    updateHud();
    if (C.scribe.hp <= 0) endCombat(true);
  }

  function damagePlayer(n) {
    const C = S.combat;
    if (!C || C.ended) return;
    S.hp = Math.max(0, S.hp - n);
    $("#player-card").classList.remove("is-hit");
    void $("#player-card").offsetWidth;
    $("#player-card").classList.add("is-hit");
    floatNumber($("#player-card"), `-${n}`, "bad");
    drawCombat();
    updateHud();
    if (S.hp <= 0) endCombat(false);
  }

  function healPlayer(n) {
    S.hp = clamp(S.hp + n, 0, S.maxHp);
    floatNumber($("#player-card"), `+${n}`, "good");
    drawCombat();
    updateHud();
  }

  function floatNumber(card, text, kind) {
    if (!card) return;
    const el = document.createElement("span");
    el.className = `float-num float-num--${kind}`;
    el.textContent = text;
    card.appendChild(el);
    window.setTimeout(() => el.remove(), 1000);
  }

  function playerAttack() {
    const C = S.combat;
    if (!C || !C.awaiting || C.ended) return;
    sfx("dice");
    let roll = d(20);
    let second = null;
    if (C.advantage) {
      second = d(20);
      roll = Math.max(roll, second);
    }
    const total = roll + 5;
    const ac = C.scribe.ac;
    if (roll === 1) {
      addLog(`你挥剑：d20 <b>1</b>，必定落空。`, "bad");
      sfx("miss");
    } else if (roll === 20) {
      const dmg = d(8) + d(8) + 3;
      addLog(`你挥剑：d20 <b>20</b>，暴击！<b>${dmg}</b> 点伤害。`, "good");
      sfx("hit");
      damageScribe(dmg);
    } else if (total >= ac) {
      const dmg = d(8) + 3;
      addLog(
        `你挥剑：d20 ${roll}${second != null ? "（优势取高）" : ""} + 5 = <b>${total}</b> vs AC ${ac}，<b>${dmg}</b> 点伤害。`,
        "good",
      );
      sfx("hit");
      damageScribe(dmg);
    } else {
      addLog(`你挥剑：d20 ${roll} + 5 = ${total} vs AC ${ac}，落空。`, "info");
      sfx("miss");
    }
    C.advantage = false;
    if (!C.ended) endPlayerAction();
  }

  function playerDodge() {
    const C = S.combat;
    if (!C || !C.awaiting || C.ended) return;
    C.playerDodge = true;
    addLog("你压低重心，准备闪避：直到你的下回合，它的攻击有劣势。", "good");
    endPlayerAction();
  }

  function drinkPotion() {
    const C = S.combat;
    if (!C || !C.awaiting || C.ended || C.potions <= 0) return;
    C.potions -= 1;
    S.potions = C.potions;
    const heal = d(4) + d(4) + 2;
    healPlayer(heal);
    addLog(`你灌下治疗药水，恢复 <b>${heal}</b> 点生命。`, "good");
    sfx("heal");
    endPlayerAction();
  }

  function ringBell() {
    const C = S.combat;
    if (!C || !C.awaiting || C.ended || !S.flags.bell || C.bellUsed) return;
    C.bellUsed = true;
    sfx("dice");
    const roll = d(20);
    const total = roll + 1;
    if (roll === 20 || total >= 13) {
      C.scribe.dazed = true;
      addLog(`你摇响苔铃：d20 ${roll} + 1 = <b>${total}</b> vs DC 13，抄写员陷入<b>恍惚</b>，下次行动跳过。`, "good");
      sfx("magic");
    } else {
      addLog(`你摇响苔铃：d20 ${roll} + 1 = ${total} vs DC 13，铃声被雾吞了。`, "info");
    }
    endPlayerAction();
  }

  function openWordCheck(key) {
    const C = S.combat;
    if (!C || !C.awaiting || C.ended) return;
    if (C.disabled.includes(key) || S.slots <= 0) return;
    const dlg = $("#dlg-wordcheck");
    $("#wc-word").textContent = WORDS[key].en;
    const options = SPELL_ORDER.map((k) => WORDS[k].zh);
    const wrap = $("#wc-options");
    const fb = $("#wc-feedback");
    fb.hidden = true;
    fb.className = "wc-feedback";
    wrap.innerHTML = "";
    options.forEach((zh) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "wc-option";
      b.textContent = zh;
      b.addEventListener("click", () => answerWordCheck(key, zh, b));
      wrap.appendChild(b);
    });
    dlg.showModal();
  }

  function answerWordCheck(key, chosen, btn) {
    const dlg = $("#dlg-wordcheck");
    const fb = $("#wc-feedback");
    const correct = WORDS[key].zh;
    const ok = chosen === correct;
    $$(".wc-option", dlg).forEach((b) => (b.disabled = true));
    btn.classList.add(ok ? "is-right" : "is-wrong");
    if (!ok) {
      $$(".wc-option", dlg).forEach((b) => {
        if (b.textContent === correct) b.classList.add("is-right");
      });
    }
    fb.hidden = false;
    fb.className = `wc-feedback ${ok ? "is-good" : "is-bad"}`;
    fb.textContent = ok
      ? `对了：${key} = ${correct}。法术成形。`
      : `不对：${key} = ${correct}。这个法术散了，本回合结束。`;
    const entry = S.words[key];
    if (ok) entry.right += 1;
    else entry.wrong += 1;
    entry.used = true;
    window.setTimeout(() => {
      dlg.close();
      if (!ok) {
        sfx("fail");
        addLog(`你念错了 <b>${key}</b> 的意思，法术散了。本回合结束。`, "bad");
        endPlayerAction();
        return;
      }
      castSpell(key);
    }, ok ? 420 : 900);
  }

  function castSpell(key) {
    const C = S.combat;
    if (!C || C.ended) return;
    S.slots = Math.max(0, S.slots - 1);
    C.slots = S.slots;
    S.words[key].used = true;
    if (key === "ward") {
      C.playerWard = true;
      addLog("你念出 <b>ward</b>：护符亮起，AC +3，直到你的下回合。", "good");
      sfx("magic");
    } else if (key === "mend") {
      const heal = d(8) + 3;
      healPlayer(heal);
      addLog(`你念出 <b>mend</b>：伤口合拢，恢复 <b>${heal}</b> 点生命。`, "good");
      sfx("heal");
    } else if (key === "scorch") {
      const saveRoll = d(20);
      const save = saveRoll + 1 >= 13;
      let dmg = d(6) + d(6);
      if (S.flags.weakness) dmg += 2;
      if (save) dmg = Math.floor(dmg / 2);
      addLog(
        `你念出 <b>scorch</b>：抄写员敏捷豁免 d20 ${saveRoll} + 1 = ${saveRoll + 1} vs DC 13，${
          save ? "成功，伤害减半" : "失败"
        }，受到 <b>${dmg}</b> 点伤害${S.flags.weakness ? "（+2 弱点）" : ""}。`,
        "good",
      );
      sfx("magic");
      damageScribe(dmg);
    } else if (key === "daze") {
      const saveRoll = d(20);
      const save = saveRoll + 1 >= 13;
      if (save) {
        addLog(`你念出 <b>daze</b>：抄写员感知豁免 d20 ${saveRoll} + 1 = ${saveRoll + 1} vs DC 13，成功了。`, "info");
      } else {
        C.scribe.dazed = true;
        addLog(`你念出 <b>daze</b>：抄写员感知豁免失败，陷入<b>恍惚</b>，下次行动跳过。`, "good");
        sfx("magic");
      }
    }
    if (!C.ended) endPlayerAction();
  }

  function endCombat(win) {
    const C = S.combat;
    if (!C || C.ended) return;
    C.ended = true;
    C.awaiting = false;
    drawCombat();
    if (win) {
      addLog("抄写员散成一地纸屑。账本上「守护」那一页重新显字。", "good");
      sfx("win");
    } else {
      addLog("你倒下了。雾盖住了账本。", "bad");
      sfx("lose");
    }
    window.setTimeout(() => {
      S.combat = null;
      goStory(win ? "s4_win" : "s4_lose");
    }, 1000);
  }

  /* ────────────────────────────── 复习 ────────────────────────────── */

  function showReview() {
    showScreen("review");
    S.quiz = { q1: null, q2: null };
    const used = SPELL_ORDER.filter((k) => S.words[k].right > 0).length;
    const disabled = SPELL_ORDER.filter((k) => S.words[k].disabled).length;
    $("#review-lead").textContent =
      `这一夜你遇到了 ${S.seen.size} 个词。` +
      `战斗里答对 ${used} 次${disabled ? `，被抄走 ${disabled} 个` : ""}。真实产品里，它们会按认义 / 拼写两条轨道排进 1/3/7/16 天的复习。`;

    $("#review-words").innerHTML = SPELL_ORDER.map((k) => {
      const w = WORDS[k];
      const st = S.words[k];
      let status = "剧情里见过 · 排进复习";
      let cls = "";
      if (st.disabled) {
        status = "战斗中被抄走 · 明天重点复习";
        cls = "is-bad";
      } else if (st.right > 0) {
        status = "战斗中用过并答对 · 明天再见";
        cls = "is-good";
      } else if (st.wrong > 0) {
        status = "战斗中答错 · 明天先复习";
        cls = "is-bad";
      }
      return `<article class="word-tile${st.disabled ? " is-disabled" : ""}">
        <div class="wt-word">${w.en}</div>
        <div class="wt-ipa">${w.ipa} · ${w.pos}</div>
        <div class="wt-zh">${w.zh}</div>
        <div class="wt-status ${cls}">${status}</div>
      </article>`;
    }).join("");

    const q1 = $("#quiz-1-options");
    q1.innerHTML = "";
    const shuffled = ["ward", "scorch", "mend", "daze"].sort(() => Math.random() - 0.5);
    shuffled.forEach((k) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "quiz-option";
      b.textContent = k;
      b.dataset.answer = k;
      b.addEventListener("click", () => answerQ1(k, b));
      q1.appendChild(b);
    });
    $("#quiz-1-feedback").hidden = true;
    $("#quiz-2-feedback").hidden = true;
    $("#quiz-2-input").value = "";
    $("#btn-review-done").hidden = true;
    $("#review-final").hidden = true;
    $("#review-final-text").textContent = "";
  }

  function answerQ1(key, btn) {
    if (S.quiz.q1) return;
    S.quiz.q1 = key;
    const ok = key === "ward";
    $$("#quiz-1-options .quiz-option").forEach((b) => {
      b.disabled = true;
      if (b.dataset.answer === "ward") b.classList.add("is-right");
    });
    if (!ok) btn.classList.add("is-wrong");
    const fb = $("#quiz-1-feedback");
    fb.hidden = false;
    fb.className = `quiz-feedback ${ok ? "is-good" : "is-bad"}`;
    fb.textContent = ok ? "对。ward 作名词是「守护」，作动词是「守护、抵挡」。" : "不对。ward 才是「守护；防护」；scorch 是烧焦，mend 是修补，daze 是使恍惚。";
    checkReviewDone();
  }

  function answerQ2() {
    if (S.quiz.q2) return;
    const value = $("#quiz-2-input").value.trim().toLowerCase();
    if (!value) return;
    S.quiz.q2 = value;
    const ok = value === "mend";
    const fb = $("#quiz-2-feedback");
    fb.hidden = false;
    fb.className = `quiz-feedback ${ok ? "is-good" : "is-bad"}`;
    fb.textContent = ok ? "拼对了：m-e-n-d，修补。" : `拼写是 mend（m-e-n-d）。你写的是「${value}」。`;
    $("#quiz-2-input").disabled = true;
    $("#quiz-2-check").disabled = true;
    checkReviewDone();
  }

  function checkReviewDone() {
    if (!S.quiz.q1 || !S.quiz.q2) return;
    const btn = $("#btn-review-done");
    btn.hidden = false;
    btn.focus({ preventScroll: true });
  }

  function finishReview() {
    const final = $("#review-final");
    $("#btn-review-done").hidden = true;
    final.hidden = false;
    const correct1 = S.quiz.q1 === "ward";
    const correct2 = S.quiz.q2 === "mend";
    $("#review-final-text").textContent =
      `这一夜的四词已排进「明天」的复习。演示到此结束。` +
      `\n\n` +
      `这张演示只做了一夜：3 段剧情、2 次检定、1 场战斗。` +
      `如果把它乘以 12 幕，就是一章；你可以据此判断，d20 + 分支 + 回合制战斗，值不值得为《拾词者》写更多内容。` +
      `\n\n` +
      `本次复习：认义 ${correct1 ? "1/1" : "0/1"}，拼写 ${correct2 ? "1/1" : "0/1"}。`;
    final.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
  }

  /* ────────────────────────────── 词笺 ────────────────────────────── */

  function openGlossary() {
    const list = $("#glossary-list");
    list.innerHTML = SPELL_ORDER.map((k) => {
      const w = WORDS[k];
      const st = S.words[k];
      let use = "还没用过";
      if (st.disabled) use = "本场被抄走";
      else if (st.right > 0) use = "战斗中答对";
      else if (st.wrong > 0) use = "战斗中答错";
      else if (st.used) use = "战斗中用过";
      return `<li class="glossary-item">
        <div>
          <div class="gi-word">${w.en} <span class="gi-ipa">${w.ipa}</span></div>
          <div class="gi-zh">${w.pos} ${w.zh}</div>
        </div>
        <span class="gi-use">${use}</span>
        <div class="gi-example">${w.example}</div>
      </li>`;
    }).join("");
    $("#dlg-glossary").showModal();
  }

  /* ────────────────────────────── 事件绑定 ────────────────────────────── */

  function bind() {
    $("#btn-start").addEventListener("click", () => {
      ensureAudio();
      goStory("s1");
    });
    $("#btn-rules").addEventListener("click", () => $("#dlg-rules").showModal());
    $("#btn-words").addEventListener("click", openGlossary);
    $("#btn-sound").addEventListener("click", () => {
      S.sound = !S.sound;
      const btn = $("#btn-sound");
      btn.classList.toggle("is-off", !S.sound);
      btn.setAttribute("aria-label", S.sound ? "关闭音效" : "开启音效");
      $("#sound-icon").textContent = S.sound ? "♪" : "♪";
      if (S.sound) sfx("magic");
    });
    $("#btn-attack").addEventListener("click", playerAttack);
    $("#btn-dodge").addEventListener("click", playerDodge);
    $("#btn-potion").addEventListener("click", drinkPotion);
    $("#btn-bell").addEventListener("click", ringBell);
    $("#btn-review-done").addEventListener("click", finishReview);
    $("#btn-restart").addEventListener("click", () => {
      S = freshState();
      showScreen("title");
    });
    $("#btn-cover").addEventListener("click", () => {
      S = freshState();
      showScreen("title");
    });
    $("#quiz-2-check").addEventListener("click", answerQ2);
    $("#quiz-2-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        answerQ2();
      }
    });
    $$("[data-close]").forEach((btn) => {
      btn.addEventListener("click", () => btn.closest("dialog").close());
    });
    $("#story-text").addEventListener("click", (e) => {
      const word = e.target.closest("[data-word]");
      if (word) openGlossary();
    });
    document.addEventListener("keydown", onKey);
  }

  function onKey(e) {
    const dlgOpen = document.querySelector("dialog[open]");
    if (dlgOpen) return;
    if (S.screen === "combat") {
      const C = S.combat;
      if (!C || !C.awaiting || C.ended) return;
      if (e.target.matches("input, textarea")) return;
      const k = e.key.toLowerCase();
      if (k === "1") {
        e.preventDefault();
        playerAttack();
      } else if (k === "2") {
        e.preventDefault();
        playerDodge();
      } else if (k === "3") {
        e.preventDefault();
        drinkPotion();
      } else if (k === "4") {
        e.preventDefault();
        ringBell();
      } else if (["q", "w", "e", "r"].includes(k)) {
        const idx = ["q", "w", "e", "r"].indexOf(k);
        const key = SPELL_ORDER[idx];
        const card = $(`[data-spell="${key}"]`);
        if (card && !card.disabled) {
          e.preventDefault();
          openWordCheck(key);
        }
      }
    }
  }

  /* ────────────────────────────── 启动 ────────────────────────────── */

  bind();
  showScreen("title");
  window.__dnd = { state: () => S };
  // 首屏不播放音效；音频上下文在第一次点击时创建。
})();
