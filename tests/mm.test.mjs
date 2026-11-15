import test from 'node:test';
import assert from 'node:assert/strict';

import { EXPECTED, loadLibrary, validateLibrary } from '../scripts/mm-validate.mjs';
import { queryEntries } from '../scripts/mm-query.mjs';

const lib = await loadLibrary();
const byEn = (name) => {
  const found = lib.monsters.find((monster) => monster.name_en === name);
  assert.ok(found, `missing monster ${name}`);
  return found;
};

const actionsNamed = (monster, nameEn) => {
  const found = [
    ...(monster.actions ?? []),
    ...(monster.reactions ?? []),
    ...(monster.legendary_actions ?? []),
  ].find((action) => action.name_en === nameEn);
  assert.ok(found, `${monster.name_en} missing action ${nameEn}`);
  return found;
};

const walk = (value, onKey, onString, path = '$') => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, onKey, onString, `${path}[${index}]`));
    return;
  }
  if (typeof value === 'string') {
    onString(value, path);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    onKey(key, `${path}.${key}`);
    walk(item, onKey, onString, `${path}.${key}`);
  }
};

test('validator passes with expected coverage', async () => {
  const result = await validateLibrary();
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.equal(result.counts.monster, EXPECTED.total);
});

test('library has 450 unique MM records with shape and source fields', () => {
  assert.equal(lib.monsters.length, 450);
  assert.equal(new Set(lib.monsters.map((monster) => monster.id)).size, 450);
  for (const monster of lib.monsters) {
    assert.match(monster.id, /^mm:monster:[a-z0-9-]+$/);
    assert.equal(monster.type, 'monster');
    assert.ok(monster.name);
    assert.ok(monster.name_en);
    assert.ok(monster.size.length);
    assert.ok(monster.creature_type);
    assert.ok(monster.alignment);
    assert.ok(monster.armor_class > 0);
    assert.ok(monster.hit_points > 0);
    assert.equal(monster.source.book, 'MM');
    assert.ok(monster.source.page >= 1 && monster.source.page <= 400);
    assert.equal(typeof monster.source.srd, 'boolean');
    assert.ok(monster.brief);
    assert.ok(!monster.brief.includes('\n'));
  }
});

test('no prose fields or uncleaned 5etools tags are committed', () => {
  const forbidden = new Set(['entries', 'headerEntries', 'footerEntries', 'entry', 'text', 'description', 'desc']);
  for (const monster of lib.monsters) {
    walk(
      monster,
      (key, path) => assert.ok(!forbidden.has(key), `${path}: forbidden key ${key}`),
      (text, path) => {
        assert.ok(!text.includes('{@'), `${path}: uncleaned tag`);
        assert.ok(text.length <= 300, `${path}: suspiciously long text`);
      },
    );
  }
});

test('taxonomy indexes cover every monster exactly once per primary dimension', () => {
  assert.equal(lib.taxonomy.total, 450);
  for (const dimension of ['type', 'size', 'cr', 'environment']) {
    const index = lib.taxonomy.indexes[dimension];
    assert.ok(index, `missing ${dimension} index`);
    const seen = new Map();
    for (const [category, ids] of Object.entries(index)) {
      for (const id of ids) seen.set(id, (seen.get(id) ?? 0) + 1);
    }
    for (const monster of lib.monsters) {
      const count = seen.get(monster.id) ?? 0;
      if (dimension === 'environment') {
        const expected = monster.environment_codes.length || 1;
        assert.equal(count, expected, `${monster.id}: environment index count`);
      } else {
        assert.equal(count, 1, `${monster.id}: ${dimension} index count`);
      }
    }
  }
});

