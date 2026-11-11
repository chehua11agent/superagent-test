/* 词汇实验室的纯逻辑层：词库、Zork 解析、FSRS 复习、IRT 测评。
 * 没有依赖，所有状态保存在 localStorage；重置按钮会清掉。
 */
(function () {
  'use strict';

  const WORDS = (window.LAB_WORDS || []).slice();
  const WORD_BY_ID = new Map(WORDS.map((w) => [w.id, w]));
  const WORD_BY_LEMMA = new Map(WORDS.map((w) => [w.word, w]));
  const STORAGE_KEY = 'lexicon-lab-v1';
  const VERSION = 1;
  const TARGET_ITEMS = 12;
  const GRID = [];
  for (let x = -3; x <= 3.0001; x += 0.1) GRID.push(Number(x.toFixed(1)));
  const PRIOR = (() => {
    const raw = GRID.map((x) => Math.exp(-0.5 * (x / 1.2) ** 2));
    const sum = raw.reduce((a, b) => a + b, 0);
    return raw.map((x) => x / sum);
  })();

  // ---------- 基础工具 ----------

  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const round = (x) => Math.round(x * 10) / 10;
  const sigmoid = (x) => 1 / (1 + Math.exp(-x));

  function todayISO(now) {
    const d = now ? new Date(now) : new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function addDays(iso, days) {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
    dt.setDate(dt.getDate() + Math.round(days));
    return todayISO(dt);
  }

  function daysBetween(a, b) {
    const [ay, am, ad] = a.split('-').map(Number);
    const [by, bm, bd] = b.split('-').map(Number);
    const A = Date.UTC(ay, am - 1, ad);
    const B = Date.UTC(by, bm - 1, bd);
    return Math.round((B - A) / 86400000);
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffleSeeded(items, seed) {
    const rng = mulberry32(seed);
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function pickSeeded(items, seed) {
    if (!items.length) return null;
    const rng = mulberry32(seed);
    return items[Math.floor(rng() * items.length)];
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ---------- 状态 ----------

  function freshState() {
    return {
      version: VERSION,
      words: {},
      events: [],
      fsrs: {},
      parser: {
        room: 'gate',
        inventory: [],
        keyTaken: false,
        doorUnlocked: false,
        lanternLowered: false,
        logRead: false,
        log: [
          { role: 'game', text: '你站在灯塔门口。门锁着，门边挂着一把黄铜钥匙，桌上有一盏提灯。' },
          { role: 'hint', text: '试试 look、take key、unlock door with key、read logbook。' }
        ],
        history: []
      },
      assessment: {
        started: false,
        done: false,
        target: TARGET_ITEMS,
        posterior: null,
        seen: [],
        responses: [],
        currentItem: null,
        theta: 0,
        se: 1.2,
        vhat: null,
        ci: null,
        perWord: null,
        bandCoverage: null
      }
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return freshState();
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== VERSION) return freshState();
      const base = freshState();
      return {
        ...base,
        ...parsed,
        parser: { ...base.parser, ...(parsed.parser || {}) },
        assessment: { ...base.assessment, ...(parsed.assessment || {}) }
      };
    } catch (error) {
      console.warn('读取实验状态失败，已重置。', error);
      return freshState();
    }
  }

  let state = loadState();

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('写入实验状态失败。', error);
    }
  }

  function ensureWord(id) {
    if (!state.words[id]) {
      state.words[id] = {
        skills: {},
        prior: null,
        pKnown: null,
        lastEvent: null
      };
    }
    return state.words[id];
  }

  function recomputePKnown(ws) {
    const records = Object.values(ws.skills || {}).filter((s) => s && s.attempts > 0);
    if (!records.length) {
      ws.pKnown = ws.prior == null ? null : ws.prior;
      return ws.pKnown;
    }
    const probabilities = records.map((s) => (1 + s.correct) / (2 + s.attempts));
    const evidence = Math.max(...probabilities);
    ws.pKnown = ws.prior == null ? evidence : Math.max(evidence, ws.prior * 0.35);
    return ws.pKnown;
  }

  function recordEvent({ wordId, skill, source, correct, score, meta }) {
    if (!WORD_BY_ID.has(wordId)) return null;
    const now = new Date();
    const event = {
      id: `${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
      at: now.toISOString(),
      wordId,
      skill,
      source,
      correct: correct == null ? null : Boolean(correct),
      score: score == null ? null : Number(score),
      meta: meta || {}
    };
    state.events.unshift(event);
    state.events = state.events.slice(0, 300);
    const ws = ensureWord(wordId);
    if (!ws.skills[skill]) ws.skills[skill] = { attempts: 0, correct: 0 };
    ws.skills[skill].attempts += 1;
    if (correct) ws.skills[skill].correct += 1;
    ws.lastEvent = event;
    recomputePKnown(ws);
    save();
    return event;
  }

  function statusOf(wordId) {
    const word = WORD_BY_ID.get(wordId);
    if (!word) return { key: 'unknown', label: '未知' };
    const ws = state.words[wordId];
    const hasEvents = Boolean(ws && ws.lastEvent);
    const p = ws?.pKnown;
    if (!hasEvents && (p == null || p < 0.5)) return { key: 'new', label: '未测' };
    if (!hasEvents && p >= 0.8) return { key: 'predicted', label: '预估认识' };
    if (!hasEvents && p != null) return { key: 'probe', label: '待验证' };
    if (ws.lastEvent && ws.lastEvent.correct === false) return { key: 'review', label: '需复习' };
    if (ws.skills.spell && ws.skills.spell.correct > 0) return { key: 'spelled', label: '会拼' };
    if (ws.skills.use && ws.skills.use.attempts > 0) return { key: 'used', label: '用过' };
    if (ws.skills.recognize && ws.skills.recognize.attempts > 0) return { key: 'seen', label: '认得' };
    return { key: 'new', label: '未测' };
  }

  function stats() {
    const eventWords = new Set(state.events.map((e) => e.wordId));
    const predicted = WORDS.filter((w) => {
      const ws = state.words[w.id];
      return ws && ws.pKnown != null && ws.pKnown >= 0.8;
    }).length;
    const due = fsrsDue().length;
    return {
      words: WORDS.length,
      cet4: WORDS.filter((w) => (w.tag || '').includes('cet4')).length,
      events: state.events.length,
      touchedWords: eventWords.size,
      predicted,
      due,
      assessed: state.assessment.done,
      vhat: state.assessment.vhat,
      theta: state.assessment.theta,
      se: state.assessment.se,
      bandCoverage: state.assessment.bandCoverage
    };
  }

  // ---------- Zork parser-lite ----------

  const ROOMS = {
    gate: {
      name: '灯塔门厅',
      desc: 'The door is locked. A brass key hangs by the frame. A lantern sits on the table.',
      zh: '门锁着。黄铜钥匙挂在门框边，桌上有一盏提灯。'
    },
    hall: {
      name: '灯塔内厅',
      desc: 'A logbook lies open. Stairs rise into the dark.',
      zh: '一本航海日志摊开着。楼梯向上伸进黑暗。'
    }
  };

  const VERB_ALIASES = {
    look: 'look', l: 'look', examine: 'examine', x: 'examine', inspect: 'examine',
    take: 'take', get: 'take', grab: 'take', unlock: 'unlock', open: 'unlock',
    use: 'use', go: 'go', walk: 'go', move: 'go', north: 'go', n: 'go', south: 'go', s: 'go',
    read: 'read', lower: 'lower', inventory: 'inventory', i: 'inventory', inv: 'inventory',
    help: 'help'
  };

  const NOUN_ALIASES = {
    door: 'door',
    key: 'key',
    'brass key': 'key',
    lantern: 'lantern',
    lamp: 'lantern',
    logbook: 'logbook',
    log: 'logbook',
    book: 'logbook',
    table: 'table',
    frame: 'frame',
    stairs: 'stairs',
    stair: 'stairs'
  };

  const PREPOSITIONS = new Set(['with', 'on', 'to', 'at', 'in', 'into', 'the', 'a', 'an', 'my']);
  const DIRECTIONS = new Set(['north', 'south', 'n', 's']);

  function normalize(raw) {
    return String(raw || '')
      .toLowerCase()
      .replace(/[^a-z0-9'\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function levenshtein(a, b) {
    const m = a.length;
    const n = b.length;
    if (!m) return n;
    if (!n) return m;
    const row = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i += 1) {
      let prev = row[0];
      row[0] = i;
      for (let j = 1; j <= n; j += 1) {
        const tmp = row[j];
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = tmp;
      }
    }
    return row[n];
  }

  function suggestionsFor(word, dictionary) {
    return Object.keys(dictionary)
      .filter((key) => Math.abs(key.length - word.length) <= 2)
      .map((key) => ({ key, distance: levenshtein(word, key) }))
      .filter((entry) => entry.distance <= 2)
      .sort((a, b) => a.distance - b.distance || a.key.localeCompare(b.key))
      .slice(0, 4)
      .map((entry) => entry.key);
  }

  function visibleNouns() {
    const p = state.parser;
    const rooms = {
      gate: ['door', 'key', 'lantern', 'table', 'frame'],
      hall: ['logbook', 'stairs']
    };
    const nouns = new Set(rooms[p.room] || []);
    if (p.inventory.includes('key')) nouns.add('key');
    if (p.inventory.includes('lantern')) nouns.add('lantern');
    return [...nouns];
  }

  function resolveNoun(token) {
    if (NOUN_ALIASES[token]) return NOUN_ALIASES[token];
    return null;
  }

  function parseCommand(raw) {
    const normalized = normalize(raw);
    const tokens = normalized ? normalized.split(' ') : [];
    const trace = [];
    const result = {
      ok: false,
      raw,
      normalized,
      verb: null,
      object: null,
      instrument: null,
      direction: null,
      message: '',
      suggestions: [],
      trace
    };
    if (!tokens.length) {
      result.message = '输入一个命令，比如 look 或 take key。';
      return result;
    }

    let direction = null;
    for (const token of tokens) {
      if (DIRECTIONS.has(token)) {
        direction = token === 's' ? 'south' : token === 'n' ? 'north' : token;
        break;
      }
    }

    let verbToken = null;
    let verb = null;
    for (const token of tokens) {
      if (VERB_ALIASES[token]) {
        verb = VERB_ALIASES[token];
        verbToken = token;
        break;
      }
    }
    if (!verb && direction) verb = 'go';
    if (!verb) {
      const suggestions = suggestionsFor(tokens[0], VERB_ALIASES);
      result.suggestions = suggestions;
      result.message = suggestions.length
        ? `我不认识 “${tokens[0]}” 这个动词。你是不是想试：${suggestions.join(' / ')}？`
        : `我不认识 “${tokens[0]}”。输入 help 看可用命令。`;
      trace.push({ token: tokens[0], role: 'unknown-verb' });
      return result;
    }
    result.verb = verb;
    trace.push({ token: verbToken || '(direction)', role: `verb → ${verb}` });

    const nounTokens = tokens.filter((token) => token !== verbToken && !PREPOSITIONS.has(token) && !DIRECTIONS.has(token));
    const nouns = nounTokens
      .map((token) => ({ token, noun: resolveNoun(token) }))
      .filter((entry) => entry.noun);

    if (nouns.length) {
      nouns.forEach((entry) => trace.push({ token: entry.token, role: `noun → ${entry.noun}` }));
      result.object = nouns[0].noun;
      // use key on door / unlock door with key
      if (verb === 'use' && nouns.length >= 2) {
        result.object = nouns[1].noun;
        result.instrument = nouns[0].noun;
      } else if (nouns.length >= 2) {
        result.instrument = nouns[1].noun;
      }
    }
    if (direction) {
      result.direction = direction;
      trace.push({ token: direction, role: `direction → ${direction}` });
    }

    if (verb === 'look' || verb === 'inventory' || verb === 'help') {
      result.ok = true;
      return result;
    }
    if (!result.object && verb !== 'go') {
      result.message = `“${verb}” 后面要跟一个名词，比如 ${verb} door。`;
      return result;
    }
    if (result.object && !visibleNouns().includes(result.object)) {
      result.message = `这里看不到 “${result.object}”。可见的有：${visibleNouns().join(', ')}。`;
      result.suggestions = visibleNouns();
      return result;
    }
    result.ok = true;
    return result;
  }

  function roomDescription() {
    const room = ROOMS[state.parser.room];
    return `${room.desc}\n${room.zh}`;
  }

  function pushLog(role, text) {
    state.parser.log.push({ role, text });
    state.parser.log = state.parser.log.slice(-40);
    state.parser.history.push(text);
    state.parser.history = state.parser.history.slice(-20);
  }

  function executeCommand(parsed) {
    const p = state.parser;
    const events = [];
    if (!parsed.ok) {
      pushLog('hint', parsed.message);
      return { ok: false, message: parsed.message, events };
    }
    const object = parsed.object;
    const instrument = parsed.instrument;

    if (parsed.verb === 'look') {
      pushLog('game', roomDescription());
      return { ok: true, message: roomDescription(), events };
    }
    if (parsed.verb === 'help') {
      const text = '可用命令：look / examine <物> / take key / unlock door with key / go north / read logbook / lower lantern / inventory。解析失败不会扣血。';
      pushLog('hint', text);
      return { ok: true, message: text, events };
    }
    if (parsed.verb === 'inventory') {
      const text = p.inventory.length ? `背包：${p.inventory.join(', ')}` : '背包是空的。';
      pushLog('game', text);
      return { ok: true, message: text, events };
    }
    if (parsed.verb === 'examine') {
      const details = {
        door: 'A heavy iron door. The lock is old, but the keyhole is clean.',
        key: 'A small brass key. It looks like it fits the door.',
        lantern: 'A brass lantern. The flame is low.',
        logbook: "A ship's logbook. The last entry is dated yesterday.",
        table: 'A plain wooden table.',
        frame: 'A warped wooden frame. The key usually hangs here.',
        stairs: 'Stone stairs disappearing into the dark.'
      };
      const text = details[object] || `You examine the ${object}.`;
      pushLog('game', text);
      if (['key', 'door', 'lantern', 'logbook'].includes(object)) {
        events.push({ wordId: `w_${object}`, skill: 'recognize', correct: true, source: 'parser', meta: { command: parsed.normalized } });
      }
      return { ok: true, message: text, events };
    }
    if (parsed.verb === 'take') {
      if (object !== 'key') {
        const text = `You can't take the ${object}.`;
        pushLog('hint', text);
        return { ok: false, message: text, events };
      }
      if (p.keyTaken) {
        const text = 'The key is already in your inventory.';
        pushLog('game', text);
        return { ok: true, message: text, events };
      }
      p.keyTaken = true;
      p.inventory.push('key');
      const text = 'You take the brass key. It is cold.';
      pushLog('game', text);
      events.push({ wordId: 'w_take', skill: 'use', correct: true, source: 'parser', meta: { command: parsed.normalized } });
      events.push({ wordId: 'w_key', skill: 'recognize', correct: true, source: 'parser', meta: { command: parsed.normalized } });
      events.push({ wordId: 'w_brass', skill: 'recognize', correct: true, source: 'parser', meta: { command: parsed.normalized } });
      return { ok: true, message: text, events };
    }
    if (parsed.verb === 'unlock' || parsed.verb === 'use') {
      if (object === 'key') {
        const text = 'Use the key on the door: 试试 unlock door with key。';
        pushLog('hint', text);
        return { ok: false, message: text, events };
      }
      if (object !== 'door') {
        const text = `You can't unlock the ${object}.`;
        pushLog('hint', text);
        return { ok: false, message: text, events };
      }
      if (p.doorUnlocked) {
        const text = 'The door is already open.';
        pushLog('game', text);
        return { ok: true, message: text, events };
      }
      if (!p.inventory.includes('key') && instrument !== 'key') {
        const text = 'The door is locked. You need a key. Try: take key.';
        pushLog('hint', text);
        return { ok: false, message: text, events };
      }
      p.doorUnlocked = true;
      const text = 'The lock yields with a soft click. The door is open.';
      pushLog('game', text);
      events.push({ wordId: 'w_unlock', skill: 'use', correct: true, source: 'parser', meta: { command: parsed.normalized } });
      events.push({ wordId: 'w_open', skill: 'use', correct: true, source: 'parser', meta: { command: parsed.normalized } });
      events.push({ wordId: 'w_key', skill: 'recognize', correct: true, source: 'parser', meta: { command: parsed.normalized } });
      events.push({ wordId: 'w_door', skill: 'recognize', correct: true, source: 'parser', meta: { command: parsed.normalized } });
      if (parsed.normalized.includes('brass')) {
        events.push({ wordId: 'w_brass', skill: 'recognize', correct: true, source: 'parser', meta: { command: parsed.normalized } });
      }
      return { ok: true, message: text, events };
    }
    if (parsed.verb === 'go') {
      const direction = parsed.direction || (parsed.normalized.includes('south') ? 'south' : 'north');
      if (direction === 'north') {
        if (p.room !== 'gate') {
          const text = 'You are already inside. The stairs go up, but this demo stops here.';
          pushLog('game', text);
          return { ok: true, message: text, events };
        }
        if (!p.doorUnlocked) {
          const text = 'The door is locked. Try unlock door with key.';
          pushLog('hint', text);
          return { ok: false, message: text, events };
        }
        p.room = 'hall';
        const text = roomDescription();
        pushLog('game', text);
        return { ok: true, message: text, events };
      }
      if (direction === 'south') {
        p.room = 'gate';
        const text = roomDescription();
        pushLog('game', text);
        return { ok: true, message: text, events };
      }
    }
    if (parsed.verb === 'read') {
      if (object !== 'logbook') {
        const text = `You can't read the ${object}.`;
        pushLog('hint', text);
        return { ok: false, message: text, events };
      }
      if (p.room !== 'hall') {
        const text = 'You need to go inside first. Try: go north.';
        pushLog('hint', text);
        return { ok: false, message: text, events };
      }
      p.logRead = true;
      const text = '“The tide rises at midnight. The lantern must be lowered before the fog returns.”';
      pushLog('game', text);
      events.push({ wordId: 'w_read', skill: 'use', correct: true, source: 'parser', meta: { command: parsed.normalized } });
      events.push({ wordId: 'w_logbook', skill: 'recognize', correct: true, source: 'parser', meta: { command: parsed.normalized } });
      return { ok: true, message: text, events };
    }
    if (parsed.verb === 'lower') {
      if (object !== 'lantern') {
        const text = `You can't lower the ${object}.`;
        pushLog('hint', text);
        return { ok: false, message: text, events };
      }
      p.lanternLowered = true;
      const text = 'You lower the lantern. The steps become visible.';
      pushLog('game', text);
      events.push({ wordId: 'w_lower', skill: 'use', correct: true, source: 'parser', meta: { command: parsed.normalized } });
      events.push({ wordId: 'w_lantern', skill: 'recognize', correct: true, source: 'parser', meta: { command: parsed.normalized } });
      return { ok: true, message: text, events };
    }
    const text = 'Nothing happens. 输入 help 看可用命令。';
    pushLog('hint', text);
    return { ok: false, message: text, events };
  }

  function runCommand(raw) {
    pushLog('you', raw);
    const parsed = parseCommand(raw);
    const result = executeCommand(parsed);
    result.events.forEach(recordEvent);
    save();
    return { ...result, parsed };
  }

  function resetParser() {
    state.parser = freshState().parser;
    save();
  }

  // ---------- FSRS（简化 FSRS-4.5 演示，参数未校准） ----------

  const FSRS_W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367,
    1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755];
  const FSRS_FACTOR = 19 / 81;
  const FSRS_DECAY = -0.5;
  const FSRS_TARGET = 0.9;
  const DEMO_FSRS_WORDS = ['journey', 'silent', 'harbor', 'tide', 'guide', 'bargain', 'shelter', 'survive'];

  function retrievability(elapsedDays, stability) {
    if (!stability || stability <= 0) return 0.9;
    return Math.pow(1 + FSRS_FACTOR * Math.max(0, elapsedDays) / stability, FSRS_DECAY);
  }

  function initFsrsCard(wordId, now) {
    return {
      wordId,
      state: 'new',
      stability: null,
      difficulty: null,
      due: todayISO(now),
      lastReview: null,
      reps: 0,
      lapses: 0
    };
  }

  function ensureFsrsCards() {
    DEMO_FSRS_WORDS.forEach((lemma) => {
      const word = WORD_BY_LEMMA.get(lemma);
      if (word && !state.fsrs[word.id]) state.fsrs[word.id] = initFsrsCard(word.id, new Date());
    });
    save();
  }

  function fsrsDue(now) {
    if (!Object.keys(state.fsrs).length) ensureFsrsCards();
    const today = todayISO(now);
    return Object.values(state.fsrs)
      .filter((card) => card.due <= today)
      .sort((a, b) => a.due.localeCompare(b.due));
  }

  function fsrsReview(wordId, grade, now) {
    const today = todayISO(now);
    let card = state.fsrs[wordId];
    if (!card) {
      card = initFsrsCard(wordId, now);
      state.fsrs[wordId] = card;
    }
    const elapsed = card.lastReview ? daysBetween(card.lastReview, today) : 0;
    const R = card.state === 'new' ? null : retrievability(elapsed, card.stability);
    let stability;
    let difficulty;
    if (card.state === 'new') {
      stability = Math.max(0.1, FSRS_W[grade - 1]);
      difficulty = clamp(FSRS_W[4] - (grade - 3) * FSRS_W[5], 1, 10);
    } else {
      difficulty = clamp(card.difficulty - FSRS_W[6] * (grade - 3), 1, 10);
      if (grade === 1) {
        stability = FSRS_W[12] * Math.pow(difficulty, -FSRS_W[13])
          * (Math.pow(card.stability + 1, FSRS_W[14]) - 1)
          * Math.exp((1 - R) * FSRS_W[15]);
        card.lapses += 1;
      } else {
        const hardPenalty = grade === 2 ? FSRS_W[10] : 1;
        const easyBonus = grade === 4 ? FSRS_W[11] : 1;
        stability = card.stability * (1 + Math.exp(FSRS_W[7]) * (11 - difficulty)
          * Math.pow(card.stability, -FSRS_W[8])
          * (Math.exp((1 - R) * FSRS_W[9]) - 1) * hardPenalty * easyBonus);
      }
    }
    stability = Math.max(0.1, stability);
    // FSRS 的目标保持率是 0.9；在这个目标下，间隔约等于稳定性。
    const interval = Math.max(1, Math.round(stability));
    card.stability = round(stability);
    card.difficulty = round(difficulty);
    card.due = addDays(today, interval);
    card.lastReview = today;
    card.state = 'review';
    card.reps += 1;
    state.fsrs[wordId] = card;
    recordEvent({
      wordId,
      skill: 'recognize',
      source: 'fsrs',
      correct: grade >= 3,
      score: (grade - 1) / 3,
      meta: { grade, interval, stability: card.stability, difficulty: card.difficulty }
    });
    save();
    return { card, interval, R };
  }

  function resetFsrs() {
    state.fsrs = {};
    ensureFsrsCards();
    save();
  }

  function fsrsAllDue() {
    const today = todayISO();
    Object.values(state.fsrs).forEach((card) => {
      card.due = today;
    });
    save();
  }

  function formatDue(card, now) {
    if (!card) return '—';
    const today = todayISO(now);
    const diff = daysBetween(today, card.due);
    if (diff < 0) return `逾期 ${Math.abs(diff)} 天`;
    if (diff === 0) return '今天';
    if (diff === 1) return '明天';
    return `${diff} 天后`;
  }

  // ---------- IRT（3PL + EAP 迷你版） ----------

  const IRT_A = 1.7;
  const IRT_C = 0.25;

  function pCorrect(theta, b) {
    return IRT_C + (1 - IRT_C) * sigmoid(IRT_A * (theta - b));
  }

  function pKnow(theta, b) {
    return sigmoid(IRT_A * (theta - b));
  }

  function fisherInfo(theta, b) {
    const p = pCorrect(theta, b);
    return (IRT_A * IRT_A * (1 - p) * ((p - IRT_C) / (1 - IRT_C)) ** 2) / p;
  }

  function posteriorMeanSd(posterior) {
    let mean = 0;
    for (let i = 0; i < GRID.length; i += 1) mean += GRID[i] * posterior[i];
    let variance = 0;
    for (let i = 0; i < GRID.length; i += 1) variance += posterior[i] * (GRID[i] - mean) ** 2;
    return { theta: mean, se: Math.sqrt(variance) };
  }

  function makeAssessmentItem(word, seed) {
    const correct = word.zh;
    const pool = WORDS
      .filter((w) => w.id !== word.id && w.zh && w.zh !== correct)
      .sort((a, b) => {
        const samePosA = a.pos === word.pos ? 0 : 1;
        const samePosB = b.pos === word.pos ? 0 : 1;
        return samePosA - samePosB || Math.abs(a.b - word.b) - Math.abs(b.b - word.b);
      })
      .slice(0, 12);
    const distractors = shuffleSeeded(pool, seed).slice(0, 3).map((w) => w.zh);
    const options = shuffleSeeded([correct, ...distractors], seed + 1);
    return {
      wordId: word.id,
      options,
      correctIndex: options.indexOf(correct)
    };
  }

  function nextAssessmentItem() {
    const a = state.assessment;
    const seen = new Set(a.seen);
    const theta = a.posterior ? posteriorMeanSd(a.posterior).theta : 0;
    let candidate = null;
    if (a.responses.length < 4) {
      const bands = ['1k', '2k', '3k', '4k', '5k+'];
      const band = bands[a.responses.length] || bands[bands.length - 1];
      const pool = WORDS.filter((w) => w.band === band && !seen.has(w.id));
      candidate = pickSeeded(pool, 11 + a.responses.length);
    }
    if (!candidate) {
      const pool = WORDS.filter((w) => !seen.has(w.id));
      candidate = pool.reduce((best, word) => {
        if (!best) return word;
        return fisherInfo(theta, word.b) > fisherInfo(theta, best.b) ? word : best;
      }, null);
    }
    return candidate ? makeAssessmentItem(candidate, 31 + a.responses.length * 7) : null;
  }

  function startAssessment() {
    state.assessment = {
      ...freshState().assessment,
      started: true,
      posterior: PRIOR.slice()
    };
    state.assessment.currentItem = nextAssessmentItem();
    save();
    return state.assessment;
  }

  function answerAssessment(choice) {
    const a = state.assessment;
    if (!a.started || a.done || !a.currentItem) return null;
    const item = a.currentItem;
    const word = WORD_BY_ID.get(item.wordId);
    const correct = choice === item.correctIndex;
    const before = posteriorMeanSd(a.posterior);
    let total = 0;
    for (let i = 0; i < GRID.length; i += 1) {
      const p = pCorrect(GRID[i], word.b);
      a.posterior[i] *= correct ? p : 1 - p;
      total += a.posterior[i];
    }
    for (let i = 0; i < GRID.length; i += 1) a.posterior[i] /= total;
    a.seen.push(word.id);
    a.responses.push({
      wordId: word.id,
      correct,
      choice,
      correctIndex: item.correctIndex,
      thetaBefore: round(before.theta),
      thetaAfter: round(posteriorMeanSd(a.posterior).theta)
    });
    recordEvent({
      wordId: word.id,
      skill: 'recognize',
      source: 'assessment',
      correct,
      score: correct ? 1 : 0,
      meta: { item: item.options, choice, correctIndex: item.correctIndex }
    });
    const after = posteriorMeanSd(a.posterior);
    a.theta = round(after.theta);
    a.se = round(Math.max(0.05, after.se));
    if (a.responses.length >= a.target || a.se <= 0.3) {
      finishAssessment();
    } else {
      a.currentItem = nextAssessmentItem();
    }
    save();
    return { correct, item, word, theta: a.theta, se: a.se, done: a.done };
  }

  function finishAssessment() {
    const a = state.assessment;
    const { theta, se } = posteriorMeanSd(a.posterior);
    a.theta = round(theta);
    a.se = round(Math.max(0.05, se));
    a.done = true;
    a.currentItem = null;
    a.vhat = Math.round(WORDS.reduce((sum, w) => sum + pKnow(theta, w.b), 0));
    const vAtGrid = GRID.map((g) => WORDS.reduce((sum, w) => sum + pKnow(g, w.b), 0));
    const pairs = vAtGrid.map((value, index) => [value, a.posterior[index]]).sort((x, y) => x[0] - y[0]);
    let cumulative = 0;
    let low = pairs[pairs.length - 1][0];
    let high = low;
    for (const [value, weight] of pairs) {
      cumulative += weight;
      if (cumulative >= 0.05) {
        low = value;
        break;
      }
    }
    cumulative = 0;
    for (const [value, weight] of pairs) {
      cumulative += weight;
      if (cumulative >= 0.95) {
        high = value;
        break;
      }
    }
    a.ci = [Math.round(low), Math.round(high)];
    a.perWord = WORDS.map((w) => ({ wordId: w.id, p: round(pKnow(theta, w.b)) }));
    const bands = {};
    WORDS.forEach((w) => {
      if (!bands[w.band]) bands[w.band] = { total: 0, sum: 0 };
      bands[w.band].total += 1;
      bands[w.band].sum += pKnow(theta, w.b);
    });
    a.bandCoverage = Object.fromEntries(
      Object.entries(bands).map(([band, v]) => [band, Math.round((v.sum / v.total) * 100)])
    );
    a.perWord.forEach(({ wordId, p }) => {
      const ws = ensureWord(wordId);
      ws.prior = p;
      recomputePKnown(ws);
    });
    save();
  }

  function resetAssessment() {
    state.assessment = freshState().assessment;
    save();
  }

  // ---------- 演示数据 ----------

  function seedDemo() {
    state = freshState();
    const add = (lemma, skill, correct, source) => {
      const w = WORD_BY_LEMMA.get(lemma);
      if (w) recordEvent({ wordId: w.id, skill, correct, source, score: correct ? 1 : 0 });
    };
    add('unlock', 'use', true, 'parser');
    add('key', 'recognize', true, 'parser');
    add('read', 'use', true, 'parser');
    add('logbook', 'recognize', true, 'parser');
    add('lower', 'use', true, 'parser');
    add('lantern', 'recognize', true, 'parser');
    add('journey', 'spell', true, 'spelling');
    add('harbor', 'spell', true, 'spelling');
    add('tide', 'recognize', true, 'fsrs');
    add('silent', 'recognize', true, 'fsrs');
    ensureFsrsCards();
    fsrsReview(WORD_BY_LEMMA.get('journey').id, 3, new Date());
    fsrsReview(WORD_BY_LEMMA.get('harbor').id, 4, new Date());
    startAssessment();
    const pattern = [1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1];
    pattern.forEach((correct) => {
      const a = state.assessment;
      if (!a.currentItem || a.done) return;
      const item = a.currentItem;
      answerAssessment(correct ? item.correctIndex : (item.correctIndex + 1) % 4);
    });
    save();
  }

  function resetAll() {
    state = freshState();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn(error);
    }
    save();
  }

  window.LabEngine = {
    words: WORDS,
    state: () => state,
    stats,
    statusOf,
    recordEvent,
    wordById: (id) => WORD_BY_ID.get(id),
    wordByLemma: (lemma) => WORD_BY_LEMMA.get(lemma),
    escapeHtml,
    // parser
    runCommand,
    resetParser,
    room: () => ROOMS[state.parser.room],
    parserState: () => state.parser,
    // fsrs
    fsrsDue,
    fsrsReview,
    resetFsrs,
    fsrsAllDue,
    formatDue,
    todayISO,
    // irt
    startAssessment,
    answerAssessment,
    resetAssessment,
    pKnow,
    // demo
    seedDemo,
    resetAll
  };
})();
