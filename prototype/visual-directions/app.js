/* 拾词者 · 雾港 — 方向探针数据与交互 */

const ENTITIES = [
  {
    id: 'persona.wordpicker',
    kind: '人物',
    no: 'No. 01',
    rarity: '主角',
    name: '拾词者',
    en: 'THE WORDPICKER',
    role: '词灵契约者 · 雾港旅人',
    art: 'assets/hermit.jpg',
    focus: '50% 12%',
    stats: [['HP', '90'], ['词力', '3'], ['意志', '12']],
    ability: ['拾词', '每幕开始时，从雾中拾起一个词；它在本幕可被当作一次行动。'],
    quote: '每一道门、每一场雾、每一个敌人，都只能用单词解决。',
    source: 'Rider-Waite-Smith Tarot, 1909 · Public Domain'
  },
  {
    id: 'monster.fog-keeper',
    kind: '怪物',
    no: 'No. 02',
    rarity: '稀有',
    name: '雾中守塔人',
    en: 'THE FOG KEEPER',
    role: '旧灯塔的守望者 · 第 4 幕',
    art: 'assets/lighthouse.jpg',
    focus: '50% 26%',
    stats: [['HP', '45'], ['AC', '13'], ['威胁', '3']],
    ability: ['雾墙', '每回合结束，雾墙推进一格；被吞没时，下一次检定劣势。'],
    quote: '灯还亮着，但守塔人已经很久没有回答。',
    source: 'Henry Farrer, Lighthouse, 1880 · Met Open Access (CC0)'
  },
  {
    id: 'monster.fog-wyrm',
    kind: '怪物',
    no: 'No. 03',
    rarity: '史诗',
    name: '雾中龙',
    en: 'THE FOG WYRM',
    role: '雾港外海的传说 · 支线',
    art: 'assets/dragon.jpg',
    focus: '50% 42%',
    stats: [['HP', '68'], ['AC', '15'], ['威胁', '4']],
    ability: ['吐息', '拼写检定失败时，雾中的龙息让整手牌的费用 +1。'],
    quote: '它不追船，它追的是船上还没说出口的词。',
    source: 'Hendrick Goltzius, 1588 · Met Open Access (CC0)'
  },
  {
    id: 'item.lens',
    kind: '道具',
    no: 'No. 04',
    rarity: '稀有',
    name: '守塔人的透镜',
    en: "THE KEEPER'S LENS",
    role: '任务道具 · 三块透镜之一',
    art: 'assets/lens.jpg',
    focus: '55% 26%',
    zoom: true,
    stats: [['效果', '+1 线索'], ['代价', '—'], ['重量', '1']],
    ability: ['折射', '打出时揭示一处被雾遮住的线索；拼写成功则额外 +1 线索。'],
    quote: '镜片边缘有一道被火燎过的裂痕。',
    source: 'Rider-Waite-Smith Tarot, 1909 · Public Domain'
  },

];

const HAND = [
  {
    id: 'guide', zh: '指引；引导', en: 'GUIDE', type: '法术',
    effect: '揭示一条被雾遮住的路径。', cost: '拼写失败：HP −10'
  },
  {
    id: 'signal', zh: '信号；暗号', en: 'SIGNAL', type: '法术',
    effect: '让同伴知道你的位置。', cost: '拼写失败：线索 −1'
  },
  {
    id: 'warn', zh: '警告；提醒', en: 'WARN', type: '检定',
    effect: '提前听见危险，获得优势。', cost: '拼写失败：HP −15'
  },
  {
    id: 'reflect', zh: '反射；映照；反思', en: 'REFLECT', type: '检定',
    effect: '从水面看见看不见的东西。', cost: '拼写失败：HP −10'
  }
];

const NOTES = {
  plate: '<b>A · 旧版画</b> — 把界面变成一本可翻阅的图版档案：公版铜版画、纸面、双线装裱、档案编号。零引擎改动，先换掉「空场景 + 文本框」。',
  night: '<b>B · 夜航</b> — 同一套结构，暗场电影化：满幅海图、雾层、金色细线与发光卡框。最接近现在雾港的气质，但需要真正的插画与更长的制作时间。',
  cut: '<b>C · 朱墨木刻</b> — 高对比木刻与单色海报：粗黑边、朱砂、硬投影。成本最低、风格最硬，适合先做一版可玩的垂直切片，但细节上限低于 A / B。'
};

const INTENTS = [
  '雾墙压过来，灯光被挤成一条细线。',
  '守塔人退回灯后，雾里多了一道影子。',
  '最后一击：整座塔的灯一起熄灭。'
];

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (value) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

function statsHtml(stats) {
  return stats.map(([label, value]) =>
    `<span><b>${esc(value)}</b><i>${esc(label)}</i></span>`).join('');
}

function artHtml(entity, className) {
  const zoom = entity.zoom ? ' zoom' : '';
  return `<div class="${className}${zoom}">
    <img src="${entity.art}" alt="${esc(entity.name)}的插画" loading="lazy" style="--focus:${esc(entity.focus)}">
  </div>`;
}

