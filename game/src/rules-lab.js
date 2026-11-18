// 5e 规则实验台的 UI：只负责把规则核的输入/输出画出来。
// 正式游戏接入时，应复用 game/src/rules/ 的 API，而不是复制这里的表单逻辑。
import {
  ABILITIES,
  ABILITY_METHODS,
  SKILLS,
  SKILL_BY_ID,
  SRD_ARMOR,
  SRD_CONDITIONS,
  buildRules,
  checkOdds,
  createCharacter,
  resolveCheck,
  rollAbilityPool,
  serializeCharacter,
  wordBonusLabel
} from './rules/index.js';

const HOMEBREW_RACES = [
  {
    id: 'moon-kin',
    name: '月族',
    nameEn: 'Moon Kin',
    size: 'medium',
    speed: 35,
    darkvision: 90,
    abilityBonuses: { fixed: { cha: 2, wis: 1 } },
    languages: ['通用语', '月语'],
    resistances: ['radiant'],
    traits: [
      { name: '月之血', description: '你对抗光耀伤害有抗性（房规示例）。' },
      { name: '银月视觉', description: '90 尺黑暗视觉。' }
    ]
  }
];

const RULES = buildRules({ races: HOMEBREW_RACES });
const ARMOR_BY_ID = Object.fromEntries(SRD_ARMOR.map((armor) => [armor.id, armor]));
const CONDITION_BY_ID = Object.fromEntries(SRD_CONDITIONS.map((condition) => [condition.id, condition]));
const ABILITY_BY_ID = Object.fromEntries(ABILITIES.map((ability) => [ability.id, ability]));

const ARMOR_CATEGORY_NAMES = { light: '轻甲', medium: '中甲', heavy: '重甲', shield: '盾牌', none: '无甲' };

const EFFECT_PRESETS = [
  {
    id: 'bless',
    label: '祝福（攻击/豁免 +2，原型用固定值代替 1d4）',
    group: {
      id: 'bless',
      label: '祝福',
      source: 'spell:bless',
      modifiers: [
        { target: 'attack', value: 2 },
        { target: 'save', value: 2 }
      ]
    }
  },
  {
    id: 'shield-spell',
    label: '护盾术（AC +2）',
    group: {
      id: 'shield-spell',
      label: '护盾术',
      source: 'spell:shield',
      modifiers: [{ target: 'ac', value: 2 }]
    }
  },
  {
    id: 'guidance',
    label: '指引（属性检定 +2，原型固定值）',
    group: {
      id: 'guidance',
      label: '指引',
      source: 'spell:guidance',
      modifiers: [{ target: 'abilityCheck', value: 2 }]
    }
  }
];
const EFFECT_BY_ID = Object.fromEntries(EFFECT_PRESETS.map((effect) => [effect.id, effect]));

const PRESETS = [
  {
    id: 'fighter',
    label: '标准战士',
    spec: {
      name: '灰港卫兵',
      level: 1,
      race: 'human',
      subrace: null,
      class: 'fighter',
      background: 'soldier',
      abilityMethod: 'standard-array',
      baseAbilities: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
      extraLanguages: ['矮人语'],
      skillChoices: ['history', 'perception'],
      expertiseChoices: [],
      armor: 'chain-mail',
      shield: true,
      conditions: [],
      exhaustion: 0,
      effects: []
    }
  },
  {
    id: 'cleric',
    label: '丘陵矮人牧师',
    spec: {
      name: '石祷者',
      level: 1,
      race: 'dwarf',
      subrace: 'hill-dwarf',
      class: 'cleric',
      background: 'acolyte',
      abilityMethod: 'point-buy',
      baseAbilities: { str: 12, dex: 14, con: 13, int: 10, wis: 15, cha: 8 },
      extraLanguages: ['兽人语', '龙语'],
      skillChoices: ['history', 'medicine'],
      expertiseChoices: [],
      armor: 'scale-mail',
      shield: true,
      conditions: [],
      exhaustion: 0,
      effects: []
    }
  },
  {
    id: 'rogue',
    label: '木精灵游荡者',
    spec: {
      name: '影叶',
      level: 1,
      race: 'elf',
      subrace: 'wood-elf',
      class: 'rogue',
      background: 'criminal',
      abilityMethod: 'point-buy',
      baseAbilities: { str: 8, dex: 15, con: 13, int: 12, wis: 12, cha: 13 },
      extraLanguages: [],
      skillChoices: ['acrobatics', 'athletics', 'insight', 'investigation'],
      expertiseChoices: ['stealth', 'perception'],
      armor: 'leather',
      shield: false,
      conditions: [],
      exhaustion: 0,
      effects: []
    }
  },
  {
    id: 'moon-sorcerer',
    label: '月族术士（自定义）',
    spec: {
      name: '月下低语',
      level: 1,
      race: 'moon-kin',
      subrace: null,
      class: 'sorcerer',
      background: 'sage',
      abilityMethod: 'point-buy',
      baseAbilities: { str: 8, dex: 14, con: 13, int: 10, wis: 12, cha: 15 },
      extraLanguages: ['天界语', '龙语'],
      skillChoices: ['deception', 'insight'],
      expertiseChoices: [],
      armor: 'none',
      shield: false,
      conditions: [],
      exhaustion: 0,
      effects: []
    }
  }
];

const state = {
  spec: clone(PRESETS[0].spec),
  character: null,
  lastValid: null,
  error: null,
  lastResult: null,
  history: [],
  check: {
    kind: 'skill',
    target: 'perception',
    dc: 15,
    ac: 15,
    wordBonus: 0,
    proficient: true,
    help: false,
    cover2: false,
    cover5: false,
    disadvantage: false,
    bonus: 0,
    contexts: [],
    requiresSight: false
  }
};

const builder = document.querySelector('#builder');
const builderError = document.querySelector('#builder-error');
const presetBar = document.querySelector('#preset-bar');
const sheetEl = document.querySelector('#sheet');
const checksEl = document.querySelector('#checks');
const resetButton = document.querySelector('#reset-button');

init();

