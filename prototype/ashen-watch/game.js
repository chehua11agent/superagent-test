/* 灰烬岗哨 · 一局 5e 跑团演示
   单页、无依赖、无外部请求。规则摘要基于 SRD 5.1；剧本与文本原创。 */
(() => {
  "use strict";

  /* ─────────────────────────── 工具 ─────────────────────────── */

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const d = (sides) => 1 + Math.floor(Math.random() * sides);
  const mod = (score) => Math.floor((score - 10) / 2);
  const sign = (n) => (n >= 0 ? `+${n}` : `${n}`);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const REDUCED =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ─────────────────────────── 数据 ─────────────────────────── */

  const HEROES = [
    {
      id: "bran",
      name: "布兰",
      cls: "战士 3",
      icon: "⚔",
      hp: 31,
      maxHp: 31,
      ac: 17,
      init: 1,
      prof: 2,
      stats: { str: 16, dex: 12, con: 14, int: 10, wis: 12, cha: 12 },
      atk: { name: "长剑", mod: 5, dice: [1, 8, 3], type: "挥砍" },
      main: "str",
      skills: { athletics: 5, intimidation: 3, perception: 3 },
      saves: { str: 5, con: 4 },
      secondWind: 1,
      rest: "回气恢复",
      tag: "前排",
      note: "31 HP · AC 17",
    },
    {
      id: "vera",
      name: "薇拉",
      cls: "游荡者 3",
      icon: "➶",
      hp: 24,
      maxHp: 24,
      ac: 14,
      init: 4,
      prof: 2,
      stats: { str: 8, dex: 18, con: 12, int: 12, wis: 14, cha: 14 },
      atk: { name: "短弓", mod: 6, dice: [1, 6, 4], type: "穿刺" },
      sneak: true,
      main: "dex",
      skills: { stealth: 6, survival: 4, persuasion: 4, insight: 4 },
      saves: { dex: 6 },
      rest: "无特殊资源",
      tag: "偷袭",
      note: "24 HP · AC 14",
    },
    {
      id: "oren",
      name: "奥伦",
      cls: "法师 3",
      icon: "✦",
      hp: 20,
      maxHp: 20,
      ac: 12,
      init: 2,
      prof: 2,
      stats: { str: 8, dex: 14, con: 12, int: 18, wis: 12, cha: 10 },
      atk: { name: "火焰箭", mod: 6, dice: [1, 10, 0], type: "火焰", spell: true },
      main: "int",
      skills: { investigation: 6, insight: 3, arcana: 6 },
      saves: { int: 6, wis: 3 },
      slots: 3,
      maxSlots: 3,
      rest: "奥术恢复 +1 法术位",
      tag: "法术",
      note: "20 HP · AC 12",
    },
  ];

  const ADA = {
    id: "ada",
    name: "艾达",
    cls: "守夜人",
    hp: 14,
    maxHp: 14,
    ac: 13,
    atk: { name: "长矛", mod: 4, dice: [1, 6, 2] },
    heal: true,
  };

  const ENEMY_DATA = {
    knight: {
      name: "灰烬骑士",
      ac: 16,
      maxHp: 55,
      init: 1,
      atk: 5,
      dice: [1, 8, 3],
      necro: 6,
      traits: "长剑 1d8+3 + 1d6 黯蚀 · 半血时灰烬爆发",
    },
    hound1: { name: "灰烬猎犬 A", ac: 12, maxHp: 11, init: 2, atk: 3, dice: [1, 6, 1], traits: "啃咬 1d6+1 · 群战优势" },
    hound2: { name: "灰烬猎犬 B", ac: 12, maxHp: 11, init: 2, atk: 3, dice: [1, 6, 1], traits: "啃咬 1d6+1 · 群战优势" },
  };

  const POIS = [
    {
      id: "gate",
      title: "大门与门闩",
      sub: "奥伦 · 调查 +4 · DC 12",
      who: "oren",
      skill: "调查",
      mod: 4,
      dc: 12,
      success: "门闩是从里面落下的，窗框上有一道新划痕——侧窗没锁。进去时你们不用再爬那道破门。",
      fail: "灰太厚，你只摸到一手冷铁。门闩在里面，看不到别的。",
      effect: "gate",
    },
    {
      id: "tracks",
      title: "崖边的拖痕",
      sub: "薇拉 · 生存 +4 · DC 13",
      who: "vera",
      skill: "生存",
      mod: 4,
      dc: 13,
      success: "拖痕从门缝一直延伸到侧窗，很深，很慢。有东西把一个人拖了进去。你们记住了它的路线——战斗第一回合，攻击有优势。",
      fail: "灰把痕迹盖住了。你只看出有人在这里站过。",
      effect: "tracks",
    },
    {
      id: "corpse",
      title: "烧焦的斥候",
      sub: "布兰 · 运动 +5 · DC 12",
      who: "bran",
      skill: "运动",
      mod: 5,
      dc: 12,
      success: "你搬开焦尸，下面压着一枚村子的铜徽和一瓶没碎的治疗药水。艾达会认得这枚徽章。",
      fail: "焦尸和地面冻在一起。你没能翻动它，只闻到一股甜腻的焦味。",
      effect: "corpse",
    },
  ];

  const RULES = [
    {
      id: "check",
      title: "检定（Ability Check）",
      html: `<p>当结果不确定、失败又有代价时，掷 <b>d20 + 属性调整值（+ 熟练加值，若熟练）</b>，与 <b>DC</b> 比较。≥ DC 成功。</p>
        <ul>
          <li>本演示的 DC：容易 10、中等 12–13、困难 15。</li>
          <li>检定失败不一定是死路：探索里只是少一条线索，社交里只是态度变差。</li>
        </ul>
        <span class="cite">SRD 5.1 · Ability Checks / Difficulty Class</span>`,
    },
    {
      id: "adv",
      title: "优势 / 劣势（Advantage / Disadvantage）",
      html: `<p>有优势时掷两次 d20 取高；有劣势时掷两次取低。两者同时存在则互相抵消。</p>
        <ul><li>本演示里：探索的拖痕给战斗第一回合优势；灰烬骑士的嚎叫给全队劣势；游荡者的隐匿与协助给下一次攻击优势。</li></ul>
        <span class="cite">SRD 5.1 · Advantage and Disadvantage</span>`,
    },
    {
      id: "save",
      title: "豁免（Saving Throw）",
      html: `<p>被法术、陷阱或吐息击中时，掷 <b>d20 + 属性调整值（+ 熟练加值，若熟练）</b> 对抗 DC。成功通常减半或免除效果。</p>
        <ul><li>本演示：侧窗塌陷的敏捷豁免、灰烬骑士嚎叫的感知豁免、灰烬爆发的敏捷豁免。</li></ul>
        <span class="cite">SRD 5.1 · Saving Throws</span>`,
    },
    {
      id: "combat",
      title: "战斗（Combat）",
      html: `<p><b>先攻</b>：战斗开始掷 d20 + 敏捷调整值，从高到低行动。</p>
        <ul>
          <li><b>攻击</b>：d20 + 命中加值 vs 目标 AC；命中后掷伤害骰。掷出 20 暴击（伤害骰翻倍），掷出 1 必定落空。</li>
          <li><b>动作</b>：每回合一个动作。本演示提供攻击、法术、闪避、协助、回气、药水等选项。</li>
          <li><b>闪避</b>：直到你的下回合，攻击你的检定有劣势。</li>
          <li><b>偷袭</b>：游荡者在有优势、或目标身边有队友时，额外 2d6 伤害。</li>
        </ul>
        <span class="cite">SRD 5.1 · Combat / Making an Attack / Sneak Attack</span>`,
    },
    {
      id: "death",
      title: "死亡豁免（Death Saving Throws）",
      html: `<p>0 HP 时陷入昏迷。每次轮到你时掷 d20：</p>
        <ul>
          <li>10 或更高：成功一次；累计 3 次成功即稳定。</li>
          <li>失败三次：死亡。</li>
          <li>掷出 20：恢复 1 HP；掷出 1：记两次失败。</li>
        </ul>
        <span class="cite">SRD 5.1 · Death Saving Throws</span>`,
    },
    {
      id: "rest",
      title: "短休（Short Rest）",
      html: `<p>短休至少 1 小时：可以花费生命骰恢复 HP；部分职业资源恢复。</p>
        <ul><li>本演示：每名角色花 1 个生命骰；战士的回气恢复；法师用奥术恢复换回 1 个法术位。</li></ul>
        <span class="cite">SRD 5.1 · Short Rest / Hit Dice / Arcane Recovery</span>`,
    },
    {
      id: "level",
      title: "经验与升级（XP & Leveling）",
      html: `<p>击败怪物、完成任务获得 XP；达到阈值升级。4 级时获得一次属性值提升（ASI）。</p>
        <ul><li>本演示为压缩节奏，把任务 XP 一次性发到 2,700，全队升到 4 级；属性提升自动加在主属性上。</li></ul>
        <span class="cite">SRD 5.1 · Level Advancement / Ability Score Improvement</span>`,
    },
    {
      id: "source",
      title: "这份规则书的来源",
      html: `<p>本演示的机制摘要参考 <b>System Reference Document 5.1（SRD 5.1）</b>，按 CC-BY-4.0 使用；没有复制《玩家手册》的译文、表格或美术。</p>
        <ul><li>剧本、角色、地名、对话与画面为原创。</li>
        <li>“D&amp;D / 龙与地下城”是 Wizards of the Coast 的商标；本页只用它说明规则风格，不声称官方授权。</li></ul>
        <span class="cite">SRD 5.1 · CC-BY-4.0 · https://media.wizards.com/2016/srd/5.1/SRD_CC_v5.1.pdf</span>`,
    },
  ];

  /* ─────────────────────────── 状态 ─────────────────────────── */

  const fresh = () => ({
    screen: "title",
    phase: "探索",
    party: HEROES.map((h) => ({
      ...h,
      stats: { ...h.stats },
      hp: h.hp,
      maxHp: h.maxHp,
      baseAc: h.ac,
      advNext: false,
      dodge: false,
      frightened: 0,
      down: false,
      dead: false,
      deathSaves: { ok: 0, fail: 0 },
      stable: false,
      slots: h.slots ?? 0,
      secondWind: h.secondWind ?? 0,
    })),
    ada: null,
    items: { potions: 1, oil: false, badge: false },
    flags: { gate: false, tracks: false, corpse: false, ally: false, hostile: false, mercy: false, truth: false, key: false, advantageInit: false },
    explore: { attempted: {}, done: 0, entered: false },
    social: { attempted: {}, done: false },
    rest: { bran: false, vera: false, oren: false, arcane: false },
    combat: null,
    stats: { checksOk: 0, checksFail: 0, rounds: 0, damageDealt: 0, damageTaken: 0, potions: 0 },
    sound: true,
    rulesOpen: "check",
    epilogue: null,
  });

  let S = fresh();

  /* ─────────────────────────── 音效 ─────────────────────────── */

  let audio = null;
  let noiseBuf = null;

  function ensureAudio() {
    if (audio) {
      if (audio.state === "suspended") audio.resume();
      return audio;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audio = new Ctx();
      const len = Math.floor(audio.sampleRate * 0.4);
      noiseBuf = audio.createBuffer(1, len, audio.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
      return audio;
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

  function noise({ dur = 0.16, gain = 0.05, freq = 1200, when = 0 }) {
    const ctx = ensureAudio();
    if (!ctx || !noiseBuf) return;
    const t0 = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
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
        noise({ dur: 0.12, gain: 0.07, freq: 360 });
        tone({ freq: 92, dur: 0.18, type: "sine", gain: 0.07, slide: -40 });
      } else if (name === "miss") {
        noise({ dur: 0.1, gain: 0.03, freq: 2200 });
      } else if (name === "heal") {
        tone({ freq: 523.25, dur: 0.16, gain: 0.04 });
        tone({ freq: 783.99, dur: 0.22, gain: 0.035, when: 0.1 });
      } else if (name === "magic") {
        tone({ freq: 392, dur: 0.2, type: "triangle", gain: 0.035 });
        tone({ freq: 587.33, dur: 0.28, gain: 0.03, when: 0.08 });
      } else if (name === "fail") {
        tone({ freq: 196, dur: 0.28, type: "sawtooth", gain: 0.03, slide: -60 });
      } else if (name === "win") {
        [392, 523.25, 659.25, 783.99].forEach((f, i) => tone({ freq: f, dur: 0.3, gain: 0.04, when: i * 0.11 }));
      } else if (name === "lose") {
        [220, 196, 164.81].forEach((f, i) => tone({ freq: f, dur: 0.42, type: "triangle", gain: 0.045, when: i * 0.16 }));
      }
    } catch {
      /* 音频不可用不影响流程 */
    }
  }

  /* ─────────────────────────── 骰子 ─────────────────────────── */

  function rollD20(mode = "normal") {
    const a = d(20);
    const b = mode === "normal" ? null : d(20);
    let used = a;
    if (mode === "adv") used = Math.max(a, b);
    if (mode === "dis") used = Math.min(a, b);
    return { a, b, used, mode };
  }

  function rollDice([count, sides, bonus]) {
    let sum = 0;
    const parts = [];
    for (let i = 0; i < count; i += 1) {
      const v = d(sides);
      sum += v;
      parts.push(v);
    }
    return { total: sum + bonus, parts, bonus, count, sides };
  }

  function showTray({ total, text, good }) {
    const tray = $("#dice-tray");
    if (!tray) return;
    tray.hidden = false;
    tray.className = `dice-tray${good === true ? " is-good" : good === false ? " is-bad" : ""}`;
    tray.innerHTML = `<span class="tray-die">${total}</span><span>${text}</span>`;
    clearTimeout(showTray.timer);
    showTray.timer = setTimeout(() => {
      tray.hidden = true;
    }, 5000);
  }

  function ensureTray() {
    if ($("#dice-tray")) return;
    const el = document.createElement("div");
    el.id = "dice-tray";
    el.className = "dice-tray";
    el.hidden = true;
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
  }

  /* ─────────────────────────── 画面切换 ─────────────────────────── */

  function showScreen(name) {
    S.screen = name;
    $$("[data-screen]").forEach((el) => {
      el.hidden = el.dataset.screen !== name;
    });
    $("#topbar").hidden = name === "title";
    window.scrollTo({ top: 0, behavior: REDUCED ? "auto" : "smooth" });
    const target = $(`[data-screen="${name}"]`);
    const h = target && $("h1", target);
    if (h) h.focus({ preventScroll: true });
  }

  function setProgress(text) {
    $("#scene-progress").textContent = text;
  }

  /* ─────────────────────────── 场景框架 ─────────────────────────── */

  function drawScene({ phase, title, art, text, extra = "", choices = [] }) {
    S.phase = phase;
    setProgress(phase);
    $("#phase-badge").textContent = phase;
    $("#scene-title").textContent = title;
    $("#scene-art").innerHTML = sceneArt(art);
    $("#scene-text").innerHTML = text.map((p) => `<p>${p}</p>`).join("");
    $("#scene-extra").innerHTML = extra;
    $("#scene-result").hidden = true;
    $("#scene-result").innerHTML = "";
    const wrap = $("#scene-choices");
    wrap.innerHTML = "";
    choices.forEach((c, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "choice";
      b.dataset.choice = String(i);
      b.disabled = Boolean(c.disabled);
      b.innerHTML = `<span class="choice-key">${"ABCDEFGH"[i] || i + 1}</span>
        <span class="choice-copy"><span class="choice-label">${c.label}</span>
        <span class="choice-sub">${c.sub || ""}</span></span>
        ${c.tag ? `<span class="choice-tag">${c.tag}</span>` : ""}`;
      b.addEventListener("click", () => {
        if (S.resultPending) return;
        c.onClick();
      });
      wrap.appendChild(b);
    });
    bindSceneExtra();
    renderPartyPanel();
  }

  function bindSceneExtra() {
    $$("[data-poi]").forEach((b) => {
      b.addEventListener("click", () => attemptPoi(b.dataset.poi));
    });
    $$("[data-rest]").forEach((b) => {
      b.addEventListener("click", () => spendHitDie(b.dataset.rest));
    });
    $$("[data-arcane]").forEach((b) => {
      b.addEventListener("click", () => arcaneRecovery());
    });
  }

  /* 检定：在故事里滚一次 d20，然后继续 */
  function rollCheck({ who, skill, mod: m, dc, successText, failText, onDone, mode = "normal" }) {
    if (S.resultPending) return;
    S.resultPending = true;
    $$("#scene-choices .choice").forEach((b) => {
      b.disabled = true;
    });
    const r = rollD20(mode);
    const total = r.used + m;
    const ok = total >= dc;
    if (ok) S.stats.checksOk += 1;
    else S.stats.checksFail += 1;
    showTray({
      total: r.used,
      text: `${who} · ${skill} ${sign(m)} = <b>${total}</b> vs DC ${dc}`,
      good: ok,
    });
    sfx("dice");
    window.setTimeout(() => sfx(ok ? "heal" : "fail"), 120);
    const card = $("#scene-result");
    card.hidden = false;
    card.innerHTML = `<div class="roll-card">
      <div class="roll-top">
        <div class="d20 ${r.used === 20 ? "is-crit" : r.used === 1 ? "is-fumble" : ""}">${r.used}</div>
        <div class="roll-meta">
          <span class="roll-formula">${who} · ${skill} · d20 ${r.used} ${sign(m)} = ${total} · DC ${dc}</span>
          <span class="roll-verdict ${ok ? "is-good" : "is-bad"}">${ok ? "成功" : "失败"}</span>
        </div>
      </div>
      <p class="roll-outcome">${ok ? successText : failText}</p>
      <div class="roll-actions"><button class="ghost-btn" type="button" id="roll-continue">继续</button></div>
    </div>`;
    $("#roll-continue").addEventListener("click", () => {
      S.resultPending = false;
      card.hidden = true;
      card.innerHTML = "";
      const tray = $("#dice-tray");
      if (tray) tray.hidden = true;
      onDone(ok);
    });
  }

  /* ─────────────────────────── 探索 ─────────────────────────── */

  function startExplore() {
    S.explore = { attempted: {}, done: 0, entered: false };
    showScreen("story");
    drawExplore();
  }

  function drawExplore() {
    const done = S.explore.done;
    const remaining = 2 - done;
    const poiHTML = POIS.map((p) => {
      const a = S.explore.attempted[p.id];
      const cls = a ? ` is-${a}` : "";
      return `<button class="poi-card${cls}" type="button" data-poi="${p.id}" ${a ? "disabled" : ""}>
        <b>${p.title}</b>
        <small>${p.sub}</small>
        <span class="poi-state">${a === "ok" ? "已查明" : a === "fail" ? "没查出什么" : "可调查"}</span>
      </button>`;
    }).join("");
    drawScene({
      phase: "探索",
      title: "三天没有烽火",
      art: "watch",
      text: [
        "灰从崖上落下来，像一场不凉的雪。岗哨的门从里面闩着，塔顶的烽火盆是冷的。",
        "村长说，三天前守夜人还在。现在只剩风穿过箭孔的声音。",
        `你们在门外还能看三处地方。<b>完成两处</b>就能进去；每处只查一次。${remaining > 0 ? `还差 ${remaining} 处。` : "路已经清楚。"}`,
      ],
      extra: `<div class="poi-grid">${poiHTML}</div>`,
      choices: [
        {
          label: done >= 2 ? "进入岗哨" : `再看一处（还差 ${remaining} 处）`,
          sub: done >= 2 ? "从侧窗翻进去" : "先把手边的线索看完",
          tag: "推进",
          disabled: done < 2,
          onClick: () => enterWatch(),
        },
      ],
    });
  }

  function attemptPoi(id) {
    if (S.resultPending) return;
    const poi = POIS.find((p) => p.id === id);
    if (!poi || S.explore.attempted[id]) return;
    const hero = S.party.find((h) => h.id === poi.who);
    rollCheck({
      who: `${hero.name}（${hero.cls.split(" ")[0]}）`,
      skill: poi.skill,
      mod: poi.mod,
      dc: poi.dc,
      successText: poi.success,
      failText: poi.fail,
      onDone: (ok) => {
        S.explore.attempted[id] = ok ? "ok" : "fail";
        S.explore.done += 1;
        if (ok) applyPoi(poi.effect);
        drawExplore();
      },
    });
  }

  function applyPoi(effect) {
    if (effect === "gate") {
      S.flags.gate = true;
    } else if (effect === "tracks") {
      S.flags.tracks = true;
      S.flags.advantageInit = true;
    } else if (effect === "corpse") {
      S.flags.corpse = true;
      S.items.badge = true;
      S.items.potions += 1;
    }
  }

  function enterWatch() {
    if (S.resultPending) return;
    if (S.flags.gate) {
      startSocial();
      return;
    }
    const vera = S.party.find((p) => p.id === "vera");
    rollCheck({
      who: "薇拉（游荡者）",
      skill: "敏捷豁免",
      mod: 6,
      dc: 13,
      successText: "薇拉贴着窗沿翻进去，碎木擦着她的背落下。毫发无伤。",
      failText: "侧窗塌了。薇拉被碎木划伤，损失 1d6 点生命。",
      onDone: (ok) => {
        if (!ok) {
          const dmg = d(6);
          vera.hp = Math.max(0, vera.hp - dmg);
          S.stats.damageTaken += dmg;
          if (vera.hp === 0) vera.down = true;
        }
        startSocial();
      },
    });
  }

  /* ─────────────────────────── 社交 ─────────────────────────── */

  function startSocial() {
    S.social = { attempted: {}, done: false };
    showScreen("story");
    drawSocial();
  }

  function drawSocial() {
    const opts = [];
    const att = S.social.attempted;

    if (S.items.badge) {
      opts.push({
        label: "把村徽放到桌上",
        sub: "不需要检定 · 艾达认得这枚徽章",
        tag: "剧情",
        disabled: att.badge,
        onClick: () => socialBadge(),
      });
    }
    opts.push({
      label: "「我们是来点烽火的。」",
      sub: "薇拉 · 说服 +4 · DC 13",
      tag: "社交",
      disabled: att.persuade,
      onClick: () => socialCheck("persuade"),
    });
    opts.push({
      label: "观察她握矛的手",
      sub: "奥伦 · 洞悉 +3 · DC 12",
      tag: "社交",
      disabled: att.insight,
      onClick: () => socialCheck("insight"),
    });
    if (S.flags.truth) {
      opts.push({
        label: "「你弟弟去守烽火了，对吗？」",
        sub: "知道真相后 · 不需要检定",
        tag: "剧情",
        disabled: att.mercy,
        onClick: () => socialCheck("mercy"),
      });
    }
    opts.push({
      label: "「让开，我们自己上去。」",
      sub: "布兰 · 威吓 +3 · DC 14",
      tag: "社交",
      disabled: att.intimidate,
      onClick: () => socialCheck("intimidate"),
    });
    opts.push({
      label: "上楼",
      sub: S.flags.ally ? "艾达会跟你们一起上去" : "楼梯在塔的北侧",
      tag: "推进",
      onClick: () => startCombat(),
    });

    const lines = [
      "塔里比外面暖。楼梯口亮着一盏灯，一个裹着斗篷的女人用长矛指着你们——她的左手垂着，袖口是黑的。",
      "「别上来。」她说，「上面那个东西已经不是人了。」",
      S.flags.truth
        ? "<b>你看见她说话时一直看着楼梯上方。</b>她不是怕你们，她是怕你们上去之后不回来。"
        : "她的目光在你和门之间来回移动，像在算你们是不是和三天前那批人一伙的。",
    ];

    drawScene({
      phase: "社交",
      title: "守夜人",
      art: "inside",
      text: lines,
      extra: `<div class="explore-foot"><span>艾达的处境：<b>受伤、警惕、孤身一人</b></span><span>${S.flags.ally ? "态度：友好" : S.flags.hostile ? "态度：敌对" : "态度：冷漠"}</span></div>`,
      choices: opts,
    });
  }

  function concludeSocial(kind, success) {
    if (kind === "badge") {
      S.flags.ally = true;
      S.flags.mercy = true;
      S.flags.key = true;
      S.items.oil = true;
      S.items.potions += 1;
    } else if (kind === "persuade") {
      if (success) {
        S.flags.ally = true;
        S.flags.key = true;
        S.items.oil = true;
        S.items.potions += 1;
      } else {
        S.flags.hostile = false;
        S.flags.ally = false;
      }
    } else if (kind === "insight") {
      if (success) {
        S.flags.truth = true;
      }
    } else if (kind === "mercy") {
      S.flags.mercy = true;
      S.flags.ally = true;
      S.flags.key = true;
      S.items.oil = true;
      S.items.potions += 1;
    } else if (kind === "intimidate") {
      if (success) {
        S.flags.key = true;
        S.flags.hostile = true;
        S.flags.ally = false;
      } else {
        S.flags.hostile = false;
      }
    } else if (kind === "badge") {
      S.flags.ally = true;
    }
    S.social.done = true;
    drawSocial();
  }

  function socialBadge() {
    S.social.attempted.badge = true;
    S.resultPending = true;
    const card = $("#scene-result");
    card.hidden = false;
    card.innerHTML = `<div class="roll-card">
      <div class="roll-top"><div class="d20">◆</div>
      <div class="roll-meta"><span class="roll-formula">不需要检定 · 出示村徽</span>
      <span class="roll-verdict is-good">成功</span></div></div>
      <p class="roll-outcome">艾达盯着徽章看了很久，把长矛放低。「……你们不是他们。」她从怀里摸出钥匙和一瓶火油，「他怕火。别让他碰烽火。」</p>
      <div class="roll-actions"><button class="ghost-btn" type="button" id="roll-continue">继续</button></div>
    </div>`;
    sfx("heal");
    $("#roll-continue").addEventListener("click", () => {
      S.resultPending = false;
      concludeSocial("badge", true);
    });
  }

  function socialCheck(kind) {
    if (S.resultPending || S.social.attempted[kind]) return;
    const map = {
      persuade: {
        who: "薇拉（游荡者）",
        skill: "说服",
        mod: 4,
        dc: 13,
        ok: "艾达的矛尖放低了。「点烽火的柴在楼上。你们最好真的是来点火的。」她把钥匙和一小瓶火油塞给薇拉。",
        fail: "「来点火的不会带刀站在门口。」她的矛没有放下。你们可以从她身侧挤过去，但她不会帮忙。",
      },
      insight: {
        who: "奥伦（法师）",
        skill: "洞悉",
        mod: 3,
        dc: 12,
        ok: "你注意到她说「上面那个东西」时，说的是「他」。楼梯上那件旧斗篷，和她的是一对。",
        fail: "她把自己裹得很紧，你看不出什么。",
      },
      intimidate: {
        who: "布兰（战士）",
        skill: "威吓",
        mod: 3,
        dc: 14,
        ok: "布兰往前走了一步。艾达退到墙边，把钥匙扔在地上。「拿去吧。别指望我替你们收尸。」",
        fail: "艾达笑了，笑得很干。「你吓不到一个已经守了三夜的人。」她退进楼梯的阴影里。",
      },
      mercy: {
        who: "艾达（守夜人）",
        skill: "剧情",
        mod: 0,
        dc: 0,
        ok: "「他叫凯尔。」艾达说，「三天前他上去点火，就再也没下来。如果你们能……别让他烧掉最后那面旗。」",
        fail: "",
      },
    };
    const c = map[kind];
    S.social.attempted[kind] = true;
    if (kind === "mercy") {
      S.resultPending = true;
      const card = $("#scene-result");
      card.hidden = false;
      card.innerHTML = `<div class="roll-card">
        <div class="roll-top"><div class="d20">◆</div>
        <div class="roll-meta"><span class="roll-formula">剧情 · 说出真相</span>
        <span class="roll-verdict is-good">继续</span></div></div>
        <p class="roll-outcome">${c.ok}</p>
        <div class="roll-actions"><button class="ghost-btn" type="button" id="roll-continue">继续</button></div>
      </div>`;
      $("#roll-continue").addEventListener("click", () => {
        S.resultPending = false;
        concludeSocial("mercy", true);
      });
      return;
    }
    rollCheck({
      who: c.who,
      skill: c.skill,
      mod: c.mod,
      dc: c.dc,
      successText: c.ok,
      failText: c.fail,
      onDone: (ok) => concludeSocial(kind, ok),
    });
  }

  /* ─────────────────────────── 战斗 ─────────────────────────── */

  function startCombat() {
    const order = [];
    S.party.forEach((pc) => {
      order.push({ kind: "pc", id: pc.id, init: d(20) + pc.init });
    });
    if (S.flags.ally) {
      const ada = { ...ADA, hp: 14, maxHp: 14, down: false, dead: false };
      S.ada = ada;
      order.push({ kind: "ada", id: "ada", init: d(20) + 2 });
    }
    order.push({ kind: "enemy", id: "knight", init: d(20) + 1 });
    order.push({ kind: "enemy", id: "hound1", init: d(20) + 2 });
    order.push({ kind: "enemy", id: "hound2", init: d(20) + 2 });
    order.sort((a, b) => b.init - a.init);
    S.combat = {
      round: 1,
      idx: 0,
      order,
      enemies: {
        knight: { ...ENEMY_DATA.knight, hp: ENEMY_DATA.knight.maxHp, dead: false, target: true },
        hound1: { ...ENEMY_DATA.hound1, hp: ENEMY_DATA.hound1.maxHp, dead: false },
        hound2: { ...ENEMY_DATA.hound2, hp: ENEMY_DATA.hound2.maxHp, dead: false },
      },
      target: "knight",
      awaiting: false,
      ended: false,
      howlDone: false,
      ashDone: false,
      log: [],
    };
    S.party.forEach((pc) => {
      pc.frightened = 0;
      pc.dodge = false;
      pc.advNext = false;
    });
    showScreen("combat");
    addLog(`先攻：${S.combat.order.map((o) => combatName(o)).join(" → ")}`, "roll");
    if (S.flags.advantageInit) addLog("拖痕让全队记住了路线：<b>第一回合攻击有优势</b>。", "good");
    if (S.flags.ally) addLog("艾达站在你们身侧，长矛压得很低。", "good");
    drawCombat();
    window.setTimeout(() => beginRound(), 500);
  }

  function combatName(entry) {
    if (entry.kind === "pc") {
      const pc = S.party.find((p) => p.id === entry.id);
      return pc ? pc.name : "?";
    }
    if (entry.kind === "ada") return "艾达";
    const e = S.combat.enemies[entry.id];
    return e ? e.name : "?";
  }

  function actorDead(actor) {
    const C = S.combat;
    if (actor.kind === "enemy") return C.enemies[actor.id].dead;
    if (actor.kind === "pc") {
      const pc = pcById(actor.id);
      return pc ? pc.dead : true;
    }
    return false;
  }

  function afterAction(delay = 420) {
    const C = S.combat;
    if (!C || C.ended) return;
    C.awaiting = false;
    drawCombat();
    window.setTimeout(() => {
      if (!S.combat || S.combat.ended) return;
      C.idx += 1;
      if (C.idx >= C.order.length) {
        C.idx = 0;
        C.round += 1;
        S.party.forEach((pc) => {
          if (pc.frightened > 0) pc.frightened -= 1;
        });
        beginRound();
      } else {
        startTurn();
      }
    }, delay);
  }

  function beginRound() {
    const C = S.combat;
    if (!C || C.ended) return;
    S.stats.rounds = C.round;
    addLog(`—— 第 ${C.round} 回合 ——`, "roll");
    if (C.round === 1 && !C.howlDone) {
      C.howlDone = true;
      if (!S.flags.hostile) {
        addLog("灰烬骑士抬起头，铁盔里传出一声不属于人的嚎叫。感知豁免 DC 13。", "bad");
        let fearCount = 0;
        S.party.forEach((pc) => {
          if (pc.down || pc.dead) return;
          if (pc.hp <= 0) return;
          const roll = rollD20();
          const total = roll.used + (pc.saves.wis ?? 0);
          if (total < 13) {
            pc.frightened = 2;
            fearCount += 1;
            addLog(`${pc.name} 感知豁免 d20 ${roll.used} + ${pc.saves.wis ?? 0} = ${total}，失败：<b>恐惧</b>（攻击劣势，2 回合）。`, "bad");
          } else {
            addLog(`${pc.name} 感知豁免 ${total}，成功。`, "good");
          }
        });
        if (fearCount) sfx("fail");
      }
    }
    drawCombat();
    startTurn();
  }

  function startTurn() {
    const C = S.combat;
    if (!C || C.ended) return;
    const actor = C.order[C.idx];
    if (!actor || actorDead(actor)) {
      afterAction(100);
      return;
    }
    if (actor.kind === "pc") {
      const pc = pcById(actor.id);
      if (pc.hp <= 0) {
        pc.down = true;
        if (pc.stable) {
          addLog(`${pc.name} 仍昏迷但已稳定。`, "info");
          afterAction(500);
          return;
        }
        deathSave(pc);
        return;
      }
      pc.dodge = false;
      C.awaiting = true;
      C.activeId = pc.id;
      drawCombat();
      return;
    }
    C.awaiting = false;
    drawCombat();
    if (actor.kind === "ada") window.setTimeout(adaTurn, 700);
    else window.setTimeout(enemyTurn, 700);
  }

  function deathSave(pc) {
    addLog(`${pc.name} 倒在灰里，开始死亡豁免。`, "bad");
    drawCombat();
    window.setTimeout(() => {
      if (!S.combat || S.combat.ended) return;
      const r = d(20);
      if (r === 20) {
        pc.hp = 1;
        pc.down = false;
        pc.stable = false;
        pc.deathSaves = { ok: 0, fail: 0 };
        addLog(`${pc.name} 死亡豁免掷出 <b>20</b>，睁开了眼（1 HP）。`, "good");
        sfx("heal");
      } else if (r === 1) {
        pc.deathSaves.fail += 2;
        addLog(`${pc.name} 死亡豁免掷出 <b>1</b>，记两次失败（${pc.deathSaves.fail}/3）。`, "bad");
      } else if (r >= 10) {
        pc.deathSaves.ok += 1;
        addLog(`${pc.name} 死亡豁免 ${r}：成功（${pc.deathSaves.ok}/3）。`, "good");
      } else {
        pc.deathSaves.fail += 1;
        addLog(`${pc.name} 死亡豁免 ${r}：失败（${pc.deathSaves.fail}/3）。`, "bad");
      }
      if (pc.deathSaves.fail >= 3) {
        pc.dead = true;
        addLog(`${pc.name} 不再动了。`, "bad");
        sfx("lose");
      } else if (pc.deathSaves.ok >= 3) {
        pc.stable = true;
        addLog(`${pc.name} 稳定下来，但仍昏迷。`, "info");
      }
      drawCombat();
      if (checkDefeat()) return;
      afterAction(600);
    }, 800);
  }

  function enemyTurn() {
    const C = S.combat;
    if (!C || C.ended) return;
    const actor = C.order[C.idx];
    if (!actor || actor.kind !== "enemy") {
      afterAction(200);
      return;
    }
    const e = C.enemies[actor.id];
    if (!e || e.dead) {
      afterAction(200);
      return;
    }
    if (actor.id === "knight" && !C.ashDone && e.hp <= e.maxHp / 2) {
      C.ashDone = true;
      addLog("骑士半跪下去，铁甲缝里喷出一圈灰烬。所有人敏捷豁免 DC 13，失败 2d6。", "bad");
      S.party.forEach((pc) => {
        if (pc.down || pc.dead || pc.hp <= 0) return;
        const r = rollD20();
        const total = r.used + (pc.saves.dex ?? 0);
        const failDmg = d(6) + d(6);
        const dmg = total >= 13 ? Math.floor(failDmg / 2) : failDmg;
        addLog(`${pc.name} 敏捷豁免 d20 ${r.used} + ${pc.saves.dex ?? 0} = ${total} vs 13：${total >= 13 ? "减半" : "失败"}，${dmg} 点伤害。`, total >= 13 ? "info" : "bad");
        damagePC(pc, dmg, "灰烬爆发");
      });
      sfx("hit");
      if (checkDefeat()) return;
      window.setTimeout(() => knightAttack(e), 800);
      return;
    }
    if (actor.id === "knight") {
      knightAttack(e);
      return;
    }
    houndAttack(e, actor.id);
  }

  function knightAttack(e) {
    const target = randomConsciousPC();
    if (!target) {
      checkDefeat();
      return;
    }
    const roll = rollD20();
    const total = roll.used + e.atk;
    if (roll.used === 1 || (roll.used !== 20 && total < target.ac)) {
      addLog(`${e.name} 挥剑：d20 ${roll.used} + ${e.atk} = ${total} vs AC ${target.ac}，落空。`, "info");
      sfx("miss");
    } else {
      const dmg = d(8) + 3 + d(6);
      damagePC(target, dmg, "长剑+黯蚀");
      addLog(`${e.name} 挥剑：d20 ${roll.used} + ${e.atk} = <b>${total}</b> vs AC ${target.ac}，命中 <b>${target.name}</b>，${dmg} 点伤害。`, "bad");
      sfx("hit");
    }
    if (checkDefeat()) return;
    afterAction(650);
  }

  function houndAttack(e, id) {
    const C = S.combat;
    const target = randomConsciousPC();
    if (!target) {
      checkDefeat();
      return;
    }
    const pack = Object.entries(C.enemies).some(([k, v]) => k !== id && !v.dead && k !== "knight");
    const roll = rollD20(pack ? "adv" : "normal");
    const total = roll.used + e.atk;
    if (roll.used === 1 || (roll.used !== 20 && total < target.ac)) {
      addLog(`${e.name} 扑咬：d20 ${roll.used}${pack ? "（群战优势）" : ""} + ${e.atk} = ${total} vs AC ${target.ac}，落空。`, "info");
      sfx("miss");
    } else {
      const dmg = d(6) + 1;
      damagePC(target, dmg, "啃咬");
      addLog(`${e.name} 扑咬：d20 ${roll.used} + ${e.atk} = <b>${total}</b> vs AC ${target.ac}，命中 <b>${target.name}</b>，${dmg} 点伤害。`, "bad");
      sfx("hit");
    }
    if (checkDefeat()) return;
    afterAction(600);
  }

  function randomConsciousPC() {
    const alive = S.party.filter((p) => !p.down && !p.dead && p.hp > 0);
    return alive.length ? pick(alive) : null;
  }

  function damagePC(pc, amount, source) {
    pc.hp = Math.max(0, pc.hp - amount);
    S.stats.damageTaken += amount;
    if (pc.hp === 0 && !pc.down) {
      pc.down = true;
      pc.deathSaves = { ok: 0, fail: 0 };
      pc.stable = false;
      addLog(`<b>${pc.name}</b> 被${source}击倒，陷入昏迷。`, "bad");
    }
  }

  function checkDefeat() {
    const C = S.combat;
    if (!C || C.ended) return false;
    const standing = S.party.some((p) => !p.down && !p.dead && p.hp > 0);
    if (standing) return false;
    C.ended = true;
    addLog("最后一个人也倒下了。灰盖住了你们。", "bad");
    sfx("lose");
    window.setTimeout(() => {
      S.combat = null;
      epilogue(false);
    }, 1200);
    return true;
  }

  function checkVictory() {
    const C = S.combat;
    if (!C || C.ended) return false;
    if (!C.enemies.knight.dead) return false;
    C.ended = true;
    C.enemies.hound1.dead = true;
    C.enemies.hound2.dead = true;
    addLog("灰烬骑士跪倒，长剑插进石缝。两只猎犬化成两团灰，散了。", "good");
    sfx("win");
    window.setTimeout(() => {
      S.combat = null;
      shortRest();
    }, 1400);
    return true;
  }

  function adaTurn() {
    const C = S.combat;
    if (!C || C.ended) return;
    const downed = S.party.find((p) => p.down && !p.dead);
    if (downed) {
      const heal = d(8) + 2;
      downed.hp = Math.min(downed.maxHp, Math.max(1, downed.hp + heal));
      downed.down = false;
      downed.stable = false;
      downed.deathSaves = { ok: 0, fail: 0 };
      addLog(`艾达跪下来，把草药按在 <b>${downed.name}</b> 的伤口上：恢复 ${heal} 点生命，重新站起来。`, "good");
      sfx("heal");
      drawCombat();
      afterAction(600);
      return;
    }
    const key = !C.enemies.knight.dead ? "knight" : !C.enemies.hound1.dead ? "hound1" : !C.enemies.hound2.dead ? "hound2" : null;
    if (!key) {
      afterAction(200);
      return;
    }
    const e = C.enemies[key];
    const roll = d(20);
    const total = roll + S.ada.atk.mod;
    if (roll === 1 || (roll !== 20 && total < e.ac)) {
      addLog(`艾达刺出长矛：d20 ${roll} + ${S.ada.atk.mod} = ${total} vs AC ${e.ac}，落空。`, "info");
    } else {
      const dmg = d(6) + 2;
      damageEnemy(key, dmg);
      addLog(`艾达刺出长矛：<b>${total}</b> vs AC ${e.ac}，${dmg} 点伤害。`, "good");
      sfx("hit");
    }
    if (checkVictory()) return;
    afterAction(600);
  }

  /* 玩家动作 */

  function pcById(id) {
    return S.party.find((p) => p.id === id);
  }

  function damageEnemy(key, amount) {
    const C = S.combat;
    const e = C.enemies[key];
    if (!e || e.dead) return;
    e.hp = Math.max(0, e.hp - amount);
    S.stats.damageDealt += amount;
    if (e.hp === 0) {
      e.dead = true;
      if (C.target === key) {
        C.target = !C.enemies.knight.dead ? "knight" : !C.enemies.hound1.dead ? "hound1" : "hound2";
      }
      addLog(`<b>${e.name}</b> 倒下了。`, "good");
      const el = $(`[data-enemy="${key}"]`);
      if (el) {
        el.classList.remove("is-hit");
        void el.offsetWidth;
        el.classList.add("is-hit");
      }
    }
    drawCombat();
  }

  function chooseTarget(key) {
    const C = S.combat;
    if (!C || !C.enemies[key] || C.enemies[key].dead) return;
    C.target = key;
    drawCombat();
  }

  function currentPC() {
    const C = S.combat;
    if (!C || !C.awaiting) return null;
    return pcById(C.activeId);
  }

  function playerWeaponAttack() {
    const C = S.combat;
    const pc = currentPC();
    if (!pc || !C.awaiting) return;
    let targetKey = C.target;
    if (!C.enemies[targetKey] || C.enemies[targetKey].dead) {
      targetKey = C.enemies.knight.dead ? (C.enemies.hound1.dead ? "hound2" : "hound1") : "knight";
    }
    const e = C.enemies[targetKey];
    if (!e || e.dead) return;
    let adv = pc.advNext || (S.flags.advantageInit && C.round === 1);
    let dis = pc.frightened > 0;
    if (pc.dodge) {
      // 闪避只影响防御，不影响攻击
    }
    const mode = adv && dis ? "normal" : adv ? "adv" : dis ? "dis" : "normal";
    const roll = rollD20(mode);
    const total = roll.used + pc.atk.mod;
    const isCrit = roll.used === 20;
    const hit = roll.used === 20 || (roll.used !== 1 && total >= e.ac);
    if (!hit) {
      addLog(`${pc.name} 用${pc.atk.name}：d20 ${roll.used}${mode !== "normal" ? `（${mode === "adv" ? "优势" : "劣势"}）` : ""} + ${pc.atk.mod} = ${total} vs AC ${e.ac}，落空。`, "info");
      sfx("miss");
    } else {
      let dmg = d(pc.atk.dice[1]) + pc.atk.dice[2];
      if (isCrit) dmg += d(pc.atk.dice[1]);
      if (pc.sneak && (mode === "adv" || S.party.some((p) => p.id !== pc.id && !p.down && !p.dead))) {
        dmg += d(6) + d(6);
      }
      damageEnemy(targetKey, dmg);
      addLog(`${pc.name} 用${pc.atk.name}：d20 ${roll.used}${mode !== "normal" ? `（${mode === "adv" ? "优势" : "劣势"}）` : ""} + ${pc.atk.mod} = <b>${total}</b> vs AC ${e.ac}${isCrit ? "，<b>暴击</b>" : ""}，${dmg} 点伤害${pc.sneak && (mode === "adv" || S.party.some((p) => p.id !== pc.id && !p.down && !p.dead)) ? "（含偷袭）" : ""}。`, "good");
      sfx("hit");
    }
    pc.advNext = false;
    if (checkVictory()) return;
    afterAction();
  }

  function playerMagicMissile() {
    const C = S.combat;
    const pc = currentPC();
    if (!pc || !C.awaiting || pc.slots <= 0) return;
    let key = C.target;
    if (!C.enemies[key] || C.enemies[key].dead) key = C.enemies.knight.dead ? "hound1" : "knight";
    const e = C.enemies[key];
    if (!e || e.dead) return;
    pc.slots -= 1;
    let total = 0;
    const darts = 3;
    for (let i = 0; i < darts; i += 1) total += d(4) + 1;
    damageEnemy(key, total);
    addLog(`奥伦念出魔法飞弹：${darts} 发飞弹自动命中 <b>${e.name}</b>，${total} 点力场伤害。法术位 ${pc.slots}/${pc.maxSlots}。`, "good");
    sfx("magic");
    if (checkVictory()) return;
    afterAction();
  }

  function playerSecondWind() {
    const C = S.combat;
    const pc = currentPC();
    if (!pc || !C.awaiting || pc.secondWind <= 0) return;
    pc.secondWind -= 1;
    const heal = d(10) + 3;
    pc.hp = Math.min(pc.maxHp, pc.hp + heal);
    addLog(`${pc.name} 用回气稳住呼吸：恢复 <b>${heal}</b> 点生命。`, "good");
    sfx("heal");
    drawCombat();
    afterAction();
  }

  function playerHide() {
    const C = S.combat;
    const pc = currentPC();
    if (!pc || !C.awaiting) return;
    const roll = d(20);
    const total = roll + pc.skills.stealth;
    if (roll === 1 || (roll !== 20 && total < 13)) {
      addLog(`薇拉想躲进灰里：d20 ${roll} + ${pc.skills.stealth} = ${total} vs DC 13，失败。`, "info");
    } else {
      pc.advNext = true;
      addLog(`薇拉把自己埋进灰里：d20 ${roll} + ${pc.skills.stealth} = ${total} vs DC 13，成功。下一次攻击有优势。`, "good");
    }
    afterAction();
  }

  function playerHelp() {
    const C = S.combat;
    const pc = currentPC();
    if (!pc || !C.awaiting) return;
    const other = S.party.find((p) => p.id === "bran" && !p.down && !p.dead);
    if (!other) return;
    other.advNext = true;
    addLog(`${pc.name} 替布兰牵制敌人：布兰的下一次攻击有优势。`, "good");
    afterAction();
  }

  function playerDodge() {
    const C = S.combat;
    const pc = currentPC();
    if (!pc || !C.awaiting) return;
    pc.dodge = true;
    addLog(`${pc.name} 压低重心：直到下回合，攻击他的检定有劣势。`, "good");
    afterAction();
  }

  function playerPotion() {
    const C = S.combat;
    const pc = currentPC();
    if (!pc || !C.awaiting || S.items.potions <= 0) return;
    S.items.potions -= 1;
    S.stats.potions += 1;
    const heal = d(4) + d(4) + 2;
    pc.hp = Math.min(pc.maxHp, pc.hp + heal);
    addLog(`${pc.name} 灌下治疗药水：恢复 <b>${heal}</b> 点生命。`, "good");
    sfx("heal");
    drawCombat();
    afterAction();
  }

  function playerOil() {
    const C = S.combat;
    const pc = currentPC();
    if (!pc || !C.awaiting || !S.items.oil) return;
    S.items.oil = false;
    const dmg = d(6) + d(6);
    damageEnemy("knight", dmg);
    addLog(`${pc.name} 把火油泼向骑士，火舌顺着铁甲缝烧进去：<b>${dmg}</b> 点火焰伤害。`, "good");
    sfx("hit");
    if (checkVictory()) return;
    afterAction();
  }

  /* ─────────────────────────── 战斗渲染 ─────────────────────────── */

  function addLog(html, cls) {
    const C = S.combat;
    if (!C) return;
    C.log.push({ html, cls });
    renderLog();
  }

  function renderLog() {
    const C = S.combat;
    const log = $("#combat-log");
    if (!C || !log) return;
    log.innerHTML = C.log.slice(-14).map((l) => `<p class="${l.cls || ""}">${l.html}</p>`).join("");
    log.scrollTop = log.scrollHeight;
  }

  function drawCombat() {
    const C = S.combat;
    if (!C) return;
    setProgress(`战斗 ${C.round}`);
    // 先攻条
    $("#initiative").innerHTML =
      `<span class="init-label">先攻</span>` +
      C.order
        .map((o) => {
          let dead = false;
          if (o.kind === "enemy") dead = C.enemies[o.id].dead;
          if (o.kind === "pc") {
            const p = pcById(o.id);
            dead = p.dead;
          }
          const active = C.awaiting ? o.kind === "pc" && o.id === C.activeId : false;
          return `<span class="init-chip ${active ? "is-active" : ""} ${dead ? "is-dead" : ""} ${o.kind === "enemy" ? "is-enemy" : ""}">
            <b>${o.init}</b> ${combatName(o)}</span>`;
        })
        .join("");
    // 敌人
    $("#enemies").innerHTML = Object.entries(C.enemies)
      .map(([key, e]) => {
        if (e.dead) {
          return `<div class="enemy-card is-dead" data-enemy="${key}">
            <div class="enemy-art">${enemyArt(key)}</div>
            <div class="enemy-head"><span class="enemy-name">${e.name}</span><span class="enemy-ac">AC ${e.ac}</span></div>
            <div class="enemy-hp">已倒下</div>
          </div>`;
        }
        return `<button class="enemy-card ${C.target === key ? "is-target" : ""}" type="button" data-enemy="${key}" aria-label="选择目标：${e.name}">
          <div class="enemy-art">${enemyArt(key)}</div>
          <div class="enemy-head"><span class="enemy-name">${e.name}</span><span class="enemy-ac">AC ${e.ac}</span></div>
          <div class="enemy-hp">生命 ${e.hp}/${e.maxHp}<span class="hp-track hp-track--enemy"><i style="width:${(e.hp / e.maxHp) * 100}%"></i></span></div>
          <div class="enemy-traits">${e.traits || ""}</div>
        </button>`;
      })
      .join("");
    $$("[data-enemy]").forEach((el) => {
      el.addEventListener("click", () => chooseTarget(el.dataset.enemy));
    });

    // 当前行动
    const pc = currentPC();
    if (C.awaiting && pc) {
      const low = pc.hp / pc.maxHp < 0.35;
      $("#active-panel").innerHTML = `<div class="active-head">
        <div class="active-name">${pc.name} 的回合 <small>${pc.cls} · ${pc.atk.name} ${sign(pc.atk.mod)}</small></div>
        <div class="active-res">AC ${pc.ac} · 生命 <b>${pc.hp}/${pc.maxHp}</b></div>
      </div>
      <div class="action-grid">
        <button class="action-btn" type="button" data-act="attack"><b>${pc.atk.name}攻击</b><small>d20${sign(pc.atk.mod)} vs AC · ${pc.atk.dice[0]}d${pc.atk.dice[1]}+${pc.atk.dice[2]}</small></button>
        ${pc.id === "bran" ? `<button class="action-btn" type="button" data-act="wind" ${pc.secondWind <= 0 ? "disabled" : ""}><b>回气</b><small>治疗 1d10+3 · 剩余 ${pc.secondWind}</small></button>` : ""}
        ${pc.id === "vera" ? `<button class="action-btn" type="button" data-act="hide"><b>隐匿</b><small>DC 13 · 下次攻击优势</small></button>
          <button class="action-btn" type="button" data-act="help"><b>协助布兰</b><small>给布兰下一次攻击优势</small></button>` : ""}
        ${pc.id === "oren" ? `<button class="action-btn" type="button" data-act="mm" ${pc.slots <= 0 ? "disabled" : ""}><b>魔法飞弹</b><small>3d4+3 自动命中 · 法术位 ${pc.slots}</small></button>` : ""}
        <button class="action-btn" type="button" data-act="dodge"><b>闪避</b><small>攻击你有劣势</small></button>
        <button class="action-btn" type="button" data-act="potion" ${S.items.potions <= 0 ? "disabled" : ""}><b>治疗药水</b><small>2d4+2 · 剩 ${S.items.potions}</small></button>
        ${S.items.oil ? `<button class="action-btn" type="button" data-act="oil"><b>泼火油</b><small>2d6 火焰 · 对骑士</small></button>` : ""}
      </div>
      <p class="active-hint">目标：${C.enemies[C.target] && !C.enemies[C.target].dead ? C.enemies[C.target].name : "选择一名敌人"}。点敌人卡切换目标。</p>`;
      $$("[data-act]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const a = btn.dataset.act;
          if (a === "attack") playerWeaponAttack();
          else if (a === "wind") playerSecondWind();
          else if (a === "hide") playerHide();
          else if (a === "help") playerHelp();
          else if (a === "mm") playerMagicMissile();
          else if (a === "dodge") playerDodge();
          else if (a === "potion") playerPotion();
          else if (a === "oil") playerOil();
        });
      });
    } else {
      const downed = S.party.find((p) => p.down && !p.dead);
      $("#active-panel").innerHTML = `<div class="active-head">
        <div class="active-name">${C.ended ? "战斗结束" : "等待行动"}</div>
        <div class="active-res">${downed ? `${downed.name} 昏迷中` : ""}</div>
      </div>
      <p class="active-hint">${C.ended ? "尘埃落定。" : "灰烬骑士正在行动……"}</p>`;
    }
    // 队伍条
    $("#party-strip").innerHTML = S.party.map(pcCardHTML).join("");
    renderLog();
    if (C.awaiting && C.activeId) {
      const active = $(`[data-screen="combat"] .party-strip .pc-card[data-pc="${C.activeId}"]`);
      if (active) active.classList.add("is-active");
    }
  }

  /* ─────────────────────────── 短休 / 奖励 ─────────────────────────── */

  function shortRest() {
    showScreen("story");
    drawRest();
  }

  function drawRest() {
    const cards = S.party
      .map((pc) => {
        const used = S.rest[pc.id];
        const hitDie = pc.id === "bran" ? "d10" : pc.id === "vera" ? "d8" : "d6";
        if (pc.dead) {
          return `<div class="rest-card">
            <h3>${pc.name} <small style="color:var(--paper-muted);font-family:var(--sans);font-size:10px">${pc.cls}</small></h3>
            <p>阵亡 · 无法短休</p>
          </div>`;
        }
        return `<div class="rest-card">
          <h3>${pc.name} <small style="color:var(--paper-muted);font-family:var(--sans);font-size:10px">${pc.cls}</small></h3>
          <p>生命 ${pc.hp}/${pc.maxHp} · 生命骰 ${hitDie}</p>
          <button type="button" data-rest="${pc.id}" ${used ? "disabled" : ""}>${used ? "已花生命骰" : "花 1 个生命骰"}</button>
          <span class="rest-result">${used ? used : ""}</span>
        </div>`;
      })
      .join("");
    const oren = pcById("oren");
    const arcane = S.rest.arcane;
    drawScene({
      phase: "短休",
      title: "把火点起来",
      art: "rest",
      text: [
        "烽火盆里还压着半层旧灰。你们把火油和干柴塞进去，火苗先舔了一下，然后站稳了。",
        "塔下的村子会看见这盏火。现在你们有一个小时，可以坐下来处理伤口。",
        "<b>短休：</b>每名角色花一个生命骰回血；战士的回气恢复；法师可以用奥术恢复换回一个法术位。",
      ],
      extra: `<div class="rest-grid">${cards}</div>`,
      choices: [
        { label: "结束短休", sub: "清点战利品、经验与升级", tag: "推进", onClick: () => rewards() },
      ],
    });
    const arcaneCard = document.createElement("div");
    arcaneCard.className = "rest-card";
    arcaneCard.innerHTML = `<h3>奥伦 · 奥术恢复</h3><p>短休一次，换回 1 个法术位。</p>
      <button type="button" id="arcane-btn" ${arcane || !oren ? "disabled" : ""}>${arcane ? "已恢复" : "奥术恢复"}</button>
      <span class="rest-result">${arcane ? "已恢复" : ""}</span>`;
    const grid = $("#scene-extra .rest-grid");
    if (grid) grid.appendChild(arcaneCard);
    const ab = $("#arcane-btn");
    if (ab) ab.addEventListener("click", arcaneRecovery);
  }

  function spendHitDie(id) {
    if (S.rest[id]) return;
    const pc = pcById(id);
    if (!pc || pc.dead) return;
    const die = id === "bran" ? 10 : id === "vera" ? 8 : 6;
    const bonus = mod(pc.stats.con);
    const roll = d(die) + bonus;
    pc.hp = Math.min(pc.maxHp, pc.hp + Math.max(1, roll));
    if (pc.hp > 0 && pc.down) {
      pc.down = false;
      pc.stable = false;
      pc.deathSaves = { ok: 0, fail: 0 };
    }
    S.rest[id] = `+${roll}`;
    sfx("heal");
    drawRest();
  }

  function arcaneRecovery() {
    const oren = pcById("oren");
    if (!oren || S.rest.arcane) return;
    S.rest.arcane = true;
    oren.slots = Math.min(oren.maxSlots, oren.slots + 1);
    sfx("magic");
    drawRest();
  }

  function rewards() {
    showScreen("story");
    drawRewards();
  }

  function drawRewards() {
    drawScene({
      phase: "成长",
      title: "战利品与经验",
      art: "dawn",
      text: [
        "烽火点起来了。塔下传来一阵很远的钟声——村子看见了。",
        "你们在骑士的盔甲里找到 80 枚金币和一把银短剑；艾达把一面烧了一半的旗从墙上取下来，叠好。",
        "<b>任务完成：2,700 XP。</b>三个人的等级都跨过 4 级门槛。",
      ],
      extra: `<div class="reward-grid">
        <div class="reward-card"><h3>战利品</h3><p>80 gp · 银短剑 · 治疗药水 ×1（已入队）</p></div>
        <div class="reward-card"><h3>等级</h3><p>全队 3 → 4 级：最大生命 +（布兰 7 / 薇拉 6 / 奥伦 5），并获得一次属性值提升。</p></div>
        <div class="reward-card"><h3>属性提升</h3><p>布兰 力量 16→18；薇拉 敏捷 18→20；奥伦 智力 18→20。攻击、豁免与技能随之提高。</p></div>
      </div>`,
      choices: [
        { label: "收下这一夜", sub: "看尾声与全部环节的回顾", tag: "推进", onClick: () => levelUp() },
      ],
    });
  }

  function levelUp() {
    if (S.epilogue) return;
    S.party.forEach((pc) => {
      const gain = pc.id === "bran" ? 7 : pc.id === "vera" ? 6 : 5;
      pc.maxHp += gain;
      pc.hp = Math.min(pc.maxHp, pc.hp + gain);
      pc.stats[pc.main] += 2;
      pc.atk.mod += 1;
      pc.level = (pc.level || 3) + 1;
      pc.cls = pc.cls.replace(/\d+/, "4");
      if (pc.id === "oren") pc.slots = Math.max(pc.slots, 1);
    });
    S.stats.level = 4;
    S.xp = 2700;
    epilogue(true);
  }

  /* ─────────────────────────── 尾声 ─────────────────────────── */

  function epilogue(win) {
    showScreen("epilogue");
    const mercy = S.flags.mercy;
    const ally = S.flags.ally;
    const survivors = S.party.filter((p) => !p.dead).length;
    const title = win ? "烽火" : "灰";
    $("#epilogue-title").textContent = title;
    let text = "";
    if (win) {
      text = [
        `烽火盆里的火一直烧到天亮。${ally ? "艾达靠在楼梯口，把长矛横在膝盖上。" : "守夜人的位置空着。"}`,
        mercy
          ? "骑士的剑被留在原处。艾达说，不用把它拔出来了——它已经守完了该守的夜。"
          : "骑士的盔甲彻底冷了。你们把剑从石缝里拔出来，立在火盆旁边，当作一块没有名字的碑。",
        "天亮前，村长带着人上山。他们看见火，先是跪下来，然后开始骂这三天里所有没上山的人。",
      ];
    } else {
      text = [
        "灰落下来，盖住长剑、火盆和你们的靴子。塔里安静得像从来没有过人。",
        "村长第二天带人上来。烽火没有点着，只在灰里找到半枚烧化的徽章。",
        "他把徽章放回口袋，说了一句「明年再修」。岗哨还在，只是又暗了一年。",
      ];
    }
    $("#epilogue-text").innerHTML = text.map((p) => `<p>${p}</p>`).join("");
    const items = [
      ["探索", `查了 ${S.explore.done}/3 处 · 陷阱豁免 ${S.flags.gate ? "绕过" : "触发"}`],
      ["社交", ally ? (mercy ? "艾达：友好（请求宽恕）" : "艾达：友好") : S.flags.hostile ? "艾达：敌对" : "艾达：冷漠"],
      ["战斗", `${S.stats.rounds} 回合 · 倒下 ${S.party.filter((p) => p.down || p.dead).length} 人`],
      ["短休", `花生命骰 ${["bran", "vera", "oren"].filter((id) => S.rest[id]).length} 次`],
      ["成长", win ? "4 级 · 2,700 XP" : "未完成"],
    ];
    $("#phase-summary").innerHTML = items
      .map(([h, p]) => `<div class="phase-item"><h3>${h}</h3><p>${p}</p></div>`)
      .join("");
    sfx(win ? "win" : "lose");
    S.epilogue = { win, mercy, ally, survivors };
    setProgress(win ? "完成" : "结束");
  }

  /* ─────────────────────────── 规则书 ─────────────────────────── */

  function openRules(section = "check") {
    const dlg = $("#dlg-rules");
    S.rulesOpen = section;
    renderRulesNav();
    renderRulesBody(section);
    if (!dlg.open) dlg.showModal();
  }

  function renderRulesNav() {
    $("#rules-nav").innerHTML = RULES.map(
      (r) => `<button type="button" data-rule="${r.id}" class="${S.rulesOpen === r.id ? "is-active" : ""}">${r.title.split("（")[0]}</button>`,
    ).join("");
    $$("#rules-nav [data-rule]").forEach((b) => b.addEventListener("click", () => {
      S.rulesOpen = b.dataset.rule;
      renderRulesNav();
      renderRulesBody(S.rulesOpen);
    }));
  }

  function renderRulesBody(id) {
    const r = RULES.find((x) => x.id === id) || RULES[0];
    $("#rules-body").innerHTML = `<div><h3>${r.title}</h3>${r.html}</div>`;
  }

  /* ─────────────────────────── 画面素材 ─────────────────────────── */

  function sceneArt(kind) {
    const defs = `<defs>
      <linearGradient id="sky-${kind}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0b0907"/><stop offset="1" stop-color="#2a1c12"/>
      </linearGradient>
      <radialGradient id="glow-${kind}" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#e07a2f" stop-opacity="0.5"/><stop offset="1" stop-color="#e07a2f" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="stone-${kind}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2b241d"/><stop offset="1" stop-color="#15120e"/>
      </linearGradient>
    </defs>`;
    if (kind === "watch") {
      return `<svg viewBox="0 0 640 320" role="img" aria-label="灰烬中的岗哨">
        ${defs}<rect width="640" height="320" fill="url(#sky-watch)"/>
        <circle cx="500" cy="54" r="42" fill="url(#glow-watch)" opacity="0.45"/>
        <circle cx="500" cy="54" r="17" fill="#e9dcc0" opacity="0.65"/>
        <path d="M0 262c90-22 180 12 300 0s240-20 340 2v56H0z" fill="#0b0907"/>
        <path d="M0 276c100-18 190 10 310-2s230 14 330 0" fill="none" stroke="#2b2116" stroke-width="2"/>
        <!-- 主塔 -->
        <path d="M248 268V96h148v172z" fill="url(#stone-watch)" stroke="#3b2f22" stroke-width="2"/>
        <path d="M240 100h164v-12H240z" fill="#3b2f22"/>
        <path d="M240 88h20v12h20V88h20v12h20V88h20v12h20V88h20v12h24" fill="#2b241d" stroke="#3b2f22" stroke-width="2"/>
        <!-- 烽火盆 -->
        <path d="M286 76h72l-8 22h-56z" fill="#2b241d" stroke="#4a3927" stroke-width="2"/>
        <g class="ember-glow"><circle cx="322" cy="62" r="34" fill="url(#glow-watch)" opacity="0.7"/>
          <path d="M322 50c9 9 12 19 8 26-3 5-9 8-15 8s-12-4-13-9c-1-7 5-13 12-18 2 6 7 7 7 3 0-3-1-6 1-10z" fill="#c8752f" opacity="0.65"/></g>
        <!-- 窗与门 -->
        <rect x="300" y="132" width="44" height="62" fill="#0c0906" stroke="#4a3927" stroke-width="3"/>
        <path d="M300 163h44M322 132v62" stroke="#4a3927" stroke-width="2"/>
        <path d="M292 268v-52a30 30 0 0 1 60 0v52z" fill="#070504" stroke="#3b2f22" stroke-width="3"/>
        <path d="M286 268h72" stroke="#3b2f22" stroke-width="4"/>
        <!-- 侧墙 -->
        <path d="M396 268V150l74 28v90z" fill="#1a1510" stroke="#3b2f22" stroke-width="2"/>
        <path d="M404 176h56M404 200h56M404 224h56" stroke="#2b2116" stroke-width="2"/>
        <g class="fog" opacity="0.5"><ellipse cx="140" cy="284" rx="180" ry="18" fill="#cfc3a6" opacity="0.08"/><ellipse cx="500" cy="298" rx="200" ry="20" fill="#cfc3a6" opacity="0.06"/></g>
        <g class="ash" opacity="0.5"><circle cx="150" cy="120" r="1.2" fill="#d9c9a8"/><circle cx="440" cy="90" r="1" fill="#d9c9a8"/><circle cx="560" cy="170" r="1.3" fill="#d9c9a8"/></g>
      </svg>`;
    }
    if (kind === "inside") {
      return `<svg viewBox="0 0 640 320" role="img" aria-label="岗哨内部，守夜人举着灯">
        ${defs}<rect width="640" height="320" fill="#15110d"/>
        <path d="M0 250h640v70H0z" fill="#1d1712"/>
        <path d="M120 250V70l100-40 100 40v180" fill="none" stroke="#3b2f22" stroke-width="3"/>
        <path d="M320 250V60l100-34 100 34v190" fill="none" stroke="#3b2f22" stroke-width="3"/>
        <rect x="180" y="120" width="60" height="80" fill="#0c0906" stroke="#4a3927" stroke-width="2"/>
        <g class="ember-glow"><circle cx="470" cy="150" r="52" fill="url(#glow-inside)" opacity="0.5"/>
          <path d="M470 126v-8M456 132h28l-5 26h-18z" fill="#2b2118" stroke="#c8752f" stroke-width="2"/>
          <path d="M461 136h18l-3 16h-12z" fill="#e07a2f" opacity="0.8"/></g>
        <g><path d="M250 250c2-34 8-60 24-66 14-5 24 16 22 40-2 16-5 22-8 26h-38z" fill="#0a0705"/>
          <circle cx="276" cy="174" r="13" fill="#0a0705"/>
          <path d="M286 192l22 10" stroke="#0a0705" stroke-width="6" stroke-linecap="round"/>
          <path d="M306 202l28-34" stroke="#8a6a44" stroke-width="3" stroke-linecap="round"/></g>
        <path d="M520 300h60v20h-60z" fill="#241b12"/>
      </svg>`;
    }
    if (kind === "rest") {
      return `<svg viewBox="0 0 640 320" role="img" aria-label="点亮的烽火">
        ${defs}<rect width="640" height="320" fill="url(#sky-rest)"/>
        <circle cx="320" cy="210" r="120" fill="url(#glow-rest)" opacity="0.8"/>
        <path d="M0 280h640v40H0z" fill="#0b0907"/>
        <path d="M250 280h140l-24-46H274z" fill="#241b12" stroke="#4a3927" stroke-width="2"/>
        <g class="ember-glow">
          <path d="M320 150c22 22 30 44 20 62-7 13-22 20-38 20s-30-9-32-24c-2-18 12-34 28-46 6 18 18 20 18 10 0-9-2-14 4-22z" fill="#e07a2f"/>
          <path d="M320 186c10 12 14 24 8 34-4 7-12 11-20 11s-14-4-16-10c-2-9 5-17 12-23 2 7 8 8 8 4 0-4-1-7 2-10z" fill="#f2c56b"/>
        </g>
        <g class="ash" opacity="0.5"><circle cx="200" cy="120" r="1.2" fill="#d9c9a8"/><circle cx="420" cy="90" r="1" fill="#d9c9a8"/><circle cx="500" cy="160" r="1.3" fill="#d9c9a8"/></g>
      </svg>`;
    }
    if (kind === "combat") {
      return `<svg viewBox="0 0 640 320" role="img" aria-label="灰烬骑士与两只猎犬">
        ${defs}<rect width="640" height="320" fill="#0c0906"/>
        <circle cx="320" cy="150" r="150" fill="url(#glow-combat)" opacity="0.4"/>
        <g><path d="M270 300c5-80 16-140 48-154 30-13 54 22 48 82-4 34-10 60-14 72h-82z" fill="#0a0705"/>
          <path d="M300 160l-18-24 20-8 14 22z" fill="#2b241d"/>
          <circle cx="318" cy="118" r="18" fill="#0a0705"/>
          <circle cx="310" cy="116" r="2.4" fill="#e07a2f"/><circle cx="326" cy="116" r="2.4" fill="#e07a2f"/>
          <path d="M290 210l-40 44" stroke="#0a0705" stroke-width="10" stroke-linecap="round"/>
          <path d="M250 254l-6 34" stroke="#d9c9a8" stroke-width="4" stroke-linecap="round"/>
          <path d="M360 224l30 34" stroke="#0a0705" stroke-width="9" stroke-linecap="round"/></g>
        <g opacity="0.8"><path d="M440 300c0-20 8-34 24-34 18 0 26 16 26 34z" fill="#0a0705"/>
          <circle cx="484" cy="266" r="8" fill="#0a0705"/><path d="M478 260l-6-10" stroke="#0a0705" stroke-width="4"/>
          <path d="M440 296l-14 8M502 296l14 8" stroke="#0a0705" stroke-width="5"/>
          <circle cx="492" cy="264" r="1.8" fill="#e07a2f"/></g>
        <g opacity="0.7"><path d="M90 300c0-18 7-31 21-31 16 0 23 14 23 31z" fill="#0a0705"/>
          <circle cx="127" cy="270" r="7" fill="#0a0705"/><path d="M121 264l-5-9" stroke="#0a0705" stroke-width="4"/>
          <path d="M90 296l-12 8M142 296l12 8" stroke="#0a0705" stroke-width="5"/>
          <circle cx="134" cy="268" r="1.6" fill="#e07a2f"/></g>
        <g class="fog"><ellipse cx="320" cy="310" rx="300" ry="18" fill="#cfc3a6" opacity="0.08"/></g>
      </svg>`;
    }
    return `<svg viewBox="0 0 640 320" role="img" aria-label="天亮后的岗哨">
      ${defs}<rect width="640" height="320" fill="#2a2317"/>
      <rect x="400" y="40" width="160" height="120" fill="#f0e6d2" opacity="0.12"/>
      <path d="M0 250h640v70H0z" fill="#241b10"/>
      <path d="M240 250V120l80-40 80 40v130" fill="none" stroke="#4a3927" stroke-width="3"/>
      <g class="ember-glow"><circle cx="320" cy="170" r="46" fill="url(#glow-dawn)" opacity="0.4"/>
        <path d="M320 146c10 12 14 24 8 34-4 7-12 11-20 11s-14-4-16-10c-2-9 5-17 12-23 2 7 8 8 8 4 0-4-1-7 2-10z" fill="#e07a2f" opacity="0.8"/></g>
      <g opacity="0.6"><path d="M150 250c1-18 5-30 14-33 9-3 15 9 14 22-1 11-3 18-5 21h-23z" fill="#0a0705"/>
        <circle cx="164" cy="204" r="8" fill="#0a0705"/></g>
    </svg>`;
  }

  function enemyArt(key) {
    if (key === "knight") {
      return `<svg viewBox="0 0 220 110" role="img" aria-label="灰烬骑士">
        <defs><radialGradient id="kg" cx="0.5" cy="0.45" r="0.5"><stop offset="0" stop-color="#e07a2f" stop-opacity="0.28"/><stop offset="1" stop-color="#e07a2f" stop-opacity="0"/></radialGradient></defs>
        <rect width="220" height="110" fill="#0d0a07"/><circle cx="110" cy="55" r="48" fill="url(#kg)"/>
        <path d="M84 104c2-34 8-60 26-66 16-5 28 14 26 40-1 14-4 22-6 26H84z" fill="#080604"/>
        <path d="M96 44l-8-12 14-4 8 12z" fill="#2b241d"/>
        <circle cx="106" cy="32" r="9" fill="#080604"/><circle cx="102" cy="31" r="1.6" fill="#e07a2f"/><circle cx="111" cy="31" r="1.6" fill="#e07a2f"/>
        <path d="M92 66l-16 18" stroke="#080604" stroke-width="6" stroke-linecap="round"/>
        <path d="M76 84l-4 18" stroke="#d9c9a8" stroke-width="2.5" stroke-linecap="round"/>
      </svg>`;
    }
    return `<svg viewBox="0 0 220 110" role="img" aria-label="灰烬猎犬">
      <defs><radialGradient id="hg" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#e07a2f" stop-opacity="0.2"/><stop offset="1" stop-color="#e07a2f" stop-opacity="0"/></radialGradient></defs>
      <rect width="220" height="110" fill="#0d0a07"/><circle cx="110" cy="58" r="46" fill="url(#hg)"/>
      <path d="M60 94c0-20 10-34 30-34 22 0 34 14 34 34z" fill="#080604"/>
      <circle cx="122" cy="54" r="10" fill="#080604"/><path d="M114 46l-6-10" stroke="#080604" stroke-width="5" stroke-linecap="round"/>
      <path d="M60 92l-16 10M124 92l16 10" stroke="#080604" stroke-width="6" stroke-linecap="round"/>
      <circle cx="130" cy="52" r="2" fill="#e07a2f"/>
    </svg>`;
  }

  function pcCardHTML(pc) {
    const pct = Math.max(0, Math.round((pc.hp / pc.maxHp) * 100));
    const low = pc.hp / pc.maxHp < 0.35;
    const conds = [];
    if (pc.down) conds.push(`<span class="cond">昏迷</span>`);
    if (pc.dead) conds.push(`<span class="cond">死亡</span>`);
    if (pc.frightened > 0) conds.push(`<span class="cond">恐惧 ${pc.frightened}</span>`);
    if (pc.dodge) conds.push(`<span class="cond cond--good">闪避</span>`);
    if (pc.advNext) conds.push(`<span class="cond cond--good">优势</span>`);
    return `<div class="pc-card ${pc.down || pc.dead ? "is-down" : ""}" data-pc="${pc.id}">
      <div class="pc-top">
        <span class="pc-portrait" aria-hidden="true">${pc.icon}</span>
        <span class="pc-id"><span class="pc-name">${pc.name}</span><span class="pc-class">${pc.cls}</span></span>
      </div>
      <div class="pc-hp-row">
        <span class="hp-track hp-track--pc ${low ? "is-low" : ""}"><i style="width:${pct}%"></i></span>
        <span class="hp-text">${pc.hp}/${pc.maxHp}</span>
      </div>
      <div class="pc-meta"><span>AC <b>${pc.ac}</b></span><span>${pc.atk.name} <b>${sign(pc.atk.mod)}</b></span>${pc.id === "oren" ? `<span>法术位 <b>${pc.slots}</b></span>` : ""}</div>
      ${conds.length ? `<div class="pc-cond">${conds.join("")}</div>` : ""}
    </div>`;
  }

  function renderPartyPanel() {
    const panel = $("#party-panel");
    if (!panel) return;
    panel.innerHTML = `<div class="party-title"><span>队伍</span><span>${S.phase}</span></div>` + S.party.map(pcCardHTML).join("");
  }

  /* ─────────────────────────── 事件 ─────────────────────────── */

  function bind() {
    ensureTray();
    $("#btn-start").addEventListener("click", () => {
      ensureAudio();
      S = fresh();
      startExplore();
    });
    $("#btn-rules").addEventListener("click", () => openRules(S.phase === "战斗" ? "combat" : "check"));
    $("#btn-rules-title").addEventListener("click", () => openRules("check"));
    $("#rules-link").addEventListener("click", () => {
      const map = { 探索: "check", 社交: "check", 短休: "rest", 成长: "level", 战斗: "combat" };
      openRules(map[S.phase] || "check");
    });
    $("#btn-sound").addEventListener("click", () => {
      S.sound = !S.sound;
      const b = $("#btn-sound");
      b.classList.toggle("is-off", !S.sound);
      b.setAttribute("aria-label", S.sound ? "关闭音效" : "开启音效");
      if (S.sound) sfx("magic");
    });
    $$("[data-close]").forEach((b) => b.addEventListener("click", () => b.closest("dialog").close()));
    $("#btn-replay").addEventListener("click", () => {
      S = fresh();
      startExplore();
    });
    $("#btn-cover").addEventListener("click", () => {
      S = fresh();
      showScreen("title");
      setProgress("序幕");
    });
    document.addEventListener("keydown", (e) => {
      if (e.target.matches("input, textarea, select")) return;
      if (document.querySelector("dialog[open]")) return;
      if (S.screen === "combat" && !S.combat) return;
      if (e.key >= "1" && e.key <= "9") {
        const btn = $(`[data-screen="${S.screen}"] .choice[data-choice="${Number(e.key) - 1}"]`);
        if (btn && !btn.disabled) {
          e.preventDefault();
          btn.click();
        }
      }
    });
  }

  /* ─────────────────────────── 启动 ─────────────────────────── */

  bind();
  showScreen("title");
  $("#topbar").hidden = true;
})();