function combatantHtml(entity) {
  return `
    <div class="c-head"><span class="c-kind">${esc(entity.kind)}</span><span class="c-no">${esc(entity.no)} · ${esc(entity.rarity)}</span></div>
    ${artHtml(entity, 'c-art')}
    <div class="c-body">
      <h3 class="c-name">${esc(entity.name)}</h3>
      <p class="c-en">${esc(entity.en)}</p>
      <div class="c-stats">${statsHtml(entity.stats)}</div>
      <p class="c-ability"><b>${esc(entity.ability[0])}</b> ${esc(entity.ability[1])}</p>
    </div>
    <div class="c-hp"><i style="width:100%"></i></div>`;
}

function galleryHtml(entity) {
  return `
    <article class="g-card" tabindex="0" aria-label="${esc(entity.kind)}卡：${esc(entity.name)}">
      ${artHtml(entity, 'g-art')}
      <div class="g-head"><span class="g-kind">${esc(entity.kind)}</span><span class="g-no">${esc(entity.no)} · ${esc(entity.rarity)}</span></div>
      <div class="g-body">
        <h3 class="g-name">${esc(entity.name)}</h3>
        <p class="g-en">${esc(entity.en)}</p>
        <div class="g-stats">${statsHtml(entity.stats)}</div>
        <p class="g-ability"><b>${esc(entity.ability[0])}</b> ${esc(entity.ability[1])}</p>
        <p class="g-quote">“${esc(entity.quote)}”</p>
        <p class="g-src">${esc(entity.role)}<br>${esc(entity.source)}</p>
      </div>
    </article>`;
}

function handHtml(card, index) {
  return `
    <button class="hand-card" type="button" role="option" aria-selected="false" data-index="${index}">
      <span class="card-type"><span>${esc(card.type)}</span><span>No. 0${index + 1}</span></span>
      <span class="card-zh">${esc(card.zh)}</span>
      <span class="card-effect">${esc(card.effect)}</span>
      <span class="card-cost">${esc(card.cost)}</span>
    </button>`;
}

const player = ENTITIES.find((e) => e.id === 'persona.wordpicker');
const keeper = ENTITIES.find((e) => e.id === 'monster.fog-keeper');

$('#playerCard').innerHTML = combatantHtml(player);
$('#enemyCard').innerHTML = combatantHtml(keeper);
$('#gallery').innerHTML = ENTITIES.map(galleryHtml).join('');
$('#hand').innerHTML = HAND.map(handHtml).join('');

let selected = -1;
let enemyHp = 45;
let round = 1;
let resolved = false;

const handEl = $('#hand');
const playBtn = $('#playBtn');
const spellBtn = $('#spellBtn');
const hint = $('#actionsHint');
const enemyHpFill = $('#enemyCard .c-hp i');
const enemyHpText = $('#enemyCard .c-stats b');
const damageEl = $('#damage');

function setSelected(next) {
  selected = next;
  $$('.hand-card', handEl).forEach((el, i) => {
    el.classList.toggle('is-on', i === next);
    el.setAttribute('aria-selected', i === next ? 'true' : 'false');
  });
  if (!resolved) {
    playBtn.disabled = next < 0;
    hint.textContent = next < 0 ? '先点一张词卡。' : `已选「${HAND[next].zh}」；读出或拼出。`;
  }
}

handEl.addEventListener('click', (event) => {
  const card = event.target.closest('.hand-card');
  if (!card || card.classList.contains('is-spent') || resolved) return;
  const index = Number(card.dataset.index);
  setSelected(index === selected ? -1 : index);
});

handEl.addEventListener('keydown', (event) => {
  const card = event.target.closest('.hand-card');
  if (!card) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    card.click();
  }
});

function floatDamage() {
  damageEl.classList.remove('show');
  // reflow to restart the animation
  void damageEl.offsetWidth;
  damageEl.classList.add('show');
}

playBtn.addEventListener('click', () => {
  if (selected < 0 || resolved) return;
  const cardEl = $$('.hand-card', handEl)[selected];
  cardEl.classList.add('is-spent');
  cardEl.classList.remove('is-on');
  cardEl.disabled = true;

  enemyHp = Math.max(0, enemyHp - 15);
  enemyHpFill.style.width = `${(enemyHp / 45) * 100}%`;
  enemyHpText.textContent = String(enemyHp);
  floatDamage();
  round = Math.min(3, round + 1);
  $('#roundNow').textContent = round;
  $('#intent .intent-t').textContent = INTENTS[Math.min(round - 1, INTENTS.length - 1)];

  selected = -1;
  if (enemyHp <= 0) {
    resolved = true;
    playBtn.disabled = true;
    playBtn.textContent = '演示完成';
    hint.textContent = '守塔人退回雾里；切到 B / C 看另外两个方向。';
    $('#intent .intent-t').textContent = '雾墙散了。旧灯塔的灯第一次照到海面。';
  } else {
    playBtn.disabled = true;
    hint.textContent = '再选一张；这一轮只演示出牌，不判定拼写。';
  }
});

spellBtn.addEventListener('click', () => {
  hint.textContent = '拼写输入在正式界面里；这个探针只演示卡片与画面的关系。';
});

$$('.dir').forEach((button) => {
  button.addEventListener('click', () => {
    const dir = button.dataset.dir;
    document.body.dataset.dir = dir;
    $$('.dir').forEach((b) => {
      const on = b === button;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    $('#note').innerHTML = NOTES[dir];
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dir === 'night' ? '#070b0d' : dir === 'cut' ? '#efe2c6' : '#e6dac2';
  });
});

$('#note').innerHTML = NOTES.plate;
