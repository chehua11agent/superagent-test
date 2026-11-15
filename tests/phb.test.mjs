import test from 'node:test';
import assert from 'node:assert/strict';

import { loadLibrary, validateLibrary, EXPECTED } from '../scripts/phb-validate.mjs';
import { queryEntries } from '../scripts/phb-query.mjs';

const lib = await loadLibrary();

test('PHB library passes structural validation', () => {
  const result = validateLibrary(lib);
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.deepEqual(result.stats.counts, EXPECTED);
});

test('PHB catalogue counts match the 2014 book', () => {
  assert.equal(lib.races.filter((r) => r.type === 'race').length, 9);
  assert.equal(lib.races.filter((r) => r.type === 'subrace').length, 10); // 9 subraces + variant human
  assert.equal(lib.classes.length, 12);
  assert.equal(lib.subclasses.length, 40);
  assert.equal(lib.spells.length, 361);
  assert.equal(lib.backgrounds.filter((b) => !b.is_variant && !b.is_custom).length, 13);
  assert.equal(lib.feats.length, 42);
  assert.equal(lib.conditions.length, 15);
  assert.equal(lib.monsters.length, 15);
});

test('Fireball is normalized with its key mechanics', () => {
  const fireball = lib.spells.find((s) => s.name_en === 'Fireball');
  assert.ok(fireball);
  assert.equal(fireball.level, 3);
  assert.equal(fireball.school, 'Evocation');
  assert.equal(fireball.source.page, 241);
  assert.deepEqual(fireball.classes.sort(), ['phb:class:sorcerer', 'phb:class:wizard']);
  assert.equal(fireball.range, '150 尺');
  assert.equal(fireball.saving_throw[0], '敏捷');
  assert.deepEqual(fireball.damage.dice, ['8d6']);
  assert.deepEqual(fireball.damage.types, ['火焰']);
  assert.deepEqual(fireball.area, ['球状']);
  assert.match(fireball.brief, /3 环.*塑能.*8d6 火焰/);
});

test('class, subclass and feature references resolve', () => {
  const wizard = lib.classes.find((c) => c.name_en === 'Wizard');
  assert.ok(wizard);
  assert.equal(wizard.hit_die, 'd6');
  assert.deepEqual(wizard.saving_throws, ['智力', '感知']);
  assert.equal(wizard.subclasses.length, 8);
  for (const id of wizard.subclasses) {
    const sub = lib.subclasses.find((s) => s.id === id);
    assert.ok(sub, id);
    assert.ok(sub.features.length >= 3, `${sub.name} has too few features`);
  }
});

test('races keep subrace deltas and parent values separate', () => {
  const dwarf = lib.races.find((r) => r.name_en === 'Dwarf');
  const hill = lib.races.find((r) => r.id === 'phb:subrace:dwarf-hill');
  assert.equal(dwarf.darkvision_ft, 60);
  assert.equal(hill.parent_race, dwarf.id);
  assert.equal(hill.parent_values.ability, '+2 体质');
  assert.match(hill.ability, /\+1 感知/);
  assert.match(hill.brief, /丘陵矮人/);
});

test('feats keep multi-ability and restored PHB prerequisites', () => {
  const ritual = lib.feats.find((f) => f.name_en === 'Ritual Caster');
  assert.deepEqual(ritual.prerequisite, ['智力 13+ 或 感知 13+']);
  const resilient = lib.feats.find((f) => f.name_en === 'Resilient');
  assert.match(resilient.ability, /1 项自选/);
  assert.deepEqual(lib.feats.find((f) => f.name_en === 'Crossbow Expert').prerequisite, ['敏捷 13+']);
  assert.deepEqual(lib.feats.find((f) => f.name_en === 'Dual Wielder').prerequisite, ['力量 13+ 或 敏捷 13+']);
  assert.deepEqual(lib.feats.find((f) => f.name_en === 'Great Weapon Master').prerequisite, ['力量 13+']);
  assert.deepEqual(lib.feats.find((f) => f.name_en === 'Sharpshooter').prerequisite, ['敏捷 13+']);
});

test('background equipment and variant feature names are readable', () => {
  const spy = lib.backgrounds.find((b) => b.name_en === 'Variant Criminal (Spy)');
  assert.equal(spy.feature.name, '密探接头人');
  const folk = lib.backgrounds.find((b) => b.name_en === 'Folk Hero');
  assert.deepEqual(folk.equipment[0][0].items[0], '工匠工具（任选）');
  const hermit = lib.backgrounds.find((b) => b.name_en === 'Hermit');
  assert.ok(hermit.equipment[0][0].items.every((x) => !x.startsWith('{')));
  const monk = lib.classes.find((c) => c.name_en === 'Monk');
  assert.equal(monk.tables[0].rows[0][0], '1d4');
});

