/* 词咒 · 雾港检定
 * 可玩原型：单词识别作为 d20 的成功率因子，而不是判定本身。
 * 零依赖，纯前端；所有数值都在本文件里，便于评审时直接改。
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------- 常量

  const TIME_LIMIT = 12;      // 秒：超时视为答错
  const BONUS_FAST = 5;       // ≤5s  +3
  const BONUS_OK = 9;         // ≤9s  +2
  const HP_MAX = 4;
  const CLUE_MAX = 3;
  const THETA_STEP = 0.55;
  const ITEM_B = { 1: -1.0, 2: 0.0, 3: 1.0 }; // 三档词带的难度锚点

  const BAND_LABEL = {
    1: '高频词带 · 第 1–16 词',
    2: '中频词带 · 第 17–32 词',
    3: '低频词带 · 第 33–48 词',
  };
  const STAGE_LABEL = ['前期 · 雾港', '中期 · 灯塔与洞窟', '后期 · 雾中门'];
  const STAGE_INDEX = [0, 0, 1, 1, 2, 2];       // 第 n 幕属于哪个阶段
  const STAGE_BAND = [1, 2, 3];                  // 每个阶段开放的词带
  const STAGE_FAMILIAR = [0.55, 0.05, -0.65];    // 前期偏好熟悉词；后期偏好生疏词

  const SCENES = [
    {
      kicker: '序章 · 抵达',
      title: '雾港',
      narration: '渡船靠上湿滑的栈桥。雾把港口切成一条条窄巷，你只提着一盏灯，得先认出<em>栈桥</em>和潮水的方向。',
      check: '感知', attr: 2, dc: 10,
      success: '你顺着潮声找到系船柱，灯没灭，还从木板缝里摸到一枚旧铜扣。',
      failure: '你踩进齐踝的海水，灯罩裂了一道缝，下一步得摸黑走。',
      gain: '线索 +1',
    },
    {
      kicker: '第一幕 · 灯火',
      title: '沿街的窗',
      narration: '沿街的窗一扇扇亮起，又在你走近时熄灭。有人在雾里<em>招手</em>，也有人只是把灯挪开。',
      check: '洞察', attr: 2, dc: 12,
      success: '你看懂了那三次明灭，避开暗礁，找到一条通向灯塔的石阶。',
      failure: '你追着一盏根本不存在的灯，绕回原地，鞋底磨薄了一层。',
      gain: '线索 +1',
    },
    {
      kicker: '第二幕 · 旧灯塔',
      title: '断阶',
      narration: '灯塔的螺旋梯断了一截。海风从缺口灌进来，铁扶手在雾里<em>发凉</em>。',
      check: '敏捷', attr: 1, dc: 13,
      success: '你踩着锈死的铆钉跃过缺口，落在上层平台。',
      failure: '铁扶手在你手里断开，你摔回下层，肩膀撞在石壁上。',
      gain: '线索 +1',
    },
    {
      kicker: '第三幕 · 守塔人',
      title: '灯室',
      narration: '守塔人背对着你擦镜片。他听见了你的脚步，却没有回头。你得让他相信，你是来<em>帮忙</em>，不是来抢东西。',
      check: '魅力', attr: 2, dc: 15,
      success: '他放下镜片，把一枚旧透镜推到你面前，算是默许。',
      failure: '他把灯罩合上，只留一句「明天再来」。你退到楼梯口，线索少了一条。',
      gain: '线索 +1',
    },
    {
      kicker: '第四幕 · 潮汐洞窟',
      title: '石门',
      narration: '洞窟深处，一扇石门被潮水封住。门缝里透出微光，像有人在门后<em>呼吸</em>。',
      check: '力量', attr: 2, dc: 16,
      success: '你借着潮水的退势顶开石门，湿冷的风从门后涌出来。',
      failure: '石门纹丝不动。海水漫过脚踝，你退到干处，重新找支点。',
      gain: '线索 +1',
    },
    {
      kicker: '终章 · 雾中门',
      title: '无字门',
      narration: '雾的尽头立着一扇没有字的门。门上的纹路像一行没写完的句子，等你用<em>最后一点力气</em>补上。',
      check: '意志', attr: 3, dc: 18,
      success: '纹路亮起，雾退开一线。你听见门后有人念出你的名字。',
      failure: '门没有开。但雾里出现了另一条路——更窄，也算路。',
      gain: '线索 +1',
    },
  ];

  const $ = (id) => document.getElementById(id);

  // ---------------------------------------------------------------- 状态

  const S = {
    mode: 'word',          // 'word' | 'control'
    ei: 0,                 // 当前幕索引 0..5
    hp: HP_MAX,
    clues: 0,
    pool: [],
    theta: 0,
    answered: 0,
    correct: 0,
    results: [],
    lastWordId: null,
    current: null,         // { word, review }
    answeredThis: false,
    timerId: null,
    timerStart: 0,
    ended: false,
  };

  // ---------------------------------------------------------------- 词池

  function seedPool() {
    S.pool = window.WORDS.map((w) => {
      const mastery = w.rank <= 6 ? 2 : w.rank <= 14 ? 1 : 0;
      return {
        ...w,
        b: ITEM_B[w.band],
        mastery,
        lastSeen: -5,
        retired: false,
        retireAt: null,
        reviewAt: null,
        seen: 0,
        right: 0,
        wrong: 0,
      };
    });
  }

  function activeWords() { return S.pool.filter((w) => !w.retired); }
  function retiredWords() { return S.pool.filter((w) => w.retired); }

  function weightedPick(list) {
    const total = list.reduce((s, x) => s + Math.max(x.w, 0.001), 0);
    let r = Math.random() * total;
    for (const item of list) {
      r -= Math.max(item.w, 0.001);
      if (r <= 0) return item.value;
    }
    return list[list.length - 1].value;
  }

  function pickWord() {
    // 1) 回访：已撤出的词到期后，会在第 4、6 幕被点名抽查
    const dueReview = retiredWords().filter((w) => w.reviewAt !== null && w.reviewAt <= S.ei);
    const inReviewWindow = S.ei === 2 || S.ei === 3;
    const reviewSlam = S.ei === 3;
    if (dueReview.length && inReviewWindow && (reviewSlam || Math.random() < 0.5)) {
      const w = dueReview[Math.floor(Math.random() * dueReview.length)];
      return { word: w, review: true };
    }

    // 2) 正常抽词：当前阶段开放词带内，按「熟悉/生疏」与到期程度加权
    const stage = STAGE_INDEX[S.ei];
    const band = STAGE_BAND[stage];
    let cands = activeWords().filter((w) => w.band === band);
    if (!cands.length) cands = activeWords().filter((w) => w.band === Math.max(1, band - 1));
    if (!cands.length) cands = activeWords();
    if (!cands.length) return { word: null, review: false };

    const familiarity = STAGE_FAMILIAR[stage];
    const scored = cands.map((w) => {
      let s = 1;
      s += familiarity >= 0 ? w.mastery * familiarity : (2 - w.mastery) * -familiarity;
      if (S.ei - w.lastSeen >= 2) s += 0.6;          // 隔了几幕没见，优先召回
      if (w.id === S.lastWordId) s = -99;             // 不连续抽同一个词
      return { value: w, w: s + Math.random() * 0.4 };
    });
    const top = scored.sort((a, b) => b.w - a.w).slice(0, 4);
    return { word: weightedPick(top), review: false };
  }

  function distractorsFor(word) {
    const stage = STAGE_INDEX[S.ei];
    const pool = S.pool.filter((w) => w.id !== word.id && w.zh !== word.zh);
    const sameBand = pool.filter((w) => w.band === word.band);
    let source = sameBand.length >= 6 ? sameBand : pool;
    if (stage >= 1) {
      const samePos = source.filter((w) => w.pos === word.pos);
      if (samePos.length >= 4) source = samePos;
    }
    if (stage >= 2) {
      const close = source.filter((w) => Math.abs(w.en.length - word.en.length) <= 3);
      if (close.length >= 4) source = close;
    }
    const picked = [];
    const used = new Set([word.zh]);
    let guard = 0;
    while (picked.length < 3 && guard++ < 200) {
      const cand = source[Math.floor(Math.random() * source.length)];
      if (!cand || used.has(cand.zh)) continue;
      used.add(cand.zh);
      picked.push(cand);
    }
    return picked;
  }

  // ---------------------------------------------------------------- 概率

  function successCount(need) {
    // 天然 1 必败、天然 20 必成
    let n = 0;
    for (let r = 1; r <= 20; r++) {
      if (r === 20) n++;
      else if (r === 1) continue;
      else if (r >= need) n++;
    }
    return n;
  }

  function needFor(scene, wordBonus) {
    return scene.dc - scene.attr - wordBonus;
  }

  function percent(need) { return Math.round((successCount(need) / 20) * 100); }

  // ---------------------------------------------------------------- 渲染

  function renderActs() {
    const ol = $('acts');
    ol.innerHTML = '';
    for (let i = 0; i < SCENES.length; i++) {
      const li = document.createElement('li');
      if (i < S.ei) {
        const r = S.results[i];
        li.className = r && r.success ? 'done' : 'fail';
      } else if (i === S.ei) li.className = 'now';
      ol.appendChild(li);
    }
  }

  function renderScene() {
    const sc = SCENES[S.ei];
    const stage = STAGE_INDEX[S.ei];
    $('sceneKicker').textContent = sc.kicker;
    $('sceneTitle').textContent = sc.title;
    $('narration').innerHTML = sc.narration;
    $('checkName').textContent = sc.check;
    $('checkDc').textContent = 'DC ' + sc.dc;
    const bandNow = STAGE_BAND[stage];
    const familiarNow = ['低（偏好熟词）', '中', '高（偏好生疏词）'][stage];
    $('actLabel').textContent = STAGE_LABEL[stage] + ' · 第 ' + (S.ei + 1) + ' 幕';
    $('bandHint').textContent = '词带 ' + bandNow + ' · 生疏偏好 ' + familiarNow;

    const base = percent(needFor(sc, 0));
    const cap = percent(needFor(sc, S.mode === 'word' ? 3 : 0));
    $('modeChip').hidden = S.mode === 'word';
    $('baseProb').textContent = base + '%';
    $('maxProb').textContent = S.mode === 'word' ? cap + '%' : '—';
    renderActs();
  }

  function renderWord() {
    const { word, review } = S.current;
    const panel = $('wordPanel');
    if (S.mode !== 'word') { panel.hidden = true; return; }
    panel.hidden = false;

    $('bandChip').textContent = review ? '回访 · 记忆抽查' : BAND_LABEL[word.band].split(' · ')[0];
    $('bandChip').className = 'band-chip' + (review ? ' review' : '');
    $('wordEn').textContent = word.en;
    $('wordIpa').textContent = word.ipa;
    $('wordEn').setAttribute('lang', 'en');

    const opts = [{ text: word.zh, ok: true }].concat(
      distractorsFor(word).map((w) => ({ text: w.zh, ok: false }))
    );
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }

    const box = $('options');
    box.innerHTML = '';
    opts.forEach((o, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'option';
      b.dataset.ok = o.ok ? '1' : '0';
      b.innerHTML = '<span class="key">' + (i + 1) + '</span><span class="text"></span>';
      b.querySelector('.text').textContent = o.text;
      b.addEventListener('click', () => answer(o.ok, b));
      box.appendChild(b);
    });

    $('timerText').textContent = TIME_LIMIT.toFixed(1) + 's';
    $('timerText').className = 'timer-text';
    $('timerBar').style.transform = 'scaleX(1)';
    $('timerBar').className = '';
    startTimer();
  }

  function startTimer() {
    stopTimer();
    S.timerStart = performance.now();
    S.timerId = setInterval(() => {
      const left = TIME_LIMIT - (performance.now() - S.timerStart) / 1000;
      const t = Math.max(0, left);
      $('timerText').textContent = t.toFixed(1) + 's';
      $('timerBar').style.transform = 'scaleX(' + (t / TIME_LIMIT) + ')';
      const urgent = t <= 4;
      $('timerText').className = 'timer-text' + (urgent ? ' urgent' : '');
      $('timerBar').className = urgent ? 'urgent' : '';
      if (t <= 0) answer(false, null, true);
    }, 100);
  }

  function stopTimer() {
    if (S.timerId) clearInterval(S.timerId);
    S.timerId = null;
  }

  // ---------------------------------------------------------------- 作答

  function answer(ok, button, timeout) {
    if (S.answeredThis) return;
    S.answeredThis = true;
    stopTimer();

    const elapsed = (performance.now() - S.timerStart) / 1000;
    const word = S.current.word;

    // 高亮
    const buttons = Array.from(document.querySelectorAll('.option'));
    buttons.forEach((b) => {
      b.disabled = true;
      if (b.dataset.ok === '1') b.classList.add('correct');
      else if (b === button) b.classList.add('wrong');
      else b.classList.add('dimmed');
    });
    if (button && button.dataset.ok !== '1') button.classList.add('wrong');

    // 词力加值
    let bonus = 0;
    let tag = '失手';
    if (ok) {
      if (elapsed <= BONUS_FAST) { bonus = 3; tag = '灵光'; }
      else if (elapsed <= BONUS_OK) { bonus = 2; tag = '回忆'; }
      else { bonus = 1; tag = '勉强'; }
    }

    // 记忆更新
    word.seen += 1;
    word.lastSeen = S.ei;
    S.answered += 1;
    if (ok) {
      S.correct += 1;
      word.right += 1;
      word.mastery = Math.min(3, word.mastery + 1);
    } else {
      word.wrong += 1;
      word.mastery = Math.max(0, word.mastery - 1);
    }

    // 能力值 θ 更新（4 选 1 含 25% 猜对）
    const b = word.b;
    const p = 0.25 + 0.75 * sigmoid(1.7 * (S.theta - b));
    S.theta = clamp(S.theta + THETA_STEP * ((ok ? 1 : 0) - p), -1.8, 1.8);

    // 撤出 / 回访
    let retireMsg = null;
    if (S.current.review) {
      if (ok) {
        word.reviewAt = S.ei + 3;
        retireMsg = '回访通过：「' + word.en + '」继续封存';
      } else {
        word.retired = false;
        word.reviewAt = null;
        word.mastery = 2;
        retireMsg = '回访失手：「' + word.en + '」回到词灵池';
      }
    } else if (word.mastery >= 3 && !word.retired) {
      word.retired = true;
      word.retireAt = S.ei;
      word.reviewAt = S.ei + 3;
      retireMsg = '记忆撤出：「' + word.en + '」已封存，第 ' + (S.ei + 4) + ' 幕回访';
    }

    S.lastWordId = word.id;
    S.current = { ...S.current, bonus, tag, ok, elapsed, timeout: !!timeout, retireMsg };

    renderSide();
    showToast(retireMsg || (ok ? '词力 +' + bonus + ' · ' + tag : '词义没对上 · 词力 +0'));

    setTimeout(() => beginRoll(), 620);
  }

  function beginRoll() {
    const sc = SCENES[S.ei];
    const c = S.current;
    $('wordPanel').hidden = true;
    $('rollPanel').hidden = false;

    const bonus = S.mode === 'word' ? c.bonus : 0;
    const need = needFor(sc, bonus);
    renderMath(need, bonus, c);

    const dice = $('d20');
    const num = $('d20Num');
    dice.classList.add('rolling');
    let ticks = 0;
    const iv = setInterval(() => {
      num.textContent = 1 + Math.floor(Math.random() * 20);
      if (++ticks > 8) {
        clearInterval(iv);
        settleRoll(bonus, c);
      }
    }, 60);
  }

  function renderMath(need, bonus, c) {
    const sc = SCENES[S.ei];
    const bonusHtml = S.mode === 'word'
      ? '<span class="op">+</span><span class="piece word"><small>词力</small><b>+' + bonus + '</b></span>'
      : '';
    $('rollMath').innerHTML =
      '<span class="piece"><small>d20</small><b id="rollNum">?</b></span>' +
      '<span class="op">+</span>' +
      '<span class="piece"><small>' + sc.check + '</small><b>+' + sc.attr + '</b></span>' +
      bonusHtml +
      '<span class="op eq">vs</span>' +
      '<span class="piece"><small>DC</small><b>' + sc.dc + '</b></span>';
    $('verdict').textContent = '';
    $('verdict').className = 'verdict';
    $('outcome').innerHTML = '';
    $('nextBtn').hidden = true;
  }

  function settleRoll(bonus, c) {
    const sc = SCENES[S.ei];
    const roll = 1 + Math.floor(Math.random() * 20);
    const total = roll + sc.attr + bonus;
    const crit = roll === 20;
    const fumble = roll === 1;
    const success = crit ? true : fumble ? false : total >= sc.dc;

    const num = $('d20Num');
    num.textContent = roll;
    $('d20').classList.remove('rolling');
    $('d20').classList.toggle('crit', crit);
    $('d20').classList.toggle('fumble', fumble);
    const rn = document.getElementById('rollNum');
    if (rn) rn.textContent = roll;

    // 结果文案
    const rawSuccess = roll + sc.attr >= sc.dc;
    const byWord = success && !rawSuccess && !crit; // 靠词力翻盘
    const nearMiss = !success && total >= sc.dc - 1;

    let tagText = '';
    if (crit) tagText = '天然 20 · 直接成功';
    else if (fumble) tagText = '天然 1 · 直接失败';

    const verdict = $('verdict');
    verdict.textContent = success ? '检定成功' : '检定失败';
    verdict.className = 'verdict ' + (success ? 'ok' : 'no');
    if (tagText) verdict.textContent += ' · ' + tagText;

    // 剧情结算
    let extra = '';
    if (success) {
      if (S.clues < CLUE_MAX) {
        S.clues += 1;
        extra = '<span class="gain">' + sc.gain + '</span>';
      }
    } else {
      S.hp = Math.max(0, S.hp - 1);
      extra = '<span class="cost">体力 -1</span>';
    }

    let body = success ? sc.success : sc.failure;
    if (byWord) body += ' 若不是那一个词，这一下本来会落空。';
    if (nearMiss) body += ' 词力已经把它推到门口，门还是没开。';
    $('outcome').innerHTML = body + (extra ? ' ' + extra : '');

    const note = $('wordCheckNote');
    if (S.mode === 'word' && c.word) {
      const verdictWord = c.ok ? '词义 ✓ ' + c.tag + '（词力 +' + bonus + '）' : '词义 ✗（词力 +0）';
      const mem = c.retireMsg ? ' · ' + c.retireMsg : '';
      note.textContent = verdictWord + mem;
      note.hidden = false;
    } else {
      note.hidden = true;
    }

    S.results[S.ei] = {
      scene: S.ei + 1,
      wordId: c.word ? c.word.id : null,
      en: c.word ? c.word.en : '—',
      band: c.word ? c.word.band : null,
      review: !!c.review,
      ok: S.mode === 'word' ? c.ok : null,
      bonus,
      roll,
      attr: sc.attr,
      dc: sc.dc,
      total,
      success,
      byWord,
      crit,
      fumble,
    };

    addLog({ scene: S.ei + 1, roll, attr: sc.attr, bonus, total, dc: sc.dc, success, crit, fumble });
    renderSide();
    renderActs();

    const next = $('nextBtn');
    next.hidden = false;
    next.disabled = false;
    next.textContent = S.ei >= SCENES.length - 1 || S.hp <= 0 ? '查看航行记录' : '继续';
    next.onclick = advance;
    next.focus();
  }

  // ---------------------------------------------------------------- 侧栏

  function renderSide() {
    const pool = activeWords().sort((a, b) => a.rank - b.rank);
    $('poolCount').textContent = pool.length + ' / ' + S.pool.length;

    const pl = $('poolList');
    pl.innerHTML = '';
    pool.slice(0, 12).forEach((w) => pl.appendChild(wordRow(w, false)));
    if (pool.length > 12) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = '还有 ' + (pool.length - 12) + ' 个词在池中';
      pl.appendChild(li);
    }

    const ret = retiredWords().sort((a, b) => (a.reviewAt || 99) - (b.reviewAt || 99));
    $('retiredCount').textContent = ret.length;
    const rl = $('retiredList');
    rl.innerHTML = '';
    if (!ret.length) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = '还没有词撤出';
      rl.appendChild(li);
    } else {
      ret.forEach((w) => {
        const li = wordRow(w, true);
        const when = document.createElement('span');
        when.className = 'when';
        const left = (w.reviewAt ?? 99) - S.ei;
        when.textContent = left <= 0 ? '待回访' : left + ' 幕后来访';
        li.appendChild(when);
        rl.appendChild(li);
      });
    }

    const lg = $('rollLog');
    if (!S.log.length) {
      lg.innerHTML = '<li class="empty">还没掷骰</li>';
    } else {
      lg.innerHTML = '';
      S.log.slice(0, 8).forEach((l) => {
        const li = document.createElement('li');
        li.className = l.success ? 'ok' : 'no';
        const bonus = S.mode === 'word' ? ' +' + l.bonus + '词' : '';
        li.innerHTML = '<span class="r">' + (l.success ? '✓' : '✗') + '</span>' +
          '<span>第' + l.scene + '幕 · d20 ' + l.roll + ' +' + l.attr + bonus +
          ' = <b>' + l.total + '</b> vs ' + l.dc + '</span>';
        lg.appendChild(li);
      });
    }
  }

  function wordRow(w, retired) {
    const li = document.createElement('li');
    const en = document.createElement('span');
    en.className = 'w';
    en.textContent = w.en;
    const zh = document.createElement('span');
    zh.className = 'zh';
    zh.textContent = w.zh;
    const pips = document.createElement('span');
    pips.className = 'pips';
    for (let i = 0; i < 3; i++) {
      const p = document.createElement('i');
      if (i < w.mastery) p.className = w.mastery >= 3 ? 'hot' : 'on';
      pips.appendChild(p);
    }
    li.append(en, zh, pips);
    if (retired) li.style.opacity = '0.85';
    return li;
  }

  let log = [];
  Object.defineProperty(S, 'log', { get: () => log, set: (v) => { log = v; } });

  function addLog(entry) {
    log.unshift(entry);
    if (log.length > 30) log.pop();
  }

  function showToast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => { t.hidden = true; }, 300);
    }, 2200);
  }

  // ---------------------------------------------------------------- 回合

  function resetD20() {
    $('d20Num').textContent = '?';
    $('d20').classList.remove('crit', 'fumble', 'rolling');
  }

  function startScene() {
    if (S.ei >= SCENES.length || S.hp <= 0 || S.ended) return finish();
    resetD20();
    S.current = S.mode === 'word' ? pickWord() : { word: null, review: false };
    S.answeredThis = false;

    $('summary').hidden = true;
    $('scene').hidden = false;
    $('checkRow').hidden = false;
    $('rollPanel').hidden = true;

    const word = S.current.word;
    if (S.mode === 'word' && !word) { finish(); return; }

    renderScene();
    renderSide();
    if (S.mode === 'word') {
      renderWord();
    } else {
      $('wordPanel').hidden = true;
      $('maxProb').textContent = '—';
      showControlRoll();
    }
  }

  function showControlRoll() {
    // 对照模式：不测单词，直接掷 d20
    const sc = SCENES[S.ei];
    $('rollPanel').hidden = false;
    $('rollMath').innerHTML =
      '<span class="piece"><small>d20</small><b id="rollNum">?</b></span>' +
      '<span class="op">+</span>' +
      '<span class="piece"><small>' + sc.check + '</small><b>+' + sc.attr + '</b></span>' +
      '<span class="op eq">vs</span>' +
      '<span class="piece"><small>DC</small><b>' + sc.dc + '</b></span>';
    $('verdict').textContent = '';
    $('verdict').className = 'verdict';
    $('outcome').innerHTML = '<span class="muted">对照模式：这一局没有单词因子，只有 d20 与属性。</span>';
    const btn = $('nextBtn');
    btn.hidden = false;
    btn.textContent = '掷 d20';
    btn.onclick = () => {
      btn.disabled = true;
      beginRollControl();
    };
  }

  function beginRollControl() {
    const sc = SCENES[S.ei];
    const need = needFor(sc, 0);
    renderMath(need, 0, { word: { en: '—' }, bonus: 0, ok: null });
    const dice = $('d20');
    dice.classList.remove('crit', 'fumble');
    dice.classList.add('rolling');
    let ticks = 0;
    const iv = setInterval(() => {
      $('d20Num').textContent = 1 + Math.floor(Math.random() * 20);
      if (++ticks > 8) {
        clearInterval(iv);
        settleRollControl(need);
      }
    }, 60);
  }

  function settleRollControl() {
    settleRoll(0, { word: null, bonus: 0, ok: null, review: false });
  }

  function finish() {
    S.ended = true;
    stopTimer();
    const t = $('toast');
    t.classList.remove('show');
    t.hidden = true;
    $('wordPanel').hidden = true;
    $('rollPanel').hidden = true;
    $('scene').hidden = true;
    $('checkRow').hidden = true;
    $('summary').hidden = false;
    $('actLabel').textContent = '航行结束';
    $('acts').innerHTML = '';

    const results = S.results.filter(Boolean);
    const wins = results.filter((r) => r.success).length;
    const wordResults = results.filter((r) => r.ok !== null);
    const answered = wordResults.length;
    const right = wordResults.filter((r) => r.ok).length;
    const avgBonus = answered ? wordResults.reduce((s, r) => s + r.bonus, 0) / answered : 0;
    const byWord = results.filter((r) => r.byWord).length;
    const stillFail = results.filter((r) => r.ok && !r.success && !r.fumble).length;

    const bandStats = [1, 2, 3].map((band) => {
      const list = S.pool.filter((w) => w.band === band);
      const p = list.reduce((s, w) => s + (0.25 + 0.75 * sigmoid(1.7 * (S.theta - w.b))), 0) / list.length;
      return { band, p };
    });
    const vocab = vocabEstimate(S.theta);
    const vocabLo = vocabEstimate(S.theta - 0.3);
    const vocabHi = vocabEstimate(S.theta + 0.3);

    const startBand = bandStats[2].p >= 0.65 ? '低频词带（第 33–48 词）'
      : bandStats[1].p >= 0.72 ? '中频词带（第 17–32 词）'
      : '高频词带（第 1–16 词）';

    const modeNote = S.mode === 'word'
      ? '这一局里，单词只负责把成功率往上推：词力最高 +3，决定成败的仍然是 d20。'
      : '这是对照组：没有单词因子，只有 d20 + 属性。切回「词力加成」再走一遍，就能看到同一条雾港的差别。';

    $('summary').innerHTML =
      '<div class="scene-kicker">' + (S.hp <= 0 ? '力竭 · 航行中止' : '结算 · 你走到了雾中门') + '</div>' +
      '<h1>航行记录</h1>' +
      '<p class="lede">' + modeNote + '</p>' +

      '<div class="stat-grid">' +
      '<div class="stat"><b>' + wins + ' / ' + results.length + '</b><span>检定成功</span></div>' +
      '<div class="stat"><b>' + (S.mode === 'word' ? '+' + avgBonus.toFixed(1) : '—') + '</b><span>平均词力</span></div>' +
      '<div class="stat"><b>' + (S.mode === 'word' ? byWord : 0) + '</b><span>靠词力翻盘</span></div>' +
      '<div class="stat"><b>' + (S.mode === 'word' ? stillFail : 0) + '</b><span>有词力仍失败</span></div>' +
      '</div>' +

      '<h2 class="section-title">逐幕结果</h2>' +
      '<ul class="result-list">' +
      results.map((r) =>
        '<li><span class="act">第' + r.scene + '幕</span>' +
        '<span class="en">' + (r.en || '—') + (r.review ? ' · 回访' : '') + '</span>' +
        '<span class="detail">d20 ' + r.roll + ' + ' + r.attr +
        (S.mode === 'word' ? ' + ' + r.bonus + '词力' : '') + ' = ' + r.total + ' vs DC ' + r.dc + '</span>' +
        '<span class="' + (r.success ? 'tagok' : 'tagno') + '">' +
        (r.success ? '成功' : '失败') + (r.byWord ? ' · 词力翻盘' : '') + (r.crit ? ' · 天然20' : '') + (r.fumble ? ' · 天然1' : '') +
        '</span></li>'
      ).join('') +
      '</ul>' +

      (S.mode === 'word'
        ? '<div class="vocab">' +
          '<h2>你的词汇画像</h2>' +
          '<p class="big">本局答对 <b>' + right + ' / ' + answered + '</b> 个词，推断能力值 θ = <b>' + S.theta.toFixed(2) + '</b></p>' +
          '<div class="bands">' +
          bandStats.map((b) =>
            '<div class="band-row"><span>' + ['高频词', '中频词', '低频词'][b.band - 1] + '</span>' +
            '<span class="band-bar"><i style="width:' + Math.round(b.p * 100) + '%"></i></span>' +
            '<span class="pct">' + Math.round(b.p * 100) + '%</span></div>'
          ).join('') +
          '</div>' +
          '<p class="big">粗估四级词汇量 <b>' + fmt(vocabLo) + '–' + fmt(vocabHi) + '</b> 词</p>' +
          '<p class="caveat">模型折算：把 48 个核心词的三档词带当作大纲的易/中/难锚点，按 4 选 1（25% 猜对）更新能力值，再折算到 4530 词。它是原型级的粗估，不是测评结论；题量越多越稳。</p>' +
          '<p class="big">下一局建议从 <b>' + startBand + '</b> 开始</p>' +
          '<div class="summary-actions">' +
          '<button class="primary-btn" id="copyProfile" type="button">复制校准结果</button>' +
          '<button class="ghost-btn" id="againBtn" type="button">再走一遍</button>' +
          '</div></div>'
        : '<div class="vocab"><h2>对照模式</h2><p class="caveat">对照模式不测词汇量。打开右上角的「词力加成」，同一条雾港会变成单词检定。</p>' +
          '<div class="summary-actions"><button class="ghost-btn" id="againBtn" type="button">再走一遍</button></div></div>') +

      '<div class="summary-actions" id="summaryActions"></div>';

    const copy = $('copyProfile');
    if (copy) {
      copy.addEventListener('click', () => {
        const code = '词咒校准｜θ=' + S.theta.toFixed(2) +
          '｜答对 ' + right + '/' + answered +
          '｜高频 ' + Math.round(bandStats[0].p * 100) + '% 中频 ' +
          Math.round(bandStats[1].p * 100) + '% 低频 ' + Math.round(bandStats[2].p * 100) + '%' +
          '｜粗估 ' + fmt(vocabLo) + '–' + fmt(vocabHi) + ' 词';
        navigator.clipboard?.writeText(code).then(
          () => showToast('已复制：可以粘回给 bot'),
          () => showToast('复制失败，请手动记下：' + code)
        );
      });
    }
    const again = $('againBtn');
    if (again) again.addEventListener('click', () => startRun());

    renderSide();
  }

  // ---------------------------------------------------------------- 估计

  function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }
  function clamp(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }
  function fmt(n) { return Math.round(n / 100) * 100; }

  function vocabEstimate(theta) {
    // 4530 个大纲词，难度从 -1.5 到 1.5；4 选 1 含 25% 猜对
    let sum = 0;
    for (let r = 1; r <= 4530; r++) {
      const b = -1.5 + 3.0 * Math.pow(r / 4529, 0.8);
      sum += 0.25 + 0.75 * sigmoid(1.7 * (theta - b));
    }
    return sum;
  }

  // ---------------------------------------------------------------- 启动

  function advance() {
    S.ei += 1;
    startScene();
  }

  function startRun() {
    S.ei = 0;
    S.hp = HP_MAX;
    S.clues = 0;
    S.theta = 0;
    S.answered = 0;
    S.correct = 0;
    S.results = [];
    S.lastWordId = null;
    S.current = null;
    S.answeredThis = false;
    S.ended = false;
    log = [];
    $('summary').hidden = true;
    $('scene').hidden = false;
    $('checkRow').hidden = false;
    $('rollPanel').hidden = true;
    $('nextBtn').disabled = false;
    $('nextBtn').onclick = advance;
    seedPool();
    renderSide();
    startScene();
  }

  $('modeToggle').addEventListener('change', (e) => {
    S.mode = e.target.checked ? 'word' : 'control';
    showToast(S.mode === 'word' ? '词力加成已开启' : '对照模式：纯 d20');
    startRun();
  });

  $('restartBtn').addEventListener('click', () => startRun());

  const how = $('howDialog');
  $('howBtn').addEventListener('click', () => how.showModal());
  $('howClose').addEventListener('click', () => how.close());
  how.addEventListener('click', (e) => {
    if (e.target === how) how.close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    if (S.answeredThis) return;
    if (S.mode !== 'word' || !S.current) return;
    const n = Number(e.key);
    if (n >= 1 && n <= 4) {
      const btn = document.querySelectorAll('.option')[n - 1];
      if (btn && !btn.disabled) { e.preventDefault(); btn.click(); }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !$('rollPanel').hidden && !$('nextBtn').hidden) {
      const b = $('nextBtn');
      if (!b.disabled) { e.preventDefault(); b.click(); }
    }
  });

  startRun();
})();