function init() {
  renderPresets();
  resetButton.addEventListener('click', () => {
    state.spec = clone(PRESETS[0].spec);
    commit();
  });
  builder.addEventListener('input', onBuilderInput);
  builder.addEventListener('change', onBuilderChange);
  checksEl.addEventListener('change', onCheckChange);
  checksEl.addEventListener('click', onCheckClick);
  commit();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function money(n) {
  return n >= 0 ? `+${n}` : `${n}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function raceOf(spec = state.spec) {
  return typeof spec.race === 'object' ? spec.race : RULES.races.find((race) => race.id === spec.race) ?? RULES.races[0];
}

function subraceOf(race = raceOf(), spec = state.spec) {
  return typeof spec.subrace === 'object' ? spec.subrace : (race.subraces ?? []).find((entry) => entry.id === spec.subrace) ?? null;
}

function classOf(spec = state.spec) {
  return typeof spec.class === 'object' ? spec.class : RULES.classes.find((klass) => klass.id === spec.class) ?? RULES.classes[0];
}

function backgroundOf(spec = state.spec) {
  return typeof spec.background === 'object' ? spec.background : RULES.backgrounds.find((bg) => bg.id === spec.background) ?? RULES.backgrounds[0];
}

function abilityBonusesOf(race, subrace) {
  const read = (input = {}) => (input.fixed || input.choose ? input : { fixed: input, choose: null });
  const a = read(race.abilityBonuses);
  const b = subrace ? read(subrace.abilityBonuses) : { fixed: {}, choose: null };
  const fixed = {};
  for (const id of Object.keys(ABILITY_BY_ID)) {
    fixed[id] = (a.fixed?.[id] ?? 0) + (b.fixed?.[id] ?? 0);
  }
  return { fixed, choose: a.choose ?? b.choose ?? null };
}

function fixedSkillIds(race, subrace, background) {
  return new Set([
    ...(background.skillProficiencies ?? []),
    ...(race.skillProficiencies ?? []),
    ...(subrace?.skillProficiencies ?? [])
  ]);
}

function skillChoiceSpec(race, subrace, klass) {
  const classChoice = klass.skillChoices ?? { count: 0, from: [] };
  const raceChoice = race.skillChoices ?? { count: 0, from: [] };
  const subraceChoice = subrace?.skillChoices ?? { count: 0, from: [] };
  return {
    count: (classChoice.count ?? 0) + (raceChoice.count ?? 0) + (subraceChoice.count ?? 0),
    pools: [classChoice, raceChoice, subraceChoice]
  };
}

function poolIds(choice) {
  if (!choice) return [];
  return choice.from === 'any' ? SKILLS.map((skill) => skill.id) : [...(choice.from ?? [])];
}

function maxLanguageChoices(race, subrace, background) {
  return (race.languageChoices ?? 0) + (subrace?.languageChoices ?? 0) + (background.languageChoices ?? 0);
}

function commit() {
  try {
    const character = createCharacter(state.spec, RULES);
    state.character = character;
    state.lastValid = character;
    state.error = null;
  } catch (error) {
    state.error = error?.message ?? String(error);
  }
  state.lastResult = null;
  renderBuilder();
  renderSheet();
  renderChecks();
}

// ------------------------------- builder -------------------------------

function renderPresets() {
  presetBar.innerHTML = PRESETS.map(
    (preset) => `<button type="button" data-preset="${preset.id}">${escapeHtml(preset.label)}</button>`
  ).join('');
  presetBar.addEventListener('click', (event) => {
    const button = event.target.closest('[data-preset]');
    if (!button) return;
    const preset = PRESETS.find((entry) => entry.id === button.dataset.preset);
    if (!preset) return;
    state.spec = clone(preset.spec);
    commit();
  });
}

function renderBuilder() {
  const spec = state.spec;
  const race = raceOf();
  const subrace = subraceOf(race);
  const klass = classOf();
  const background = backgroundOf();
  const bonuses = abilityBonusesOf(race, subrace);
  const choose = bonuses.choose;
  const maxLanguages = maxLanguageChoices(race, subrace, background);
  const skills = skillChoiceSpec(race, subrace, klass);
  const fixedSkills = fixedSkillIds(race, subrace, background);
  const candidateSkills = [...new Set(skills.pools.flatMap(poolIds))].filter((id) => !fixedSkills.has(id));
  const selectedSkills = spec.skillChoices.filter((id) => candidateSkills.includes(id));
  const expertiseConfig = klass.expertise && (klass.expertise.level ?? 3) <= spec.level ? klass.expertise : null;
  const proficientSkills = [...fixedSkills, ...selectedSkills].filter((id) => SKILL_BY_ID[id]);
  const armorProf = [...(klass.armorProficiencies ?? []), ...(race.armorProficiencies ?? []), ...(subrace?.armorProficiencies ?? [])];
  const armor = ARMOR_BY_ID[spec.armor] ?? ARMOR_BY_ID.none;
  const armorOk = armor.category === 'none' || armorProf.includes(armor.category);
  const shieldOk = !spec.shield || armorProf.includes('shield');
  const effectIds = (spec.effects ?? []).map((effect) => effect.id);

  builder.innerHTML = `
    <div class="field-grid">
      <div class="field field--wide">
        <label for="field-name">角色名</label>
        <input id="field-name" data-field="name" value="${escapeHtml(spec.name)}" maxlength="40" autocomplete="off" />
      </div>
      <div class="field">
        <label for="field-race">种族</label>
        <select id="field-race" data-field="race">
          ${RULES.races.map((entry) => `<option value="${entry.id}" ${entry.id === race.id ? 'selected' : ''}>${escapeHtml(entry.name)}（${escapeHtml(entry.nameEn ?? '')}）</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label for="field-subrace">子种族</label>
        <select id="field-subrace" data-field="subrace">
          <option value="">（不选）</option>
          ${(race.subraces ?? []).map((entry) => `<option value="${entry.id}" ${entry.id === subrace?.id ? 'selected' : ''}>${escapeHtml(entry.name)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label for="field-class">职业</label>
        <select id="field-class" data-field="class">
          ${RULES.classes.map((entry) => `<option value="${entry.id}" ${entry.id === klass.id ? 'selected' : ''}>${escapeHtml(entry.name)}（d${entry.hitDie}）</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label for="field-background">背景</label>
        <select id="field-background" data-field="background">
          ${RULES.backgrounds.map((entry) => `<option value="${entry.id}" ${entry.id === background.id ? 'selected' : ''}>${escapeHtml(entry.name)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label for="field-level">等级</label>
        <input id="field-level" data-field="level" type="number" min="1" max="20" step="1" value="${spec.level}" />
      </div>
      <div class="field">
        <label for="field-method">属性生成</label>
        <select id="field-method" data-field="abilityMethod">
          ${ABILITY_METHODS.map((method) => `<option value="${method.id}" ${method.id === spec.abilityMethod ? 'selected' : ''}>${escapeHtml(method.name)}</option>`).join('')}
        </select>
      </div>
    </div>

    <section class="section-block">
      <h3>属性 <small>${escapeHtml(ABILITY_METHODS.find((method) => method.id === spec.abilityMethod)?.summary ?? '')}</small></h3>
      <div class="ability-block">
        ${ABILITIES.map((ability) => {
          const chosenBonus = choose && spec.racialBonusChoices.includes(ability.id) ? choose.amount : 0;
          const delta = (bonuses.fixed[ability.id] ?? 0) + chosenBonus;
          const finalScore = (spec.baseAbilities?.[ability.id] ?? 10) + delta;
          return `
            <div class="ability-tile" title="${escapeHtml(ability.nameEn)}">
              <div class="ability-tile__label">${escapeHtml(ability.abbr)}</div>
              <div class="ability-tile__score">${finalScore}</div>
              <div class="ability-tile__mod">${money(Math.floor((finalScore - 10) / 2))}</div>
              <span class="ability-tile__racial">${delta ? `种族 ${money(delta)}` : ''}</span>
            </div>`;
        }).join('')}
      </div>
      <div class="ability-rows">
        ${ABILITIES.map((ability) => `
          <div class="ability-row">
            <span class="ability-row__name"><b>${escapeHtml(ability.name)}</b> <small>${escapeHtml(ability.abbr)}</small></span>
            <input data-ability="${ability.id}" type="number" min="${spec.abilityMethod === 'point-buy' ? 8 : spec.abilityMethod === 'free' || spec.abilityMethod === 'roll' ? 3 : 8}" max="${spec.abilityMethod === 'point-buy' ? 15 : spec.abilityMethod === 'standard-array' ? 15 : 18}" step="1" value="${spec.baseAbilities?.[ability.id] ?? 10}" aria-label="${escapeHtml(ability.name)}基础值" />
            <span class="ability-row__delta">${((bonuses.fixed[ability.id] ?? 0) + (choose && spec.racialBonusChoices.includes(ability.id) ? choose.amount : 0)) ? money((bonuses.fixed[ability.id] ?? 0) + (choose && spec.racialBonusChoices.includes(ability.id) ? choose.amount : 0)) : ''}</span>
          </div>`).join('')}
      </div>
      ${spec.abilityMethod === 'point-buy' ? `<p class="point-buy">购点：<strong>${pointBuySpent(spec.baseAbilities)}</strong> / 27（剩余 ${27 - pointBuySpent(spec.baseAbilities)}）</p>` : ''}
      <div class="check-actions">
        <button type="button" class="tiny-button" data-action="standard-array">填入标准数组</button>
        <button type="button" class="tiny-button" data-action="roll-abilities">4d6 去最低</button>
        <span class="datalist-note">属性生成方式与 SRD 一致；自由模式允许 3–18。</span>
      </div>
    </section>

    ${choose ? `
      <section class="section-block">
        <h3>种族属性自选 <small>已选 ${spec.racialBonusChoices.length} / ${choose.count}</small></h3>
        <div class="chip-grid">
          ${Object.keys(ABILITY_BY_ID).filter((id) => !(choose.exclude ?? []).includes(id)).map((id) => {
            const checked = spec.racialBonusChoices.includes(id);
            const disabled = !checked && spec.racialBonusChoices.length >= choose.count;
            return `<label class="chip"><input type="checkbox" name="racial-choice" value="${id}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} />${escapeHtml(ABILITY_BY_ID[id].name)} +${choose.amount}</label>`;
          }).join('')}
        </div>
      </section>` : ''}

    ${(race.choices ?? []).length + (subrace?.choices ?? []).length > 0 ? `
      <section class="section-block">
        <h3>种族分支</h3>
        ${[...(race.choices ?? []), ...(subrace?.choices ?? [])].map((choice) => `
          <div class="field">
            <label for="race-choice-${choice.id}">${escapeHtml(choice.name)}</label>
            <select id="race-choice-${choice.id}" data-race-choice="${choice.id}">
              ${(choice.options ?? []).map((option) => `<option value="${option.id}" ${(spec.raceChoices?.[choice.id] ?? choice.options?.[0]?.id) === option.id ? 'selected' : ''}>${escapeHtml(option.name)}${option.damage ? `（${escapeHtml(option.damage)}）` : ''}</option>`).join('')}
            </select>
          </div>`).join('')}
      </section>` : ''}

    <section class="section-block">
      <h3>技能 <small>${skills.count ? `已选 ${selectedSkills.length} / ${skills.count}` : '该组合没有自选技能'}</small></h3>
      ${fixedSkills.size ? `<div class="chip-grid" style="margin-bottom:8px">${[...fixedSkills].filter((id) => SKILL_BY_ID[id]).map((id) => `<span class="tag tag--teal">${escapeHtml(SKILL_BY_ID[id].name)} · 背景/种族</span>`).join('')}</div>` : ''}
      ${skills.count ? `<div class="skill-list">
        ${candidateSkills.map((id) => {
          const checked = selectedSkills.includes(id);
          const disabled = !checked && selectedSkills.length >= skills.count;
          return `<label class="skill-option"><input type="checkbox" data-skill="${id}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} />${escapeHtml(SKILL_BY_ID[id].name)} <span style="color:var(--faint);font-size:10px">${ABILITY_BY_ID[SKILL_BY_ID[id].ability].abbr}</span></label>`;
        }).join('')}
      </div>` : ''}
    </section>

    ${expertiseConfig ? `
      <section class="section-block">
        <h3>专精 <small>已选 ${spec.expertiseChoices.length} / ${expertiseConfig.count}</small></h3>
        <div class="skill-list">
          ${proficientSkills.map((id) => {
            const checked = spec.expertiseChoices.includes(id);
            const disabled = !checked && spec.expertiseChoices.length >= expertiseConfig.count;
            return `<label class="skill-option"><input type="checkbox" data-expertise="${id}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} />${escapeHtml(SKILL_BY_ID[id].name)}</label>`;
          }).join('')}
        </div>
      </section>` : ''}

    <section class="section-block">
      <h3>装备 <small>AC 会实时重算</small></h3>
      <div class="field-grid">
        <div class="field field--wide">
          <label for="field-armor">护甲</label>
          <select id="field-armor" data-field="armor">
            ${SRD_ARMOR.map((entry) => `<option value="${entry.id}" ${entry.id === spec.armor ? 'selected' : ''}>${escapeHtml(entry.name)}${entry.baseAc ? `（AC ${entry.baseAc}${entry.dexCap === null ? ' + 敏捷' : entry.dexCap === 0 ? '' : ` + 敏捷（上限 ${entry.dexCap}）`}${entry.strengthReq ? `，力量 ${entry.strengthReq}` : ''}）` : ''}</option>`).join('')}
          </select>
          <div class="field-help">职业护甲熟练：${armorProf.length ? armorProf.map((id) => ARMOR_CATEGORY_NAMES[id] ?? id).join('、') : '无'}${armorOk ? '' : ' · ⚠ 当前护甲未受训'}</div>
        </div>
        <div class="field field--wide">
          <label class="chip" style="justify-self:start"><input type="checkbox" data-field="shield" ${spec.shield ? 'checked' : ''} />持盾（+2 AC）${shieldOk ? '' : ' · 未受训'}</label>
        </div>
      </div>
    </section>

    <section class="section-block">
      <h3>语言 <small>已填 ${spec.extraLanguages.length} / ${maxLanguages}</small></h3>
      <div class="field">
        <label for="field-languages">额外语言（用逗号分隔）</label>
        <input id="field-languages" data-field="languages" value="${escapeHtml(spec.extraLanguages.join('，'))}" placeholder="${maxLanguages ? '例如：矮人语，龙语' : '该组合没有额外语言'}" ${maxLanguages ? '' : 'disabled'} />
        <div class="field-help">自动掌握：${escapeHtml([...(race.languages ?? []), ...(subrace?.languages ?? [])].join('、'))}</div>
      </div>
    </section>

    <section class="section-block">
      <h3>状态 <small>会改变检定与防御</small></h3>
      <div class="chip-grid">
        ${SRD_CONDITIONS.map((condition) => `<label class="chip" title="${escapeHtml(condition.summary)}"><input type="checkbox" data-condition="${condition.id}" ${spec.conditions.includes(condition.id) ? 'checked' : ''} />${escapeHtml(condition.name)}</label>`).join('')}
      </div>
      <div class="field" style="margin-top:9px">
        <label for="field-exhaustion">力竭等级</label>
        <select id="field-exhaustion" data-field="exhaustion">
          ${[0, 1, 2, 3, 4, 5, 6].map((level) => `<option value="${level}" ${level === spec.exhaustion ? 'selected' : ''}>${level}${level === 0 ? '（无）' : ''}</option>`).join('')}
        </select>
      </div>
    </section>

    <section class="section-block">
      <h3>临时效果 <small>修正层示例</small></h3>
      <div class="chip-grid">
        ${EFFECT_PRESETS.map((effect) => `<label class="chip"><input type="checkbox" data-effect="${effect.id}" ${effectIds.includes(effect.id) ? 'checked' : ''} />${escapeHtml(effect.label)}</label>`).join('')}
      </div>
    </section>
  `;
  updateBuilderError();
}

function pointBuySpent(scores) {
  const costs = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
  return Object.values(scores ?? {}).reduce((total, score) => total + (costs[score] ?? 0), 0);
}

function updateBuilderError() {
  if (state.error) {
    builderError.hidden = false;
    builderError.textContent = `当前表单还差一步：${state.error}`;
  } else {
    builderError.hidden = true;
    builderError.textContent = '';
  }
}

function onBuilderInput(event) {
  const target = event.target;
  if (target.dataset.field === 'name') {
    state.spec.name = target.value;
    try {
      state.lastValid = createCharacter(state.spec, RULES);
      state.character = state.lastValid;
      state.error = null;
    } catch {
      // 表单其他字段无效时，名字仍然可以先写进输入框，角色卡保持上一个有效版本。
    }
    renderSheet();
  }
}

function onBuilderChange(event) {
  const target = event.target;
  const actionButton = event.target.closest('[data-action]');
  if (actionButton) return;

  if (target.name === 'racial-choice') {
    const choose = abilityBonusesOf(raceOf(), subraceOf()).choose;
    const checked = [...builder.querySelectorAll('[name="racial-choice"]:checked')].map((input) => input.value);
    state.spec.racialBonusChoices = choose ? checked.slice(0, choose.count) : [];
    commit();
    return;
  }

  if (target.dataset.ability) {
    state.spec.baseAbilities = {
      ...state.spec.baseAbilities,
      [target.dataset.ability]: Number(target.value)
    };
    commit();
    return;
  }

  if (target.dataset.skill) {
    const id = target.dataset.skill;
    state.spec.skillChoices = target.checked
      ? [...state.spec.skillChoices, id]
      : state.spec.skillChoices.filter((skill) => skill !== id);
    state.spec.expertiseChoices = state.spec.expertiseChoices.filter((skill) => skill !== id || target.checked);
    commit();
    return;
  }

  if (target.dataset.expertise) {
    const id = target.dataset.expertise;
    state.spec.expertiseChoices = target.checked
      ? [...state.spec.expertiseChoices, id]
      : state.spec.expertiseChoices.filter((skill) => skill !== id);
    commit();
    return;
  }

  if (target.dataset.condition) {
    const id = target.dataset.condition;
    state.spec.conditions = target.checked
      ? [...state.spec.conditions, id]
      : state.spec.conditions.filter((condition) => condition !== id);
    commit();
    return;
  }

  if (target.dataset.effect) {
    const id = target.dataset.effect;
    const ids = target.checked
      ? [...state.spec.effects.map((effect) => effect.id), id]
      : state.spec.effects.map((effect) => effect.id).filter((effectId) => effectId !== id);
    state.spec.effects = [...new Set(ids)].map((effectId) => clone(EFFECT_BY_ID[effectId].group));
    commit();
    return;
  }

  if (target.dataset.raceChoice) {
    state.spec.raceChoices = { ...state.spec.raceChoices, [target.dataset.raceChoice]: target.value };
    commit();
    return;
  }

  const field = target.dataset.field;
  if (!field) return;

  switch (field) {
    case 'race': {
      state.spec.race = target.value;
      const race = raceOf();
      state.spec.subrace = race.subraces?.[0]?.id ?? null;
      state.spec.racialBonusChoices = [];
      state.spec.skillChoices = [];
      state.spec.expertiseChoices = [];
      state.spec.raceChoices = {};
      const subrace = subraceOf(race);
      state.spec.extraLanguages = state.spec.extraLanguages.slice(0, maxLanguageChoices(race, subrace, backgroundOf()));
      break;
    }
    case 'subrace': {
      state.spec.subrace = target.value || null;
      state.spec.racialBonusChoices = [];
      state.spec.skillChoices = [];
      state.spec.expertiseChoices = [];
      const race = raceOf();
      const subrace = subraceOf(race);
      state.spec.extraLanguages = state.spec.extraLanguages.slice(0, maxLanguageChoices(race, subrace, backgroundOf()));
      break;
    }
    case 'class': {
      state.spec.class = target.value;
      state.spec.skillChoices = [];
      state.spec.expertiseChoices = [];
      break;
    }
    case 'background': {
      state.spec.background = target.value;
      const race = raceOf();
      const subrace = subraceOf(race);
      state.spec.extraLanguages = state.spec.extraLanguages.slice(0, maxLanguageChoices(race, subrace, backgroundOf()));
      state.spec.skillChoices = [];
      state.spec.expertiseChoices = [];
      break;
    }
    case 'level':
      state.spec.level = Math.min(20, Math.max(1, Number(target.value) || 1));
      break;
    case 'abilityMethod':
      state.spec.abilityMethod = target.value;
      break;
    case 'armor':
      state.spec.armor = target.value;
      break;
    case 'shield':
      state.spec.shield = target.checked;
      break;
    case 'exhaustion':
      state.spec.exhaustion = Number(target.value);
      break;
    case 'languages':
      state.spec.extraLanguages = target.value
        .split(/[,，、;；\s]+/)
        .map((language) => language.trim())
        .filter(Boolean);
      break;
    default:
      return;
  }
  commit();
}

builder.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  if (button.dataset.action === 'standard-array') {
    state.spec.abilityMethod = 'standard-array';
    state.spec.baseAbilities = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };
    commit();
  }
  if (button.dataset.action === 'roll-abilities') {
    const groups = rollAbilityPool(Math.random);
    const values = groups.map((group) => group.total).sort((a, b) => b - a);
    state.spec.abilityMethod = 'roll';
    state.spec.baseAbilities = Object.fromEntries(ABILITIES.map((ability, index) => [ability.id, values[index]]));
    commit();
  }
});

// -------------------------------- sheet --------------------------------

function renderSheet() {
  const sheet = state.lastValid?.sheet;
  if (!sheet) {
    sheetEl.innerHTML = '<p class="check-hint">还没有可显示的角色。</p>';
    return;
  }
  const exportPayload = serializeCharacter(state.lastValid);
  sheetEl.innerHTML = `
    ${state.error ? '<p class="form-error">当前表单有错误，下面是上一个有效角色。</p>' : ''}
    <div class="identity">
      <h3>${escapeHtml(sheet.name)}</h3>
      <span class="identity__meta">${escapeHtml(sheet.race.name)}${sheet.race.subrace ? ` · ${escapeHtml(sheet.race.subrace.name)}` : ''} · ${escapeHtml(sheet.class.name)} · ${escapeHtml(sheet.background.name)}</span>
      <span class="identity__level">Lv ${sheet.level} · PB ${money(sheet.proficiencyBonus)}</span>
    </div>

    <div class="ability-block">
      ${ABILITIES.map((ability) => `
        <div class="ability-tile">
          <div class="ability-tile__label">${escapeHtml(ability.abbr)}</div>
          <div class="ability-tile__score">${sheet.abilityScores[ability.id]}</div>
          <div class="ability-tile__mod">${money(sheet.abilityMods[ability.id])}</div>
          <span class="ability-tile__racial">${sheet.racialBonuses[ability.id] ? `种族 ${money(sheet.racialBonuses[ability.id])}` : ''}</span>
        </div>`).join('')}
    </div>

    <div class="stat-grid">
      <div class="stat"><div class="stat__label">armor class</div><div class="stat__value">${sheet.armorClass}<small>${sheet.armorUnproficient ? ' 未受训' : ''}</small></div></div>
      <div class="stat"><div class="stat__label">hit points</div><div class="stat__value">${sheet.hitPoints.current}<small> / ${sheet.hitPoints.max}</small></div></div>
      <div class="stat"><div class="stat__label">speed</div><div class="stat__value">${sheet.speed}<small> 尺</small></div></div>
      <div class="stat"><div class="stat__label">initiative</div><div class="stat__value">${money(sheet.initiative)}</div></div>
      <div class="stat"><div class="stat__label">passive perception</div><div class="stat__value">${sheet.passivePerception}</div></div>
      <div class="stat"><div class="stat__label">spell save dc</div><div class="stat__value">${sheet.spellcasting ? sheet.spellcasting.saveDc : '—'}<small>${sheet.spellcasting ? ` ${ABILITY_BY_ID[sheet.spellcasting.ability].name}` : ''}</small></div></div>
    </div>

    <div class="subcard">
      <div class="subcard__title">豁免 <small>职业熟练</small></div>
      <div class="save-grid">
        ${ABILITIES.map((ability) => `<div class="save-chip ${sheet.savingThrows[ability.id].proficient ? 'is-proficient' : ''}"><span class="save-chip__label">${escapeHtml(ability.abbr)}</span><span class="save-chip__value">${money(sheet.savingThrows[ability.id].total)}</span></div>`).join('')}
      </div>
    </div>

    <div class="subcard">
      <div class="subcard__title">技能 <small>共 ${SKILLS.length} 项</small></div>
      <div class="skill-table">
        ${SKILLS.map((skill) => {
          const entry = sheet.skills[skill.id];
          return `<div class="skill-row">
            <span class="skill-row__total">${money(entry.total)}</span>
            <span class="skill-row__name">${escapeHtml(entry.name)}<em>${ABILITY_BY_ID[entry.ability].abbr}</em></span>
            <span class="skill-row__badges">${entry.expertise ? '<span class="badge badge--expertise">专精</span>' : entry.proficient ? '<span class="badge badge--prof">熟练</span>' : ''}</span>
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="subcard">
      <div class="subcard__title">防御与状态 <small>${sheet.conditions.length ? `${sheet.conditions.length} 个状态` : '无状态'}</small></div>
      <div class="defense-row">
        <span class="tag ${sheet.defenses.melee.attackers === 'advantage' ? 'tag--danger' : sheet.defenses.melee.attackers === 'disadvantage' ? 'tag--teal' : ''}">近战攻击者：${attackersLabel(sheet.defenses.melee.attackers)}</span>
        <span class="tag ${sheet.defenses.ranged.attackers === 'advantage' ? 'tag--danger' : sheet.defenses.ranged.attackers === 'disadvantage' ? 'tag--teal' : ''}">远程攻击者：${attackersLabel(sheet.defenses.ranged.attackers)}</span>
        ${sheet.defenses.melee.autoCritWithin5ft ? '<span class="tag tag--danger">5 尺内攻击必定暴击</span>' : ''}
        ${sheet.flags.speedZero ? '<span class="tag tag--danger">速度 0</span>' : ''}
        ${sheet.flags.incapacitated ? '<span class="tag tag--danger">不能行动</span>' : ''}
        ${sheet.resistances.length ? `<span class="tag tag--teal">抗性：${escapeHtml(sheet.resistances.map(damageName).join('、'))}</span>` : ''}
        ${sheet.flags.lucky ? '<span class="tag tag--teal">幸运：自然 1 重投</span>' : ''}
      </div>
      ${sheet.conditions.length ? `<ul class="plain-list" style="margin-top:8px">${sheet.conditions.map((condition) => `<li><strong>${escapeHtml(condition.name)}</strong>：${escapeHtml(condition.summary)}</li>`).join('')}</ul>` : ''}
      ${sheet.exhaustion.level ? `<p class="check-hint" style="margin:8px 0 0">力竭 ${sheet.exhaustion.level}：${escapeHtml(sheet.exhaustion.summaries.join(' '))}</p>` : ''}
    </div>

    <div class="subcard">
      <div class="subcard__title">熟练与语言</div>
      <div class="plain-list">
        <div class="prof-line"><span>护甲</span><span>${escapeHtml(sheet.proficiencies.armor.map((id) => ARMOR_CATEGORY_NAMES[id] ?? id).join('、') || '无')}</span></div>
        <div class="prof-line"><span>武器</span><span>${escapeHtml(sheet.proficiencies.weapons.join('、') || '无')}</span></div>
        <div class="prof-line"><span>工具</span><span>${escapeHtml(sheet.proficiencies.tools.join('、') || '无')}</span></div>
        <div class="prof-line"><span>语言</span><span>${escapeHtml(sheet.proficiencies.languages.join('、') || '无')}${sheet.languageChoicesRemaining ? `（还可选 ${sheet.languageChoicesRemaining} 门）` : ''}</span></div>
      </div>
    </div>

    <details class="export-box">
      <summary>特性（${sheet.traits.length}）</summary>
      <ul class="trait-list" style="margin-top:8px">
        ${sheet.traits.map((trait) => `<li><strong>${escapeHtml(trait.name)}</strong>${trait.source ? ` · ${escapeHtml(trait.source)}` : ''}：${escapeHtml(trait.description ?? '')}</li>`).join('')}
      </ul>
    </details>

    ${sheet.warnings.length ? `<ul class="warning-list">${sheet.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul>` : ''}

    <details class="export-box">
      <summary>导出角色 JSON（只保存构建输入）</summary>
      <textarea readonly aria-label="角色 JSON">${escapeHtml(JSON.stringify(exportPayload, null, 2))}</textarea>
    </details>
  `;
}

function attackersLabel(value) {
  if (value === 'advantage') return '优势';
  if (value === 'disadvantage') return '劣势';
  return '普通';
}

function damageName(id) {
  return { acid: '强酸', cold: '寒冷', fire: '火焰', lightning: '闪电', poison: '毒素', radiant: '光耀', all: '全部' }[id] ?? id;
}

// -------------------------------- checks --------------------------------

function renderChecks() {
  const character = state.lastValid;
  if (!character) {
    checksEl.innerHTML = '<p class="check-hint">先创建一个有效角色。</p>';
    return;
  }
  const check = state.check;
  const kind = check.kind;
  const targetOptions = optionsForKind(kind);
  if (!targetOptions.some((option) => option.value === check.target)) {
    check.target = targetOptions[0]?.value ?? 'perception';
  }
  checksEl.innerHTML = `
    <div class="check-form">
      <div class="field">
        <label for="check-kind">检定类型</label>
        <select id="check-kind" data-check="kind">
          <option value="skill" ${kind === 'skill' ? 'selected' : ''}>技能检定</option>
          <option value="abilityCheck" ${kind === 'abilityCheck' ? 'selected' : ''}>属性检定</option>
          <option value="save" ${kind === 'save' ? 'selected' : ''}>豁免</option>
          <option value="attack" ${kind === 'attack' ? 'selected' : ''}>攻击</option>
          <option value="initiative" ${kind === 'initiative' ? 'selected' : ''}>先攻</option>
        </select>
      </div>
      ${kind === 'initiative' ? '' : `
        <div class="field">
          <label for="check-target">${kind === 'skill' ? '技能' : '属性'}</label>
          <select id="check-target" data-check="target">
            ${targetOptions.map((option) => `<option value="${option.value}" ${option.value === check.target ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
          </select>
        </div>`}
      ${kind === 'attack' ? `
        <div class="field">
          <label for="check-ac">目标 AC</label>
          <input id="check-ac" data-check="ac" type="number" min="1" max="40" value="${check.ac}" />
        </div>` : `
        <div class="field">
          <label for="check-dc">DC</label>
          <input id="check-dc" data-check="dc" type="number" min="1" max="40" value="${check.dc}" />
        </div>`}
      <div class="field">
        <label for="check-word">单词加值</label>
        <select id="check-word" data-check="wordBonus">
          ${[0, 1, 2, 3].map((bonus) => `<option value="${bonus}" ${bonus === Number(check.wordBonus) ? 'selected' : ''}>${bonus ? `+${bonus} · ${wordBonusLabel(bonus)}` : '+0 · 未掌握'}</option>`).join('')}
        </select>
      </div>
      ${kind === 'attack' ? `
        <div class="field field--wide">
          <label class="chip" style="justify-self:start"><input type="checkbox" data-check="proficient" ${check.proficient ? 'checked' : ''} />武器熟练（+熟练加值）</label>
        </div>` : ''}
      <div class="field">
        <label for="check-bonus">临时加值</label>
        <input id="check-bonus" data-check="bonus" type="number" min="-10" max="10" value="${check.bonus}" />
      </div>
      ${kind === 'skill' || kind === 'abilityCheck' ? `
        <div class="field field--wide">
          <label class="chip" style="justify-self:start"><input type="checkbox" data-check="requiresSight" ${check.requiresSight ? 'checked' : ''} />需要视觉（目盲时自动失败）</label>
        </div>` : ''}
      ${kind === 'save' ? `
        <div class="field field--wide">
          <span class="field-label">豁免语境（触发种族优势）</span>
          <div class="chip-grid">
            ${[['poison', '对抗毒素'], ['charm', '对抗魅惑'], ['magic', '对抗魔法'], ['frightened', '对抗恐惧']].map(([tag, label]) => `<label class="chip"><input type="checkbox" data-context="${tag}" ${check.contexts.includes(tag) ? 'checked' : ''} />${label}</label>`).join('')}
          </div>
        </div>` : ''}
      <div class="field field--wide">
        <span class="field-label">情境修正</span>
        <div class="chip-grid">
          <label class="chip"><input type="checkbox" data-situation="help" ${check.help ? 'checked' : ''} />协助（优势）</label>
          <label class="chip"><input type="checkbox" data-situation="cover2" ${check.cover2 ? 'checked' : ''} />半掩体 +2</label>
          <label class="chip"><input type="checkbox" data-situation="cover5" ${check.cover5 ? 'checked' : ''} />四分之三掩体 +5</label>
          <label class="chip"><input type="checkbox" data-situation="disadvantage" ${check.disadvantage ? 'checked' : ''} />其他劣势</label>
        </div>
      </div>
      <div class="check-actions">
        <button type="button" class="primary-button" data-check-action="roll">掷 d20</button>
        <span class="check-hint">DC/AC 只作为判定目标；骰子由浏览器随机数生成。</span>
      </div>
    </div>

    <div id="check-result"></div>
    <div class="odds" id="check-odds"></div>
    <div class="history" id="check-history"></div>
  `;
  renderResult();
  renderOdds();
  renderHistory();
}

function optionsForKind(kind) {
  if (kind === 'skill') {
    return SKILLS.map((skill) => ({
      value: skill.id,
      label: `${skill.name} · ${ABILITY_BY_ID[skill.ability].abbr}`
    }));
  }
  if (kind === 'abilityCheck' || kind === 'save' || kind === 'attack') {
    return ABILITIES.map((ability) => ({
      value: ability.id,
      label: kind === 'attack' ? `${ability.name}攻击` : `${ability.name}（${ability.abbr}）`
    }));
  }
  return [];
}

function checkOptions() {
  const check = state.check;
  const options = {
    kind: check.kind,
    dc: Number(check.dc),
    wordBonus: Number(check.wordBonus)
  };
  if (check.kind === 'skill') options.skill = check.target;
  if (check.kind === 'abilityCheck' || check.kind === 'attack') options.ability = check.target;
  if (check.kind === 'save') {
    options.ability = check.target;
    options.context = check.contexts;
  }
  if (check.kind === 'attack') {
    options.targetAc = Number(check.ac);
    options.proficient = check.proficient;
  }
  if (check.requiresSight) options.requiresSight = true;
  const situational = [];
  if (check.help) situational.push({ source: 'help', label: '协助', type: 'advantage' });
  if (check.cover2) situational.push({ source: 'cover', label: '半掩体', value: 2 });
  if (check.cover5) situational.push({ source: 'cover', label: '四分之三掩体', value: 5 });
  if (check.disadvantage) situational.push({ source: 'dm', label: '其他劣势', type: 'disadvantage' });
  if (Number(check.bonus)) situational.push({ source: 'dm', label: '临时加值', value: Number(check.bonus) });
  if (situational.length) options.situational = situational;
  return options;
}

function onCheckChange(event) {
  const target = event.target;
  if (target.dataset.check) {
    const key = target.dataset.check;
    if (key === 'kind') {
      state.check.kind = target.value;
      state.check.target = optionsForKind(target.value)[0]?.value ?? 'perception';
      state.check.proficient = true;
    } else if (target.type === 'checkbox') {
      state.check[key] = target.checked;
    } else if (target.type === 'number' || key === 'wordBonus') {
      state.check[key] = Number(target.value);
    } else {
      state.check[key] = target.value;
    }
    state.lastResult = null;
    renderChecks();
  }
  if (target.dataset.context) {
    const tag = target.dataset.context;
    state.check.contexts = target.checked
      ? [...state.check.contexts, tag]
      : state.check.contexts.filter((entry) => entry !== tag);
    renderChecks();
  }
  if (target.dataset.situation) {
    state.check[target.dataset.situation] = target.checked;
    renderChecks();
  }
}

function onCheckClick(event) {
  const button = event.target.closest('[data-check-action]');
  if (!button) return;
  if (button.dataset.checkAction !== 'roll') return;
  if (!state.lastValid) return;
  const result = resolveCheck(state.lastValid, { ...checkOptions(), rng: Math.random });
  state.lastResult = result;
  state.history.unshift({
    at: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    label: describeCheck(),
    total: result.total,
    target: result.kind === 'attack' ? result.targetAc : result.dc,
    success: result.success,
    autoFail: result.autoFail
  });
  state.history = state.history.slice(0, 6);
  renderResult();
  renderOdds();
  renderHistory();
}

function describeCheck() {
  const check = state.check;
  if (check.kind === 'skill') return `${SKILL_BY_ID[check.target]?.name ?? check.target}检定`;
  if (check.kind === 'abilityCheck') return `${ABILITY_BY_ID[check.target]?.name ?? check.target}检定`;
  if (check.kind === 'save') return `${ABILITY_BY_ID[check.target]?.name ?? check.target}豁免`;
  if (check.kind === 'attack') return `${ABILITY_BY_ID[check.target]?.name ?? check.target}攻击`;
  return '先攻';
}

function renderResult() {
  const container = document.querySelector('#check-result');
  if (!container) return;
  const result = state.lastResult;
  if (!result) {
    container.innerHTML = '<p class="check-hint">选择一项检定，掷一次 d20 查看完整加值拆解。</p>';
    return;
  }
  const verdict = result.autoFail
    ? '自动失败'
    : result.success === null
      ? '未设目标'
      : result.success
        ? result.critical
          ? '暴击命中'
          : '成功'
        : result.criticalMiss
          ? '自动失手'
          : '失败';
  const modifierChips = result.breakdown
    .filter((entry) => entry.key !== 'ability')
    .map((entry) => `<span class="modifier-chip ${entry.key === 'word' ? 'modifier-chip--word' : ''}">${escapeHtml(entry.label)} <b>${money(entry.value)}</b></span>`)
    .join('');
  const modeChips = [
    ...result.advantageSources.map((source) => `<span class="modifier-chip modifier-chip--adv">优势 · ${escapeHtml(source.label)}</span>`),
    ...result.disadvantageSources.map((source) => `<span class="modifier-chip modifier-chip--dis">劣势 · ${escapeHtml(source.label)}</span>`)
  ].join('');
  const notes = [
    ...(result.autoFailReasons ?? []),
    ...(result.cancelled ? ['优势与劣势抵消，按普通掷骰。'] : []),
    ...(result.luckReroll ? ['半身人幸运：自然 1 已重投。'] : [])
  ];
  container.innerHTML = `
    <div class="result ${result.success === true ? 'result--success' : result.success === false ? 'result--fail' : ''}">
      <div class="result__top">
        <span class="result__total">${result.total}</span>
        <span class="result__verdict">${verdict}${result.kind === 'attack' ? ` · AC ${result.targetAc ?? '—'}` : result.dc !== null ? ` · DC ${result.dc}` : ''}</span>
      </div>
      <div class="result__formula">${escapeHtml(result.formula)}</div>
      <div class="result__chips">${modifierChips}${modeChips}</div>
      ${notes.length ? `<ul class="result__notes">${notes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul>` : ''}
    </div>
  `;
}

function renderOdds() {
  const container = document.querySelector('#check-odds');
  if (!container || !state.lastValid) return;
  const base = checkOptions();
  const rows = [0, 1, 2, 3].map((bonus) => checkOdds(state.lastValid, { ...base, wordBonus: bonus }));
  if (rows.every((row) => row.chance === null)) {
    container.innerHTML = '<h3>单词加值 → 成功率</h3><p>设置 DC 或 AC 后显示概率。</p>';
    return;
  }
  container.innerHTML = `
    <h3>单词加值 → 成功率</h3>
    <p>同一检定重复掷骰的穷举概率（0 = 未掌握，3 = 已掌握）；单词是概率因素，不是结果开关。${state.lastValid?.sheet.flags?.lucky ? '（未计入半身人“幸运”重投）' : ''}</p>
    ${rows.map((row, bonus) => {
      const percent = row.chance === null ? 0 : Math.round(row.chance * 100);
      return `<div class="odds-row ${bonus === Number(state.check.wordBonus) ? 'is-active' : ''}">
        <span class="odds-row__label">+${bonus} ${escapeHtml(wordBonusLabel(bonus))}</span>
        <span class="odds-row__track"><span class="odds-row__fill" style="width:${percent}%"></span></span>
        <span class="odds-row__value">${row.chance === null ? '—' : `${percent}%`}</span>
      </div>`;
    }).join('')}
  `;
}

function renderHistory() {
  const container = document.querySelector('#check-history');
  if (!container) return;
  if (!state.history.length) {
    container.innerHTML = '<h3>最近掷骰</h3><p class="check-hint">还没有记录。</p>';
    return;
  }
  container.innerHTML = `
    <h3>最近掷骰</h3>
    <ol>
      ${state.history.map((entry) => `<li><b>${escapeHtml(entry.label)}</b><span>${entry.autoFail ? '自动失败' : `${entry.total} vs ${entry.target}`}</span><span class="${entry.success ? 'ok' : 'bad'}">${entry.autoFail ? '自动失败' : entry.success ? '成功' : '失败'}</span><span>${escapeHtml(entry.at)}</span></li>`).join('')}
    </ol>
  `;
}
