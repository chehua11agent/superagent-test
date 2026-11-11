/* 词汇实验室的界面层：五个小页面，全部是原生 DOM。 */
(function () {
  'use strict';

  const L = window.LabEngine;
  const app = document.getElementById('app');
  const toastEl = document.getElementById('toast');
  const esc = L.escapeHtml;
  const BANDS = ['1k', '2k', '3k', '4k', '5k+'];
  const SOURCE_LABEL = {
    parser: 'Zork 解析器',
    spelling: '拼写小测',
    fsrs: 'FSRS 复习',
    assessment: 'IRT 测评'
  };
  const SKILL_LABEL = { recognize: '认义', spell: '拼写', use: '产出' };

  let activeTab = 'overview';
  let wordFilter = { q: '', status: 'all', band: 'all' };
  let selectedWordId = null;
  let parserTrace = null;
  let spelling = null;
  let fsrsMessage = '';
  let irtFeedback = null;
  let toastTimer = null;

  function pct(p) {
    return p == null ? '—' : `${Math.round(p * 100)}%`;
  }

  function statusChip(status) {
    return `<span class="status-chip ${esc(status.key)}">${esc(status.label)}</span>`;
  }

  function eventLabel(event) {
    const word = L.wordById(event.wordId);
    const source = SOURCE_LABEL[event.source] || event.source;
    const skill = SKILL_LABEL[event.skill] || event.skill;
    const result = event.correct === null ? '见过' : event.correct ? '对' : '错';
    return { word, source, skill, result };
  }

  function eventList(limit) {
    const events = L.state().events.slice(0, limit || 8);
    if (!events.length) {
      return '<div class="empty">还没有证据。去 Zork、拼写小测或 IRT 测评里做一次，这里就会出现记录。</div>';
    }
    return `<ul class="event-list">${events.map((event) => {
      const { word, source, skill, result } = eventLabel(event);
      const time = new Date(event.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      const tone = event.correct === null ? 'seen' : event.correct ? 'ok' : 'bad';
      return `<li>
        <span class="event-dot ${tone}"></span>
        <span class="event-word">${esc(word ? word.word : event.wordId)}</span>
        <span class="event-meta">${esc(source)} · ${esc(skill)}</span>
        <span class="event-result ${tone}">${esc(result)}</span>
        <time>${esc(time)}</time>
      </li>`;
    }).join('')}</ul>`;
  }

  function renderOverview() {
    const s = L.stats();
    const assessed = s.assessed
      ? `<strong>${s.vhat}</strong><small>/ ${s.words} 词（预估）</small>`
      : '<strong>—</strong><small>还没做测评</small>';
    return `
      <section class="hero panel">
        <div>
          <p class="eyebrow">LEXICON LAB · 独立实验台</p>
          <h1>把“词库、Zork、FSRS、IRT”拆成四个能点的实验</h1>
          <p class="lede">这不是游戏，也不接《拾词者》。它只做一件事：让你亲手点一下，看看这几个技术名词到底在干什么。没有复杂画面，没有后端，所有状态都在浏览器里。</p>
          <div class="hero-actions">
            <button class="btn primary" data-tab="parser">先玩 Zork 解析器</button>
            <button class="btn" data-tab="wordbank">看词库 / ECDICT</button>
            <button class="btn" data-tab="irt">做 12 题测评</button>
          </div>
        </div>
        <div class="hero-note">
          <p class="note-title">这个原型里有什么</p>
          <ul>
            <li>${s.words} 个示例词条（${s.cet4} 个 ECDICT 标 cet4）</li>
            <li>2 个房间的 Zork 式解析器</li>
            <li>1 个简化 FSRS 复习队列</li>
            <li>1 个 3PL/EAP 迷你测评</li>
            <li>所有模块共用同一份“证据流”</li>
          </ul>
        </div>
      </section>

      <div class="stat-grid">
        <div class="stat-card"><span>词条</span><strong>${s.words}</strong><small>来自 ECDICT 的示例</small></div>
        <div class="stat-card"><span>证据</span><strong>${s.events}</strong><small>每次作答/命令一条</small></div>
        <div class="stat-card"><span>预估认识</span>${assessed}<small>测评结果，不是已验证</small></div>
        <div class="stat-card"><span>待复习</span><strong>${s.due}</strong><small>FSRS 队列里今天到期</small></div>
      </div>

      <div class="split">
        <div class="panel">
          <p class="eyebrow">四个实验</p>
          <h2>每个页面只回答一个问题</h2>
          <div class="experiment-list">
            <button class="experiment" data-tab="parser">
              <span class="exp-num">01</span>
              <span><b>Zork 解析器</b><small>打字命令怎么变成游戏行动？</small></span>
              <span class="exp-arrow">→</span>
            </button>
            <button class="experiment" data-tab="wordbank">
              <span class="exp-num">02</span>
              <span><b>词库 / ECDICT</b><small>一个词条里到底有什么字段？</small></span>
              <span class="exp-arrow">→</span>
            </button>
            <button class="experiment" data-tab="fsrs">
              <span class="exp-num">03</span>
              <span><b>FSRS 复习</b><small>“什么时候该复习”是怎么算的？</small></span>
              <span class="exp-arrow">→</span>
            </button>
            <button class="experiment" data-tab="irt">
              <span class="exp-num">04</span>
              <span><b>IRT 测评</b><small>十几道题怎么估出词汇量？</small></span>
              <span class="exp-arrow">→</span>
            </button>
          </div>
        </div>
        <div class="panel">
          <p class="eyebrow">它们怎么拼起来</p>
          <h2>从“查词”到“记住”</h2>
          <div class="flow">
            <div class="flow-node"><b>ECDICT</b><small>词条 / 音标 / 释义 / 词频</small></div>
            <div class="flow-arrow">→</div>
            <div class="flow-node"><b>词库</b><small>每个词 × 每种能力</small></div>
            <div class="flow-arrow">→</div>
            <div class="flow-node"><b>证据流</b><small>Zork / 拼写 / 测评</small></div>
            <div class="flow-arrow">→</div>
            <div class="flow-node"><b>FSRS</b><small>决定下次什么时候复习</small></div>
          </div>
          <p class="muted">这四个盒子就是正式版词库系统的骨架。这个原型把每一段都缩到最小，方便你单独看。</p>
        </div>
      </div>

      <div class="panel">
        <p class="eyebrow">一句话解释</p>
        <h2>我不了解它们是干什么的</h2>
        <div class="concept-table">
          <div><b>ECDICT</b><span>一本开源的英汉词典数据库。它给你词、音标、中文释义、词频和“是不是四级词”的标签；它不负责教你，也不记你会不会。</span></div>
          <div><b>qwerty-learner</b><span>一个用键盘打字背单词的开源应用。我们只参考它“看中文、打英文”的交互，不复制它的代码。</span></div>
          <div><b>Anki / FSRS</b><span>Anki 是成熟的间隔重复软件；FSRS 是它内置的排程算法。它不决定学什么，只决定“这个词什么时候该再出现”。</span></div>
          <div><b>py-irt</b><span>一个 Python 统计库，用答题记录反推“题目有多难、你大概在什么水平”。这个原型用浏览器里的迷你版演示同一个思路。</span></div>
          <div><b>Zork</b><span>一种老式文字冒险：你打字告诉游戏“拿钥匙、开门”，游戏解析动词和名词，并记住世界状态。它的可复用点是“语言就是操作”。</span></div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><div><p class="eyebrow">最近证据</p><h2>四个实验都往这里写</h2></div><button class="btn ghost" data-tab="wordbank">打开词库</button></div>
        ${eventList(8)}
      </div>
    `;
  }

  function renderParser() {
    const p = L.parserState();
    const room = L.room();
    const log = p.log.slice(-16).map((entry) => {
      if (entry.role === 'you') return `<div class="chat-line you"><span>你</span><p>${esc(entry.text)}</p></div>`;
      if (entry.role === 'hint') return `<div class="chat-line hint"><span>提示</span><p>${esc(entry.text)}</p></div>`;
      return `<div class="chat-line game"><span>世界</span><p>${esc(entry.text)}</p></div>`;
    }).join('');
    const trace = parserTrace
      ? `<div class="trace">
          <p class="trace-title">解析轨迹</p>
          <div class="trace-tokens">${(parserTrace.parsed.trace || []).map((t) => `<span class="trace-token"><b>${esc(t.token)}</b><small>${esc(t.role)}</small></span>`).join('')}</div>
          <p class="trace-result ${parserTrace.ok ? 'ok' : 'bad'}">${parserTrace.ok ? '解析成功' : '解析失败'}${parserTrace.message ? `：${esc(parserTrace.message)}` : ''}</p>
        </div>`
      : '<div class="empty">输入一条命令，这里会显示解析器把每个词认成了什么。</div>';
    const evidence = parserTrace && parserTrace.events.length
      ? `<div class="evidence-chips">${parserTrace.events.map((event) => {
          const word = L.wordById(event.wordId);
          return `<span class="evidence-chip">${esc(word ? word.word : event.wordId)} · ${esc(SKILL_LABEL[event.skill] || event.skill)}</span>`;
        }).join('')}</div>`
      : '<p class="muted">成功执行目标词命令后，这里会出现写入词库的证据。</p>';

    return `
      <section class="page-head">
        <div><p class="eyebrow">实验 01 · parser-lite</p><h1>Zork 解析器</h1></div>
        <p class="page-sub">你打字 → 解析器拆成动词/名词 → 世界改变。目标词用对了，就记一条证据。</p>
      </section>

      <div class="callout">
        <b>这是什么：</b>Zork 是 1970 年代的文字冒险。它没有选项按钮，玩家输入 <code>take key</code>、<code>unlock door with key</code>。解析器把句子拆成“动词 + 名词 + 介词”，再看世界状态决定能不能做。这个原型只有 2 个房间、8 个命令，够你看清原理。
      </div>

      <div class="parser-grid">
        <div class="panel chat-panel">
          <div class="panel-head"><div><p class="eyebrow">${esc(room.name)}</p><h2>${esc(p.room === 'gate' ? '灯塔门厅' : '灯塔内厅')}</h2></div><button class="btn ghost sm" data-action="parser-reset">重置场景</button></div>
          <div class="chat-log">${log}</div>
          <form id="parser-form" class="command-form" autocomplete="off">
            <input id="parser-input" name="command" placeholder="试试：unlock door with key" aria-label="输入命令">
            <button class="btn primary" type="submit">执行</button>
          </form>
          <div class="quick-row">
            ${['look', 'examine door', 'take key', 'unlock door with key', 'lower lantern', 'go north', 'read logbook', 'help'].map((cmd) => `<button class="btn ghost sm" data-cmd="${esc(cmd)}">${esc(cmd)}</button>`).join('')}
          </div>
        </div>
        <div class="panel">
          <p class="eyebrow">解析器看到了什么</p>
          <h2>动词 + 名词 + 状态</h2>
          ${trace}
          <p class="eyebrow mt">写入词库的证据</p>
          ${evidence}
          <p class="eyebrow mt">世界状态</p>
          <dl class="state-list">
            <div><dt>房间</dt><dd>${esc(room.name)}</dd></div>
            <div><dt>门</dt><dd>${p.doorUnlocked ? '开着' : '锁着'}</dd></div>
            <div><dt>背包</dt><dd>${p.inventory.length ? esc(p.inventory.join(', ')) : '空'}</dd></div>
            <div><dt>提灯</dt><dd>${p.lanternLowered ? '已放低' : '还在原处'}</dd></div>
          </dl>
        </div>
      </div>

      <div class="panel">
        <p class="eyebrow">为什么这对学单词有用</p>
        <h2>“认识”和“会用”是两件事</h2>
        <div class="three-col">
          <div><b>认义</b><p>看到英文能选对中文。现在的复习小测主要考这个，四选一有 25% 猜对。</p></div>
          <div><b>产出</b><p>要自己打出 <code>unlock</code>、<code>lower</code> 才能推进。这比选择题更接近“会用”。</p></div>
          <div><b>语境</b><p>同一个词在门、灯、日志里反复出现，比孤立背词更容易记住。</p></div>
        </div>
        <p class="muted">正式版不会让解析失败扣血：没猜中动词只给提示；连续失败可以点“直接行动”继续剧情。</p>
      </div>
    `;
  }

  function renderWordbank() {
    const s = L.stats();
    const q = wordFilter.q.trim().toLowerCase();
    const filtered = L.words.filter((word) => {
      const status = L.statusOf(word.id);
      if (q && !word.word.includes(q) && !(word.zh || '').toLowerCase().includes(q)) return false;
      if (wordFilter.band !== 'all' && word.band !== wordFilter.band) return false;
      if (wordFilter.status !== 'all' && status.key !== wordFilter.status) return false;
      return true;
    });
    const rows = filtered.map((word) => {
      const status = L.statusOf(word.id);
      const ws = L.state().words[word.id];
      const card = L.state().fsrs[word.id];
      const due = card ? L.formatDue(card) : '—';
      return `<tr data-word="${esc(word.id)}" tabindex="0">
        <td><b>${esc(word.word)}</b><small>${esc(word.pos || '')}</small></td>
        <td class="ipa">${esc(word.phonetic || '—')}</td>
        <td>${esc(word.zh || '—')}</td>
        <td class="num">${word.frq || word.bnc || '—'}</td>
        <td>${(word.tag || '').includes('cet4') ? '<span class="tag cet4">CET-4</span>' : '<span class="tag">—</span>'}</td>
        <td>${statusChip(status)}</td>
        <td class="num">${pct(ws?.pKnown)}</td>
        <td class="muted">${esc(due)}</td>
      </tr>`;
    }).join('');
    const selected = selectedWordId ? L.wordById(selectedWordId) : null;
    const selectedHtml = selected ? renderWordDetail(selected) : '';
    const spellingHtml = renderSpelling();

    return `
      <section class="page-head">
        <div><p class="eyebrow">实验 02 · 词库 / ECDICT</p><h1>一个词条里有什么</h1></div>
        <p class="page-sub">ECDICT 是词典数据库；词库系统在它上面加“你会不会”的证据。</p>
      </section>

      <div class="callout">
        <b>这是什么：</b>ECDICT 是一个开源的英汉词典数据库（MIT）。每条词有音标、中文释义、BNC/当代词频、CET-4 等标签。它像一本可查询的词典，但不会记录“你认识哪些词”；那部分要我们自己做。
      </div>

      <div class="stat-grid compact">
        <div class="stat-card"><span>示例词条</span><strong>${s.words}</strong><small>${s.cet4} 个标 cet4</small></div>
        <div class="stat-card"><span>有证据的词</span><strong>${s.touchedWords}</strong><small>来自 Zork / 拼写 / 测评</small></div>
        <div class="stat-card"><span>预估认识</span><strong>${s.assessed ? s.vhat : '—'}</strong><small>${s.assessed ? '测评给的先验' : '还没测评'}</small></div>
        <div class="stat-card"><span>写过的证据</span><strong>${s.events}</strong><small>每次一条，可追溯</small></div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <div><p class="eyebrow">词表</p><h2>61 个词，点一行看细节</h2></div>
          <div class="filters">
            <input id="word-search" type="search" placeholder="搜英文或中文" value="${esc(wordFilter.q)}">
            <select id="word-band" aria-label="按词频带筛选">
              <option value="all">全部词频带</option>
              ${BANDS.map((band) => `<option value="${band}" ${wordFilter.band === band ? 'selected' : ''}>${band}</option>`).join('')}
            </select>
            <select id="word-status" aria-label="按状态筛选">
              <option value="all" ${wordFilter.status === 'all' ? 'selected' : ''}>全部状态</option>
              <option value="predicted" ${wordFilter.status === 'predicted' ? 'selected' : ''}>预估认识</option>
              <option value="used" ${wordFilter.status === 'used' ? 'selected' : ''}>用过</option>
              <option value="spelled" ${wordFilter.status === 'spelled' ? 'selected' : ''}>会拼</option>
              <option value="seen" ${wordFilter.status === 'seen' ? 'selected' : ''}>认得</option>
              <option value="review" ${wordFilter.status === 'review' ? 'selected' : ''}>需复习</option>
              <option value="new" ${wordFilter.status === 'new' ? 'selected' : ''}>未测</option>
            </select>
          </div>
        </div>
        <div class="table-wrap">
          <table class="word-table">
            <thead><tr><th>词</th><th>音标</th><th>中文</th><th>词频排名</th><th>标签</th><th>状态</th><th>P(认识)</th><th>复习</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="8" class="empty">没有匹配的词。</td></tr>'}</tbody>
          </table>
        </div>
        <p class="muted">词频是 ECDICT 的 frq 排序（越小越高频）；P(认识) 是模型估计，不是已验证事实。点一行看它的字段和证据。</p>
        <p class="muted table-hint">表格可左右滑动查看全部列。</p>
      </div>

      ${selectedHtml}

      ${spellingHtml}

      <div class="panel">
        <p class="eyebrow">数据从哪来</p>
        <h2>ECDICT 负责“词”，我们负责“你”</h2>
        <div class="two-col">
          <div><b>ECDICT 提供</b><ul><li>词形、音标、中文释义</li><li>BNC / 当代语料词频</li><li>CET-4 / CET-6 / 考研等标签</li><li>动词变形、名词复数等</li></ul></div>
          <div><b>词库系统自己记</b><ul><li>你认不认得（认义）</li><li>你写不写得出（拼写）</li><li>你在语境里用不用得出（产出）</li><li>每次证据的时间、来源、对错</li></ul></div>
        </div>
        <p class="muted">qwerty-learner 是另一个开源项目（GPL-3.0），它把“看中文打英文”做成了键盘练习。我们只借这个交互思路，不复制它的代码。</p>
      </div>
    `;
  }

  function renderWordDetail(word) {
    const ws = L.state().words[word.id];
    const events = L.state().events.filter((e) => e.wordId === word.id).slice(0, 6);
    const skills = ['recognize', 'spell', 'use'].map((skill) => {
      const s = ws?.skills?.[skill];
      return `<div class="skill-row"><span>${esc(SKILL_LABEL[skill])}</span><b>${s ? `${s.correct}/${s.attempts}` : '—'}</b><small>${s ? pct((1 + s.correct) / (2 + s.attempts)) : '没有证据'}</small></div>`;
    }).join('');
    return `
      <div class="panel detail-panel">
        <div class="panel-head"><div><p class="eyebrow">词条细节</p><h2>${esc(word.word)} <span class="ipa">${esc(word.phonetic || '')}</span></h2></div><button class="btn ghost sm" data-action="close-detail">关闭</button></div>
        <div class="detail-grid">
          <div>
            <p class="detail-zh">${esc(word.zh || '—')}</p>
            <details class="translation-details">
              <summary>完整 ECDICT 释义</summary>
              <p class="muted">${esc((word.translation || '').replace(/\\n/g, '；'))}</p>
            </details>
            <dl class="state-list">
              <div><dt>词性</dt><dd>${esc(word.pos || '—')}</dd></div>
              <div><dt>BNC / frq</dt><dd>${word.bnc || '—'} / ${word.frq || '—'}</dd></div>
              <div><dt>标签</dt><dd>${esc(word.tag || '—')}</dd></div>
              <div><dt>变形</dt><dd class="small">${esc(word.exchange || '—')}</dd></div>
            </dl>
            ${word.example ? `<p class="example">“${esc(word.example)}”</p>` : ''}
            ${word.exampleZh ? `<p class="muted">${esc(word.exampleZh)}</p>` : ''}
          </div>
          <div>
            <p class="eyebrow">证据</p>
            <div class="skill-list">${skills}</div>
            <p class="eyebrow mt">最近 6 条</p>
            ${events.length ? `<ul class="mini-events">${events.map((e) => {
              const label = eventLabel(e);
              return `<li><span>${esc(label.source)} · ${esc(label.skill)}</span><b class="${e.correct === false ? 'bad' : e.correct ? 'ok' : 'seen'}">${esc(label.result)}</b></li>`;
            }).join('')}</ul>` : '<p class="muted">还没有针对这个词的证据。</p>'}
          </div>
        </div>
      </div>
    `;
  }

  function ensureSpelling() {
    if (spelling) return spelling;
    const pool = L.words.filter((w) => w.zh).slice();
    const queue = [];
    const copy = pool.slice();
    while (queue.length < 5 && copy.length) {
      const index = Math.floor(Math.random() * copy.length);
      queue.push(copy.splice(index, 1)[0].id);
    }
    spelling = { queue, index: 0, correct: 0, feedback: null };
    return spelling;
  }

  function renderSpelling() {
    const s = ensureSpelling();
    if (s.index >= s.queue.length) {
      return `<div class="panel">
        <div class="panel-head"><div><p class="eyebrow">拼写小测</p><h2>这一组做完了</h2></div><button class="btn" data-action="spell-start">再来一组</button></div>
        <p class="result-line">答对 <b>${s.correct}</b> / ${s.queue.length}。每次作答都写进了词库的“拼写”能力。</p>
      </div>`;
    }
    const word = L.wordById(s.queue[s.index]);
    const feedback = s.feedback
      ? `<div class="feedback ${s.feedback.correct ? 'ok' : 'bad'}">${s.feedback.correct ? '对：' : '不对，正确拼写是：'} <b>${esc(word.word)}</b>${s.feedback.correct ? '' : `（你写的是 ${esc(s.feedback.answer || '空')}）`}<button class="btn ghost sm" data-action="spell-next">下一题</button></div>`
      : '';
    return `<div class="panel spelling-panel">
      <div class="panel-head"><div><p class="eyebrow">拼写小测 · qwerty-learner 参考</p><h2>看中文，打出英文</h2></div><span class="counter">${s.index + 1} / ${s.queue.length}</span></div>
      <div class="spell-card">
        <p class="spell-zh">${esc(word.zh || '')}</p>
        <p class="muted">${esc(word.pos || '')} · ${esc(word.phonetic || '')}</p>
        ${feedback}
        ${s.feedback ? '' : `<form id="spell-form" class="inline-form" autocomplete="off"><input id="spell-input" placeholder="输入英文单词" aria-label="输入英文单词"><button class="btn primary" type="submit">检查</button></form>`}
      </div>
      <p class="muted">这就是 qwerty-learner 的核心交互：用键盘输入代替点选。正式版可以加听写、例句填空和发音。</p>
    </div>`;
  }

  function renderFsrs() {
    const due = L.fsrsDue();
    const cards = Object.values(L.state().fsrs).sort((a, b) => a.due.localeCompare(b.due));
    const dueHtml = due.length
      ? due.map((card) => {
          const word = L.wordById(card.wordId);
          return `<div class="review-card">
            <div class="review-head"><div><b>${esc(word.word)}</b><span class="ipa">${esc(word.phonetic || '')}</span></div><span class="tag ${card.state === 'new' ? '' : 'cet4'}">${card.state === 'new' ? '新卡' : '复习'}</span></div>
            <p class="review-zh">${esc(word.zh || '')}</p>
            <p class="muted">S 稳定性：${card.stability == null ? '—' : `${card.stability} 天`} · D 难度：${card.difficulty == null ? '—' : `${card.difficulty} / 10`}</p>
            <div class="grade-row">
              <button class="grade again" data-grade="1" data-word-id="${esc(card.wordId)}">Again<small>忘了</small></button>
              <button class="grade hard" data-grade="2" data-word-id="${esc(card.wordId)}">Hard<small>勉强</small></button>
              <button class="grade good" data-grade="3" data-word-id="${esc(card.wordId)}">Good<small>记得</small></button>
              <button class="grade easy" data-grade="4" data-word-id="${esc(card.wordId)}">Easy<small>太简单</small></button>
            </div>
          </div>`;
        }).join('')
      : '<div class="empty">今天没有到期卡。点“全部到期”可以再看一遍排程。</div>';
    const table = cards.map((card) => {
      const word = L.wordById(card.wordId);
      return `<tr><td><b>${esc(word.word)}</b></td><td>${card.stability == null ? '—' : card.stability}</td><td>${card.difficulty == null ? '—' : card.difficulty}</td><td>${esc(L.formatDue(card))}</td><td>${card.reps}</td><td>${card.lapses}</td></tr>`;
    }).join('');
    return `
      <section class="page-head">
        <div><p class="eyebrow">实验 03 · FSRS</p><h1>什么时候该复习</h1></div>
        <p class="page-sub">FSRS 不决定学什么，只根据“记得多稳”决定下次什么时候出现。</p>
      </section>

      <div class="callout">
        <b>这是什么：</b>Anki 是成熟的间隔重复软件；FSRS 是它现在内置的排程算法。每个词有两个内部量：<b>S</b>（稳定性，约等于“多久后还记得的概率降到 90%”）和 <b>D</b>（难度）。你给它一个评分，它更新 S/D，再算出下次间隔。这个原型用的是简化 FSRS-4.5 公式，参数没有用真实数据校准。
      </div>

      <div class="panel">
        <div class="panel-head"><div><p class="eyebrow">今日到期 · 评分</p><h2>${due.length ? `${due.length} 张卡等你评` : '今天已经清空'}</h2></div><div class="btn-row"><button class="btn ghost sm" data-action="fsrs-all-due">全部到期</button><button class="btn ghost sm" data-action="fsrs-reset">重置复习</button></div></div>
        ${fsrsMessage ? `<p class="result-line">${esc(fsrsMessage)}</p>` : ''}
        <div class="review-grid">${dueHtml}</div>
      </div>

      <div class="panel">
        <p class="eyebrow">排程表</p>
        <h2>每个词的记忆状态</h2>
        <div class="table-wrap">
          <table class="word-table">
            <thead><tr><th>词</th><th>S 稳定性</th><th>D 难度</th><th>下次</th><th>复习次数</th><th>遗忘次数</th></tr></thead>
            <tbody>${table || '<tr><td colspan="6" class="empty">还没有卡。</td></tr>'}</tbody>
          </table>
        </div>
        <p class="muted">真实 FSRS 会用你的历史评分拟合参数；这里用默认权重，目的是让你看到“评分 → 间隔”的因果，不是给你一个可用的复习计划。</p>
      </div>

      <div class="panel">
        <p class="eyebrow">和 Zork 的关系</p>
        <h2>一个负责“遇到”，一个负责“再见”</h2>
        <p>Zork 场景让词在语境里出现，产生“用过/见过”的证据；FSRS 决定这个词过几天再出现。两者共用同一个词库，但一个管输入，一个管调度。</p>
      </div>
    `;
  }

  function renderIrt() {
    const a = L.state().assessment;
    if (!a.started) {
      return `
        <section class="page-head">
          <div><p class="eyebrow">实验 04 · IRT</p><h1>12 题估词汇量</h1></div>
          <p class="page-sub">不逐词问，而是用答题结果反推“你的水平”，再推算每个词的概率。</p>
        </section>
        <div class="callout">
          <b>这是什么：</b>py-irt 是一个 Python 统计库，用答题记录估计“题目难度”和“学习者能力”。这个原型用浏览器里的 3PL + EAP 迷你版演示同一个思路：每答一题，更新一次“你大概在什么水平”，下一题挑最能区分你水平的那道。
        </div>
        <div class="panel start-panel">
          <h2>开始一次 12 题测评</h2>
          <p>题目从 61 个示例词里自适应抽取。做完会给你 θ（能力）、SE（误差）、预估认识多少词，以及每个词的“预估概率”。</p>
          <p class="muted">这些是预测，不是已验证。真正的掌握度还要靠后续的复习、拼写和语境证据。</p>
          <button class="btn primary" data-action="assessment-start">开始测评</button>
        </div>
      `;
    }
    if (a.done) return renderIrtResult(a);
    if (irtFeedback) {
      const word = L.wordById(irtFeedback.wordId);
      return `
        <section class="page-head"><div><p class="eyebrow">实验 04 · IRT</p><h1>答题反馈</h1></div><p class="page-sub">${a.responses.length} / ${a.target} 题</p></section>
        <div class="panel feedback-panel ${irtFeedback.correct ? 'ok' : 'bad'}">
          <p class="feedback-kicker">${irtFeedback.correct ? '答对了' : '答错了'}</p>
          <h2>${esc(word.word)} <span class="ipa">${esc(word.phonetic || '')}</span></h2>
          <p>正确答案：<b>${esc(word.zh)}</b></p>
          ${irtFeedback.correct ? '' : `<p class="muted">你选的是：${esc(irtFeedback.choiceText)}</p>`}
          <button class="btn primary" data-action="irt-next">${a.done ? '看结果' : '下一题'}</button>
        </div>
      `;
    }
    const item = a.currentItem;
    if (!item) {
      return `<div class="panel"><p>题目准备中。</p><button class="btn primary" data-action="assessment-start">重新开始</button></div>`;
    }
    const word = L.wordById(item.wordId);
    const progress = Math.round((a.responses.length / a.target) * 100);
    return `
      <section class="page-head">
        <div><p class="eyebrow">实验 04 · IRT</p><h1>第 ${a.responses.length + 1} 题 / ${a.target}</h1></div>
        <div class="irt-stats"><span>θ <b>${a.theta.toFixed(2)}</b></span><span>SE <b>${a.se.toFixed(2)}</b></span></div>
      </section>
      <div class="progress"><span style="width:${progress}%"></span></div>
      <div class="panel question-panel">
        <p class="eyebrow">选出最接近的中文意思</p>
        <h2>${esc(word.word)} <span class="ipa">${esc(word.phonetic || '')}</span></h2>
        <div class="option-grid">
          ${item.options.map((option, index) => `<button class="option" data-choice="${index}"><span>${String.fromCharCode(65 + index)}</span>${esc(option)}</button>`).join('')}
        </div>
        <p class="muted">题目难度 b=${word.b.toFixed(1)}（由词频带粗估）；当前选题目标是“信息量最大”，所以会挑你半会半不会的词。</p>
      </div>
      <div class="panel">
        <p class="eyebrow">已答 ${a.responses.length} 题</p>
        <div class="mini-events">${a.responses.slice(-6).reverse().map((r) => {
          const w = L.wordById(r.wordId);
          return `<div class="mini-event"><span>${esc(w.word)}</span><b class="${r.correct ? 'ok' : 'bad'}">${r.correct ? '对' : '错'}</b><small>θ ${r.thetaBefore} → ${r.thetaAfter}</small></div>`;
        }).join('')}</div>
      </div>
    `;
  }

  function renderIrtResult(a) {
    const perWord = (a.perWord || []).slice().sort((x, y) => y.p - x.p);
    const predicted = perWord.filter((entry) => entry.p >= 0.8).slice(0, 10);
    const probe = perWord.filter((entry) => entry.p >= 0.5 && entry.p < 0.8).slice(0, 8);
    const bands = a.bandCoverage || {};
    const bandBars = BANDS.filter((band) => bands[band] != null).map((band) => `<div class="band-row"><span>${band}</span><div class="bar"><i style="width:${bands[band]}%"></i></div><b>${bands[band]}%</b></div>`).join('');
    return `
      <section class="page-head">
        <div><p class="eyebrow">实验 04 · IRT</p><h1>测评结果</h1></div>
        <button class="btn ghost" data-action="assessment-reset">再做一次</button>
      </section>
      <div class="stat-grid">
        <div class="stat-card"><span>θ 能力</span><strong>${a.theta.toFixed(2)}</strong><small>SE ${a.se.toFixed(2)}</small></div>
        <div class="stat-card"><span>预估认识</span><strong>${a.vhat}</strong><small>90% CI ${a.ci[0]}–${a.ci[1]} / ${L.words.length}</small></div>
        <div class="stat-card"><span>已答</span><strong>${a.responses.length}</strong><small>题</small></div>
        <div class="stat-card"><span>平均 P(认识)</span><strong>${Math.round((a.perWord.reduce((sum, x) => sum + x.p, 0) / a.perWord.length) * 100)}%</strong><small>61 个示例词</small></div>
      </div>
      <div class="split">
        <div class="panel">
          <p class="eyebrow">分带覆盖</p>
          <h2>哪一档更稳</h2>
          ${bandBars}
          <p class="muted">这是“61 个示例词”内的估计；正式版要扩到 4,530 个四级词，并用真实作答校准题目难度。</p>
        </div>
        <div class="panel">
          <p class="eyebrow">下一步</p>
          <h2>把预测变成证据</h2>
          <p>测评只给“先验”。真正的掌握度要靠后面三件事：Zork 里用出来、拼写小测写出来、FSRS 到期时还能认出来。</p>
          <div class="btn-row"><button class="btn" data-tab="parser">去 Zork 用一次</button><button class="btn" data-tab="wordbank">看词库</button></div>
        </div>
      </div>
      <div class="panel">
        <p class="eyebrow">预估认识 · 前 10</p>
        <div class="evidence-chips">${predicted.map((entry) => { const w = L.wordById(entry.wordId); return `<span class="evidence-chip">${esc(w.word)} · ${Math.round(entry.p * 100)}%</span>`; }).join('') || '<span class="muted">没有达到 80% 的词。</span>'}</div>
        <p class="eyebrow mt">待验证 · 50–80%</p>
        <div class="evidence-chips">${probe.map((entry) => { const w = L.wordById(entry.wordId); return `<span class="evidence-chip">${esc(w.word)} · ${Math.round(entry.p * 100)}%</span>`; }).join('') || '<span class="muted">没有中间段的词。</span>'}</div>
        <p class="muted">这些百分比是模型预测；把它当“待验证”，不要当“已掌握”。</p>
      </div>
    `;
  }

  function render() {
    if (!app) return;
    const focusId = document.activeElement && document.activeElement.id;
    const selectionStart = document.activeElement && document.activeElement.selectionStart;
    let html = '';
    if (activeTab === 'parser') html = renderParser();
    else if (activeTab === 'wordbank') html = renderWordbank();
    else if (activeTab === 'fsrs') html = renderFsrs();
    else if (activeTab === 'irt') html = renderIrt();
    else html = renderOverview();
    app.innerHTML = html;
    document.querySelectorAll('[data-tab]').forEach((button) => {
      button.classList.toggle('active', button.dataset.tab === activeTab);
    });
    if (focusId) {
      const el = document.getElementById(focusId);
      if (el) {
        el.focus();
        if (selectionStart != null && el.setSelectionRange && typeof el.value === 'string') {
          try { el.setSelectionRange(selectionStart, selectionStart); } catch (error) { /* 忽略 */ }
        }
      }
    }
    if (activeTab === 'parser') {
      const log = document.querySelector('.chat-log');
      if (log) log.scrollTop = log.scrollHeight;
    }
  }

  function showToast(text) {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.hidden = false;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
      toastEl.hidden = true;
    }, 2200);
  }

  function switchTab(tab) {
    activeTab = tab;
    selectedWordId = null;
    irtFeedback = null;
    if (toastEl) {
      toastEl.hidden = true;
      toastEl.classList.remove('show');
    }
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleAction(action) {
    if (action === 'reset-all') {
      L.resetAll();
      parserTrace = null;
      spelling = null;
      fsrsMessage = '';
      irtFeedback = null;
      selectedWordId = null;
      showToast('已重置全部实验数据');
      render();
      return;
    }
    if (action === 'seed-demo') {
      L.seedDemo();
      parserTrace = null;
      spelling = null;
      fsrsMessage = '';
      irtFeedback = null;
      selectedWordId = null;
      showToast('已载入一组演示数据');
      render();
      return;
    }
    if (action === 'parser-reset') {
      L.resetParser();
      parserTrace = null;
      showToast('场景已重置');
      render();
      return;
    }
    if (action === 'close-detail') {
      selectedWordId = null;
      render();
      return;
    }
    if (action === 'spell-start') {
      spelling = null;
      render();
      return;
    }
    if (action === 'spell-next') {
      if (spelling) {
        spelling.index += 1;
        spelling.feedback = null;
      }
      render();
      return;
    }
    if (action === 'fsrs-all-due') {
      L.fsrsAllDue();
      fsrsMessage = '已把所有卡设为今天到期。';
      render();
      return;
    }
    if (action === 'fsrs-reset') {
      L.resetFsrs();
      fsrsMessage = '';
      showToast('复习队列已重置');
      render();
      return;
    }
    if (action === 'assessment-start') {
      L.startAssessment();
      irtFeedback = null;
      render();
      return;
    }
    if (action === 'assessment-reset') {
      L.resetAssessment();
      irtFeedback = null;
      render();
      return;
    }
    if (action === 'irt-next') {
      irtFeedback = null;
      render();
      return;
    }
  }

  document.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-tab]');
    if (tab) {
      switchTab(tab.dataset.tab);
      return;
    }
    const action = event.target.closest('[data-action]');
    if (action) {
      handleAction(action.dataset.action);
      return;
    }
    const grade = event.target.closest('[data-grade]');
    if (grade) {
      const result = L.fsrsReview(grade.dataset.wordId, Number(grade.dataset.grade));
      const word = L.wordById(grade.dataset.wordId);
      fsrsMessage = `${word.word} 评为 ${grade.dataset.grade === '1' ? 'Again' : grade.dataset.grade === '2' ? 'Hard' : grade.dataset.grade === '3' ? 'Good' : 'Easy'}：下次约 ${result.interval} 天后（S=${result.card.stability}）。`;
      render();
      return;
    }
    const choice = event.target.closest('[data-choice]');
    if (choice) {
      const index = Number(choice.dataset.choice);
      const item = L.state().assessment.currentItem;
      const result = L.answerAssessment(index);
      if (result) {
        irtFeedback = {
          wordId: result.word.id,
          correct: result.correct,
          choiceText: item ? item.options[index] : '',
          done: result.done
        };
      }
      render();
      return;
    }
    const word = event.target.closest('[data-word]');
    if (word) {
      selectedWordId = word.dataset.word;
      render();
      return;
    }
    const cmd = event.target.closest('[data-cmd]');
    if (cmd) {
      parserTrace = L.runCommand(cmd.dataset.cmd);
      render();
    }
  });

  document.addEventListener('submit', (event) => {
    if (event.target.id === 'parser-form') {
      event.preventDefault();
      const input = document.getElementById('parser-input');
      const raw = input ? input.value.trim() : '';
      if (!raw) return;
      parserTrace = L.runCommand(raw);
      render();
      return;
    }
    if (event.target.id === 'spell-form') {
      event.preventDefault();
      if (!spelling || spelling.feedback) return;
      const word = L.wordById(spelling.queue[spelling.index]);
      const input = document.getElementById('spell-input');
      const answer = input ? input.value.trim().toLowerCase() : '';
      const correct = answer === word.word.toLowerCase();
      L.recordEvent({
        wordId: word.id,
        skill: 'spell',
        source: 'spelling',
        correct,
        score: correct ? 1 : 0,
        meta: { answer }
      });
      if (correct) spelling.correct += 1;
      spelling.feedback = { correct, answer };
      render();
    }
  });

  document.addEventListener('input', (event) => {
    if (event.target.id === 'word-search') {
      wordFilter.q = event.target.value;
      render();
    }
  });

  document.addEventListener('change', (event) => {
    if (event.target.id === 'word-band') {
      wordFilter.band = event.target.value;
      render();
    }
    if (event.target.id === 'word-status') {
      wordFilter.status = event.target.value;
      render();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    const row = event.target.closest('[data-word]');
    if (row && event.target.tagName !== 'INPUT' && event.target.tagName !== 'BUTTON') {
      selectedWordId = row.dataset.word;
      render();
    }
  });

  document.getElementById('reset-all')?.addEventListener('click', () => handleAction('reset-all'));
  document.getElementById('seed-demo')?.addEventListener('click', () => handleAction('seed-demo'));

  render();
})();