test('Adult Red Dragon stat block and attack parsing', () => {
  const dragon = byEn('Adult Red Dragon');
  assert.deepEqual(dragon.size, ['巨型']);
  assert.equal(dragon.creature_type, '龙');
  assert.equal(dragon.armor_class, 19);
  assert.equal(dragon.hit_points, 256);
  assert.equal(dragon.challenge_rating, '17');
  assert.equal(dragon.challenge_rating_numeric, 17);
  assert.equal(dragon.abilities.str, 27);
  assert.equal(dragon.abilities.cha, 21);
  assert.ok(dragon.environment.includes('山地'));
  assert.ok(dragon.group.includes('色彩龙'));
  assert.equal(dragon.is_legendary, true);

  const bite = actionsNamed(dragon, 'Bite');
  assert.equal(bite.attack, '近战武器');
  assert.equal(bite.to_hit, 14);
  assert.equal(bite.reach_ft, 10);
  assert.ok(bite.damage_dice.includes('2d10 + 8'));
  assert.ok(bite.damage_dice.includes('2d6'));
  assert.deepEqual(bite.average_damage, [19, 7]);
  assert.ok(bite.damage_types.includes('穿刺'));
  assert.ok(bite.damage_types.includes('火焰'));

  const breath = actionsNamed(dragon, 'Fire Breath');
  assert.equal(breath.recharge.label, '5-6');
  assert.equal(breath.save_dc, 21);
  assert.ok(breath.damage_dice.includes('18d6'));
  assert.deepEqual(breath.damage_types, ['火焰']);

  assert.equal(dragon.legendary_actions.length, 3);
  const wing = dragon.legendary_actions.find((action) => action.name_en === 'Wing Attack');
  assert.ok(wing);
  assert.equal(wing.legendary_cost, 2);
});

test('Lich keeps lair CR and structured spellcasting', () => {
  const lich = byEn('Lich');
  assert.equal(lich.challenge_rating, '21');
  assert.equal(lich.challenge_rating_lair, '22');
  assert.equal(lich.has_lair, true);
  assert.equal(lich.is_spellcaster, true);
  assert.equal(lich.is_legendary, true);
  assert.equal(lich.spellcasting.length, 1);
  const casting = lich.spellcasting[0];
  assert.equal(casting.ability, '智力');
  assert.equal(casting.save_dc, 20);
  assert.equal(casting.caster_level, 18);
  assert.equal(casting.levels['9'].slots, 1);
  assert.ok(casting.levels['9'].spells.includes('律令死亡'));
  assert.ok(casting.spell_count > 0);
});

test('Goblin tags and attack values survive ingestion', () => {
  const goblin = byEn('Goblin');
  assert.equal(goblin.creature_type_code, 'humanoid');
  assert.ok(goblin.creature_tags.includes('类地精'));
  assert.deepEqual(goblin.size, ['小型']);
  assert.ok(goblin.environment.includes('幽暗地域'));
  const scimitar = actionsNamed(goblin, 'Scimitar');
  assert.equal(scimitar.attack, '近战武器');
  assert.equal(scimitar.to_hit, 4);
  assert.equal(scimitar.reach_ft, 5);
  assert.deepEqual(scimitar.damage_dice, ['1d6 + 2']);
  assert.deepEqual(scimitar.average_damage, [5]);
  assert.deepEqual(scimitar.damage_types, ['挥砍']);
});

test('shapechangers are classified from traitTags', () => {
  const werewolf = byEn('Werewolf');
  assert.equal(werewolf.is_shapechanger, true);
  assert.ok(werewolf.trait_tags.includes('Shapechanger'));
  assert.equal(lib.monsters.filter((monster) => monster.is_shapechanger).length, 23);
});

test('query helpers filter by type, CR, environment, group, flags and text', () => {
  assert.equal(queryEntries(lib, { type: 'dragon', 'cr-min': '17' }).length, 13);
  assert.equal(queryEntries(lib, { environment: '幽暗地域', size: '中型' }).length, 62);
  assert.equal(queryEntries(lib, { group: '色彩龙', legendary: true }).length, 10);
  assert.equal(queryEntries(lib, { spellcaster: true }).length, 83);
  assert.equal(queryEntries(lib, { cr: '1/4' }).length, 44);
  assert.equal(queryEntries(lib, { shapechanger: true }).length, 23);
  assert.equal(queryEntries(lib, { reactions: true }).length, 18);
  assert.equal(queryEntries(lib, { lair: true }).length, 5);
  assert.ok(queryEntries(lib, { search: '火球术' }).length > 0);
  assert.ok(queryEntries(lib, { type: '龙', size: '超巨型' }).every((monster) => monster.creature_type_code === 'dragon'));
});

test('query sorting and result shape are stable', () => {
  const dragons = queryEntries(lib, { type: 'dragon', sort: 'cr' });
  const crs = dragons.map((monster) => monster.challenge_rating_numeric);
  assert.deepEqual(crs, [...crs].sort((a, b) => a - b));
  const ancient = queryEntries(lib, { search: 'Ancient Red Dragon' });
  assert.equal(ancient.length, 1);
  assert.equal(ancient[0].name, '远古红龙');
  assert.equal(ancient[0].size[0], '超巨型');
});