test('races carry proficiencies and variant human replacements', () => {
  const human = lib.races.find((r) => r.name_en === 'Human');
  assert.match(human.ability, /\+1 力量/);
  assert.equal(human.ability_bonuses.fixed.str, 1);
  const variant = lib.races.find((r) => r.name_en === 'Variant');
  assert.equal(variant.ability_replaces_parent, true);
  assert.deepEqual(variant.feat_choices, ['任意专长 ×1']);
  assert.deepEqual(variant.skill_proficiencies, ['任意技能 ×1']);
  const drow = lib.races.find((r) => r.name_en === 'Drow');
  assert.ok(drow.weapon_proficiencies.includes('刺剑'));
});

test('backgrounds separate core, variants and custom entries', () => {
  const acolyte = lib.backgrounds.find((b) => b.name_en === 'Acolyte');
  assert.deepEqual(acolyte.skill_proficiencies, ['洞见', '宗教']);
  assert.equal(acolyte.feature.name, '信仰庇护');
  assert.equal(lib.backgrounds.filter((b) => b.is_variant).length, 6);
  assert.equal(lib.backgrounds.filter((b) => b.is_custom).length, 1);
});

test('equipment is typed with combat mechanics', () => {
  const longsword = lib.equipment.find((e) => e.name_en === 'Longsword');
  assert.equal(longsword.category, 'weapon');
  assert.equal(longsword.damage.one_handed, '1d8');
  assert.equal(longsword.damage.two_handed, '1d10');
  assert.equal(longsword.damage.type, '挥砍');
  assert.equal(longsword.cost_gp, 15);
  const chainMail = lib.equipment.find((e) => e.name_en === 'Chain Mail');
  assert.equal(chainMail.armor_class, 16);
  assert.equal(chainMail.stealth_disadvantage, true);
  const pack = lib.equipment.find((e) => e.name_en === "Explorer's Pack");
  assert.equal(pack.category, 'pack');
  assert.ok(pack.pack_contents.length >= 5);
});

test('monster stat blocks keep parsed actions', () => {
  const ape = lib.monsters.find((m) => m.name_en === 'Ape');
  assert.equal(ape.armor_class, 12);
  assert.equal(ape.hit_points, 19);
  assert.equal(ape.challenge_rating, '1/2');
  const fist = ape.actions.find((a) => a.name_en === 'Fist');
  assert.equal(fist.to_hit, 5);
  assert.deepEqual(fist.damage_dice, ['1d6 + 3']);
});

test('query filters by class, level and school', () => {
  const wizardLevel1 = queryEntries(lib, { type: 'spell', class: 'wizard', level: '1' });
  assert.ok(wizardLevel1.length >= 25);
  assert.ok(wizardLevel1.every((s) => s.level === 1 && s.classes.includes('phb:class:wizard')));

  const evocation = queryEntries(lib, { type: 'spell', school: '塑能' });
  assert.ok(evocation.length > 50);
  assert.ok(evocation.every((s) => s.school_zh === '塑能'));

  const fire = queryEntries(lib, { type: 'spell', search: 'fireball' });
  assert.equal(fire[0].name_en, 'Fireball');
});

test('no PHB prose or 5etools markup leaks into the library', () => {
  const serialized = JSON.stringify(lib);
  assert.ok(!serialized.includes('{@'));
  assert.ok(!serialized.includes('|phb'));
  assert.ok(!serialized.includes('[object Object]'));
});

test('spell ranges keep the mile unit from the source snapshot', () => {
  const cases = [
    ['Clairvoyance', '1 英里'],
    ['Control Weather', '半径 5 英里'],
    ['Meteor Swarm', '1 英里'],
    ['Project Image', '500 英里'],
  ];
  for (const [name, range] of cases) {
    assert.equal(lib.spells.find((s) => s.name_en === name).range, range, name);
  }
});

test('ranged weapon ranges split into normal and long distances', () => {
  const heavyCrossbow = lib.equipment.find((e) => e.name_en === 'Heavy Crossbow');
  assert.deepEqual(heavyCrossbow.range, { normal: 100, long: 400 });
  const longbow = lib.equipment.find((e) => e.name_en === 'Longbow');
  assert.deepEqual(longbow.range, { normal: 150, long: 600 });
  assert.equal(lib.equipment.find((e) => e.name_en === 'Longsword').range, null);
});
