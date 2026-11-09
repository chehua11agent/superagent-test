/* =====================================================================
   THE SUNLESS KEEP — 5e rules engine (browser, no dependencies)
   Covers: d20 checks, saves, advantage/disadvantage, attacks vs AC,
   criticals, damage resistance/vulnerability, initiative, movement on
   a 5-ft grid, conditions, death saves, spells, short rests, simple AI.
   ===================================================================== */

const Rules = (() => {
  const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const SKILLS = {
    athletics: 'str', acrobatics: 'dex', 'sleight-of-hand': 'dex', stealth: 'dex',
    arcana: 'int', history: 'int', investigation: 'int', nature: 'int', religion: 'int',
    'animal-handling': 'wis', insight: 'wis', medicine: 'wis', perception: 'wis', survival: 'wis',
    deception: 'cha', intimidation: 'cha', performance: 'cha', persuasion: 'cha'
  };
  const SKILL_LABEL = {
    athletics: 'Athletics', acrobatics: 'Acrobatics', 'sleight-of-hand': 'Sleight of Hand',
    stealth: 'Stealth', arcana: 'Arcana', history: 'History', investigation: 'Investigation',
    nature: 'Nature', religion: 'Religion', 'animal-handling': 'Animal Handling',
    insight: 'Insight', medicine: 'Medicine', perception: 'Perception', survival: 'Survival',
    deception: 'Deception', intimidation: 'Intimidation', performance: 'Performance',
    persuasion: 'Persuasion'
  };

  const rnd = (n) => Math.floor(Math.random() * n) + 1;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const mod = (score) => Math.floor((score - 10) / 2);
  const prof = (c) => c.prof ?? 2;
  const sign = (n) => (n >= 0 ? `+${n}` : `${n}`);

  function rollExpr(expr) {
    const m = String(expr).replace(/\s+/g, '').match(/^(\d*)d(\d+)([+-]\d+)?$/i);
    if (!m) {
      const n = Number(expr) || 0;
      return { total: n, rolls: [n], expr };
    }
    const count = Number(m[1] || 1);
    const sides = Number(m[2]);
    const bonus = Number(m[3] || 0);
    const rolls = [];
    for (let i = 0; i < count; i++) rolls.push(rnd(sides));
    return { total: rolls.reduce((a, b) => a + b, 0) + bonus, rolls, bonus, sides, count, expr };
  }

  function rollD20() { return rnd(20); }

  function abilityMod(c, ability) { return mod(c.abilities?.[ability] ?? 10); }
  function saveMod(c, ability) {
    let m = abilityMod(c, ability);
    if ((c.saves || []).includes(ability)) m += prof(c);
    return m;
  }
  function skillMod(c, skill) {
    const ability = SKILLS[skill] || 'wis';
    let m = abilityMod(c, ability);
    if ((c.skills || []).includes(skill)) m += prof(c);
    return m;
  }
  function skillAbility(skill) { return SKILLS[skill] || 'wis'; }

  function d20Test(c, modifier, dc, opts = {}) {
    let advantage = !!opts.advantage;
    let disadvantage = !!opts.disadvantage;
    if (advantage && disadvantage) { advantage = false; disadvantage = false; }
    const a = rollD20();
    const b = (advantage || disadvantage) ? rollD20() : null;
    let die = a;
    if (advantage) die = Math.max(a, b);
    if (disadvantage) die = Math.min(a, b);
    let extra = 0;
    if (c.bless > 0) extra += rollExpr('1d4').total;
    const total = die + modifier + extra;
    const nat20 = die === 20;
    const nat1 = die === 1;
    const ok = opts.autoSuccess || (nat20 ? true : nat1 ? false : total >= dc);
    return { ok, die, second: b, advantage, disadvantage, modifier, extra, total, dc, nat20, nat1 };
  }

  function check(c, skill, dc, opts = {}) {
    return d20Test(c, skillMod(c, skill), dc, opts);
  }
  function save(c, ability, dc, opts = {}) {
    let disadvantage = !!opts.disadvantage;
    if (hasCond(c, 'restrained') && (ability === 'dex')) disadvantage = true;
    return d20Test(c, saveMod(c, ability), dc, { ...opts, disadvantage });
  }

  function hasCond(c, name) { return (c.conditions || []).some((x) => x.name === name); }
  function addCond(c, name, rounds = 2) {
    if (hasCond(c, name)) {
      const x = c.conditions.find((y) => y.name === name);
      x.rounds = Math.max(x.rounds || 0, rounds);
    } else {
      c.conditions.push({ name, rounds });
    }
  }
  function removeCond(c, name) { c.conditions = (c.conditions || []).filter((x) => x.name !== name); }
  function tickConds(c) {
    if (!c.conditions) return;
    c.conditions = c.conditions.filter((x) => {
      if (x.rounds == null) return true;
      x.rounds -= 1;
      return x.rounds > 0;
    });
  }

  function speedLeft(c) {
    if (hasCond(c, 'restrained')) return 0;
    const base = (c.speed || 30) + (c.dash ? (c.speed || 30) : 0);
    return Math.max(0, base - (c.moved || 0));
  }

  function occupiedSquares(c) {
    const size = c.size || 1;
    const out = [];
    for (let dx = 0; dx < size; dx++) for (let dy = 0; dy < size; dy++) out.push(`${c.x + dx},${c.y + dy}`);
    return out;
  }
  function minDistance(a, b) {
    let best = 99;
    for (const sa of occupiedSquares(a)) {
      const [ax, ay] = sa.split(',').map(Number);
      for (const sb of occupiedSquares(b)) {
        const [bx, by] = sb.split(',').map(Number);
        best = Math.min(best, Math.max(Math.abs(ax - bx), Math.abs(ay - by)));
      }
    }
    return best;
  }
  const distanceFt = (a, b) => minDistance(a, b) * 5;

  function wallSet(combat) { return new Set(combat.walls || []); }
  function blockedSet(combat, mover) {
    const s = wallSet(combat);
    for (const c of combat.combatants) {
      if (c === mover || c.dead) continue;
      if (c.side === 'pc' && mover.side === 'pc') { /* allies block too */ }
      for (const sq of occupiedSquares(c)) s.add(sq);
    }
    return s;
  }

  function reachable(combat, c) {
    const blocked = blockedSet(combat, c);
    const difficult = new Set(combat.difficult || []);
    const max = speedLeft(c);
    const start = `${c.x},${c.y}`;
    const dist = new Map([[start, 0]]);
    const frontier = [start];
    while (frontier.length) {
      const cur = frontier.shift();
      const d = dist.get(cur);
      const [x, y] = cur.split(',').map(Number);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= combat.w || ny >= combat.h) continue;
        const key = `${nx},${ny}`;
        if (blocked.has(key)) continue;
        const cost = difficult.has(key) ? 2 : 1;
        const nd = d + cost;
        if (nd > max) continue;
        if (dist.has(key) && dist.get(key) <= nd) continue;
        dist.set(key, nd);
        frontier.push(key);
      }
    }
    dist.delete(start);
    return dist;
  }

  function lineOfSight(combat, a, b) {
    const walls = wallSet(combat);
    let x0 = a.x, y0 = a.y, x1 = b.x, y1 = b.y;
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let guard = 0;
    while (guard++ < 100) {
      if (!(x0 === a.x && y0 === a.y) && !(x0 === b.x && y0 === b.y) && walls.has(`${x0},${y0}`)) return false;
      if (x0 === x1 && y0 === y1) return true;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
    return true;
  }

  function coverBonus(combat, target) {
    return (combat.cover || []).includes(`${target.x},${target.y}`) ? 2 : 0;
  }

  function effectiveAC(combat, target, attack) {
    let ac = target.ac;
    if (attack && attack.range > 5 && coverBonus(combat, target)) ac += 2;
    if (hasCond(target, 'dodging')) { /* handled as disadvantage */ }
    return ac;
  }

  function attackRoll(combat, attacker, target, attack, opts = {}) {
    let advantage = !!opts.advantage;
    let disadvantage = !!opts.disadvantage;
    if (attacker.hidden) advantage = true;
    if (combat.surprise && combat.round === 1 && attacker.side === 'pc') advantage = true;
    if (target.distracted && !target.distractionUsed) { advantage = true; target.distractionUsed = true; combat.push(`${target.name} is still talking — the attack has advantage.`, 'sys'); }
    if (hasCond(target, 'restrained')) advantage = true;
    if (target.dodging) disadvantage = true;
    if (target.guiding) advantage = true;
    if (target.helped) advantage = true;
    if (attack.range > 5 && minDistance(attacker, target) <= 1) disadvantage = true;
    if (attacker.traits && attacker.traits.includes('Pack Tactics')) {
      const allyAdjacent = combat.combatants.some((x) => x.side === attacker.side && !x.dead && x !== attacker && minDistance(x, target) <= 1);
      if (allyAdjacent) advantage = true;
    }
    if (attack.range > 5 && !lineOfSight(combat, attacker, target)) {
      combat.push(`${attacker.name} has no clear line of sight to ${target.name}.`, 'sys');
      return { ok: false, blocked: true };
    }
    if (attack.range > 5 && distanceFt(attacker, target) > attack.range) {
      combat.push(`${target.name} is out of range.`, 'sys');
      return { ok: false, outOfRange: true };
    }
    const test = d20Test(attacker, abilityMod(attacker, attack.ability) + prof(attacker), effectiveAC(combat, target, attack), { advantage, disadvantage });
    const ac = effectiveAC(combat, target, attack);
    const crit = test.die >= 20 || (attacker.critRange && test.die >= attacker.critRange);
    const hit = test.nat1 ? false : (crit ? true : test.total >= ac);
    if (attacker.hidden) attacker.hidden = false;
    if (target.guiding) target.guiding = false;
    if (target.helped) target.helped = false;
    if (!hit) {
      combat.push(`${attacker.name} attacks ${target.name}: ${test.total} vs AC ${ac} — miss.`, '');
      return { ok: false, test, ac };
    }
    const dmg = rollExpr(attack.damage);
    let diceTotal = dmg.total;
    if (crit) {
      const again = rollExpr(attack.damage);
      diceTotal = dmg.total + again.total - (dmg.bonus || 0) - (again.bonus || 0) + (dmg.bonus || 0);
    }
    let damage = diceTotal;
    if (attacker.sneak && opts.sneakEligible) {
      const sneak = rollExpr(attacker.sneak);
      damage += sneak.total;
      combat.push(`Sneak Attack adds ${sneak.total}.`, 'hit');
    }
    if (attacker.traits && attacker.traits.includes('Martial Advantage') && !attacker.usedMartial) {
      const allyAdjacent = combat.combatants.some((x) => x.side === attacker.side && !x.dead && x !== attacker && minDistance(x, target) <= 1);
      if (allyAdjacent) { const extra = rollExpr('2d6').total; damage += extra; attacker.usedMartial = true; combat.push(`Martial Advantage adds ${extra}.`, 'hit'); }
    }
    const dealt = applyDamage(combat, target, damage, attack.type, { crit, source: attacker });
    combat.push(`${attacker.name} hits ${target.name} (${test.total} vs AC ${ac}) for ${dealt} ${attack.type} damage${crit ? ' — critical!' : '.'}`, 'hit');
    return { ok: true, test, ac, damage: dealt, crit };
  }

  function applyDamage(combat, target, amount, type, opts = {}) {
    if (!target || target.dead) return 0;
    let dmg = Math.max(0, Math.round(amount));
    if ((target.immune || []).includes(type)) {
      combat.push(`${target.name} is immune to ${type} damage.`, 'sys');
      return 0;
    }
    if ((target.resist || []).includes(type)) dmg = Math.floor(dmg / 2);
    if ((target.vuln || []).includes(type)) dmg *= 2;
    if (target.tempHp > 0) {
      const absorbed = Math.min(target.tempHp, dmg);
      target.tempHp -= absorbed; dmg -= absorbed;
    }
    target.hp = Math.max(0, target.hp - dmg);
    target.lastHit = { amount: dmg, type, crit: !!opts.crit };
    if (target.hp <= 0) {
      if (target.side === 'pc') {
        if (!target.down) {
          target.down = true; target.stable = false; target.deathSaves = { s: 0, f: 0 };
          target.conditions = (target.conditions || []).filter((x) => x.name !== 'restrained');
          combat.push(`${target.name} falls unconscious and is dying.`, 'hit');
        } else if (!target.stable) {
          target.deathSaves.f += opts.crit ? 2 : 1;
          combat.push(`${target.name} fails a death save (${target.deathSaves.f}/3).`, 'hit');
        }
      } else {
        target.dead = true; target.hp = 0;
        combat.push(`${target.name} is defeated.`, 'hit');
      }
    }
    return dmg;
  }

  function heal(combat, target, amount) {
    if (!target || target.dead) return 0;
    const before = target.hp;
    target.hp = Math.min(target.maxHp, target.hp + amount);
    if (target.down && target.hp > 0) {
      target.down = false; target.stable = false; target.deathSaves = { s: 0, f: 0 };
      combat.push(`${target.name} regains consciousness.`, 'heal');
    }
    const gained = target.hp - before;
    if (gained > 0) combat.push(`${target.name} regains ${gained} HP (${target.hp}/${target.maxHp}).`, 'heal');
    return gained;
  }

  function deathSave(combat, pc) {
    const r = rollD20();
    if (r === 20) {
      pc.down = false; pc.stable = false; pc.hp = 1; pc.deathSaves = { s: 0, f: 0 };
      combat.push(`${pc.name} rolls a natural 20 and comes back with 1 HP!`, 'heal');
      return { text: `Natural 20 — ${pc.name} regains 1 HP.`, die: 20, revive: true };
    }
    if (r >= 10) {
      pc.deathSaves.s++;
      combat.push(`${pc.name} succeeds on a death save (${pc.deathSaves.s}/3).`, '');
      if (pc.deathSaves.s >= 3) { pc.stable = true; combat.push(`${pc.name} is stable but unconscious.`, 'sys'); }
      return { text: `Success (${r}) — ${pc.name} is ${pc.stable ? 'stable' : 'still dying'}.`, die: r };
    }
    pc.deathSaves.f++;
    combat.push(`${pc.name} fails a death save (${pc.deathSaves.f}/3).`, 'hit');
    if (pc.deathSaves.f >= 3) { pc.dead = true; pc.down = true; pc.stable = false; combat.push(`${pc.name} dies.`, 'hit'); }
    return { text: `Failure (${r}) — ${pc.name} has ${pc.deathSaves.f}/3 failures.`, die: r };
  }

  function buildCombat(encounter, party, flags = {}) {
    const combat = {
      id: encounter.id, name: encounter.name,
      w: encounter.grid.w, h: encounter.grid.h,
      walls: encounter.walls || [], difficult: encounter.difficult || [], cover: encounter.cover || [],
      props: encounter.props || [], objective: encounter.objective,
      combatants: [], order: [], round: 1, turnIndex: 0, status: 'active',
      log: [], lastHit: null, surprise: !!flags.surpriseRats, victory: encounter.victory, encounter,
      push(text, cls = '') { this.log.push({ text, cls }); if (this.log.length > 120) this.log.shift(); }
    };
    party.forEach((pc, i) => {
      const pos = encounter.start[i] || [1, 1 + i];
      pc.side = 'pc'; pc.x = pos[0]; pc.y = pos[1];
      pc.moved = 0; pc.actionUsed = false; pc.bonusUsed = false; pc.dash = false;
      pc.dodging = false; pc.hidden = false; pc.helped = false; pc.usedMartial = false; pc.bless = 0; pc.burning = 0; pc.guiding = false; pc.actionSurged = false;
      pc.deathSaves = pc.deathSaves || { s: 0, f: 0 };
      pc.down = pc.hp <= 0; pc.dead = pc.dead || false;
      pc.hitDiceLeft = pc.hitDiceLeft ?? pc.level;
      pc.conditions = [];
      combat.combatants.push(pc);
    });
    encounter.enemies.forEach((e) => {
      const base = SCENARIO.monsters[e.key];
      const mon = JSON.parse(JSON.stringify(base));
      mon.id = `${e.key}-${e.name}-${e.x}-${e.y}`;
      mon.side = 'enemy'; mon.name = e.name || base.name;
      mon.x = e.x; mon.y = e.y; mon.size = e.size || base.size || 1;
      mon.maxHp = base.hp; mon.hp = base.hp; mon.tempHp = 0;
      mon.conditions = []; mon.moved = 0; mon.actionUsed = false; mon.bonusUsed = false;
      mon.dash = false; mon.dodging = false; mon.hidden = false; mon.helped = false;
      mon.dead = false; mon.down = false; mon.side = 'enemy'; mon.prof = 2;
      mon.traits = base.traits || []; mon.resist = base.resist || []; mon.vuln = base.vuln || []; mon.immune = base.immune || [];
      mon.spells = (base.spells || []).map((s) => ({ ...s, used: 0 }));
      if (e.key === 'corvin' && flags.corvinDistracted) mon.distracted = true;
      combat.combatants.push(mon);
    });
    combat.combatants.forEach((c) => { c.initiative = rollD20() + abilityMod(c, 'dex'); });
    combat.order = [...combat.combatants].sort((a, b) => (b.initiative - a.initiative) || (abilityMod(b, 'dex') - abilityMod(a, 'dex'))).map((c) => c.id);
    combat.byId = Object.fromEntries(combat.combatants.map((c) => [c.id, c]));
    combat.push(`Initiative: ${combat.order.map((id) => combat.byId[id].name).join(' → ')}.`, 'sys');
    beginTurn(combat);
    return combat;
  }

  function current(combat) { return combat.byId[combat.order[combat.turnIndex]]; }

  function beginTurn(combat) {
    if (combat.status !== 'active') return null;
    let guard = 0;
    while (guard++ < 50) {
      const c = current(combat);
      if (!c) return null;
      if (c.dead) { advance(combat); continue; }
      tickConds(c);
      c.moved = 0; c.actionUsed = false; c.bonusUsed = false; c.dash = false;
      c.dodging = false; c.usedMartial = false;
      if (c.bless > 0) c.bless -= 1;
      if (c.burning > 0) { const burn = rollExpr('1d4').total; applyDamage(combat, c, burn, 'fire', { source: null }); combat.push(`${c.name} burns for ${burn} fire damage.`, 'hit'); c.burning -= 1; }
      c.turnStarted = true;
      if (c.side === 'pc') {
        if (c.down) {
          if (c.stable) {
            combat.push(`${c.name} is stable and unconscious.`, 'sys');
            advance(combat); continue;
          }
          combat.awaitingDeathSave = c.id;
          combat.push(`It is ${c.name}'s turn. Roll a death save.`, 'sys');
          return c;
        }
        combat.push(`It is ${c.name}'s turn.`, 'sys');
        return c;
      }
      return c;
    }
    return null;
  }

  function advance(combat) {
    combat.turnIndex++;
    if (combat.turnIndex >= combat.order.length) {
      combat.turnIndex = 0;
      combat.round++;
      combat.combatants.forEach((c) => { c.usedMartial = false; });
      combat.push(`— Round ${combat.round} —`, 'sys');
    }
    const c = current(combat);
    if (c && c.dead && combat.combatants.every((x) => x.dead || (x.side === 'pc' && x.down))) {
      checkVictory(combat);
    }
  }

  function endTurn(combat) {
    if (combat.status !== 'active') return;
    combat.awaitingDeathSave = null;
    advance(combat);
    if (checkVictory(combat)) return;
    beginTurn(combat);
  }

  function checkVictory(combat) {
    if (combat.status !== 'active') return false;
    const pcs = combat.combatants.filter((c) => c.side === 'pc');
    if (pcs.every((c) => c.dead || c.down)) {
      combat.status = 'defeat';
      combat.push('The party falls. The dark closes over you.', 'sys');
      return true;
    }
    if (combat.objective === 'tree') {
      const tree = combat.combatants.find((c) => c.key === 'blackroot');
      if (tree && tree.dead) {
        combat.combatants.forEach((c) => {
          if (c.side !== 'enemy') return;
          if (c.key === 'thrallTalen' || c.key === 'thrallShara') { c.down = true; c.dead = false; c.freed = true; }
          else if (c.key === 'twigBlight') { c.dead = true; c.down = true; }
          else if (c.key === 'corvin') { c.dead = true; c.down = true; }
        });
        combat.push('The Blackroot dies. Its thralls fall free, and the briars go still.', 'heal');
        combat.status = 'victory';
        return true;
      }
      return false;
    }
    const enemies = combat.combatants.filter((c) => c.side === 'enemy');
    if (enemies.every((c) => c.dead)) {
      combat.status = 'victory';
      combat.push('The last enemy falls. The fight is over.', 'heal');
      return true;
    }
    return false;
  }

  function canAct(combat, c) {
    return combat.status === 'active' && current(combat) === c && !c.down && !c.dead;
  }

  function move(combat, c, x, y) {
    if (!canAct(combat, c)) return { ok: false, reason: 'not your turn' };
    if (hasCond(c, 'restrained')) return { ok: false, reason: 'restrained' };
    const reach = reachable(combat, c);
    const key = `${x},${y}`;
    if (!reach.has(key)) return { ok: false, reason: 'out of reach' };
    const cost = reach.get(key);
    c.x = x; c.y = y; c.moved += cost;
    combat.push(`${c.name} moves ${cost * 5} ft.`, '');
    return { ok: true, cost };
  }

  function actionAttack(combat, attacker, target, attack, opts = {}) {
    if (!canAct(combat, attacker)) return { ok: false, reason: 'not your turn' };
    if (attacker.actionUsed) return { ok: false, reason: 'action already used' };
    const reach = attack.range > 5 ? null : minDistance(attacker, target);
    if (attack.range <= 5 && reach > 1) return { ok: false, reason: 'out of melee reach' };
    let sneakEligible = false;
    if (attacker.sneak) {
      sneakEligible = !!attacker.hidden || combat.combatants.some((a) => a.side === attacker.side && !a.dead && a !== attacker && minDistance(a, target) <= 1);
    }
    const res = attackRoll(combat, attacker, target, attack, { ...opts, sneakEligible });
    if (!res.blocked && !res.outOfRange) attacker.actionUsed = true;
    checkVictory(combat);
    return res;
  }

  function actionSpell(combat, caster, spell, target, opts = {}) {
    if (!canAct(combat, caster)) return { ok: false, reason: 'not your turn' };
    const cost = spell.cost || 'action';
    if (cost === 'action' && caster.actionUsed) return { ok: false, reason: 'action already used' };
    if (cost === 'bonus' && caster.bonusUsed) return { ok: false, reason: 'bonus action already used' };
    if (spell.level > 0) {
      const slot = caster.slots?.[spell.level];
      if (!slot || slot.used >= slot.max) return { ok: false, reason: 'no spell slot left' };
      slot.used++;
    }
    const res = { ok: true, log: [] };
    if (spell.kind === 'heal') {
      heal(combat, target, rollExpr(spell.heal).total);
    } else if (spell.kind === 'buff') {
      const allies = combat.combatants.filter((x) => x.side === caster.side && !x.dead && !x.down && minDistance(caster, x) <= (spell.range / 5));
      allies.forEach((a) => { a.bless = Math.max(a.bless || 0, spell.rounds || 3); });
      combat.push(`${caster.name} casts ${spell.name}. ${allies.length} ${allies.length === 1 ? 'ally gains' : 'allies gain'} +1d4 to attacks and saves.`, 'heal');
    } else if (spell.kind === 'auto') {
      const dmg = rollExpr(spell.damage).total;
      const dealt = applyDamage(combat, target, dmg, spell.type, { source: caster });
      combat.push(`${caster.name} casts ${spell.name}. ${target.name} takes ${dealt} ${spell.type} damage.`, 'hit');
    } else if (spell.kind === 'save') {
      let targets = [target];
      if (spell.aoe) {
        targets = combat.combatants.filter((x) => x.side !== caster.side && !x.dead && distanceFt(caster, x) <= (spell.range || 15));
      }
      for (const t of targets) {
        const s = save(t, spell.saveAbility || 'dex', spell.dc || 13);
        const dmg = rollExpr(spell.damage || '1d6').total;
        const amount = s.ok && spell.half ? Math.floor(dmg / 2) : s.ok ? 0 : dmg;
        if (amount > 0) applyDamage(combat, t, amount, spell.type, { source: caster });
        combat.push(`${t.name} ${s.ok ? 'saves' : 'fails'} against ${spell.name}${amount > 0 ? ` and takes ${amount} ${spell.type} damage` : ' and takes no damage'}.`, s.ok ? '' : 'hit');
        if (!s.ok && spell.condition) addCond(t, spell.condition, spell.rounds || 2);
        if (spell.guiding && !s.ok) t.guiding = true;
      }
    } else if (spell.kind === 'attack') {
      const atk = { ability: spell.ability || 'int', damage: spell.damage, type: spell.type, range: spell.range || 60, proficient: true };
      const r = attackRoll(combat, caster, target, atk, opts);
      res.attack = r;
      if (r.ok && spell.guiding) target.guiding = true;
    }
    if (cost === 'action') caster.actionUsed = true; else caster.bonusUsed = true;
    checkVictory(combat);
    return res;
  }

  function useFeature(combat, c, feature, target, opts = {}) {
    if (!canAct(combat, c)) return { ok: false, reason: 'not your turn' };
    if (feature.cost === 'bonus' && c.bonusUsed) return { ok: false, reason: 'bonus action already used' };
    if (feature.cost === 'free' && c.actionSurged) return { ok: false, reason: 'already used' };
    if (feature.uses != null && feature.uses <= 0 && feature.reset !== 'turn') return { ok: false, reason: 'no uses left' };
    if (feature.kind === 'heal-self') {
      heal(combat, c, rollExpr(feature.heal).total);
    } else if (feature.kind === 'extra-action') {
      c.actionUsed = false; c.actionSurged = true;
      combat.push(`${c.name} uses Action Surge. One more action this turn.`, 'heal');
    } else if (feature.kind === 'cunning') {
      // app calls with opts.mode
      if (opts.mode === 'dash') { c.dash = true; combat.push(`${c.name} dashes as a bonus action.`, ''); }
      if (opts.mode === 'disengage') { c.disengaged = true; combat.push(`${c.name} disengages as a bonus action.`, ''); }
      if (opts.mode === 'hide') { const s = check(c, 'stealth', 12); if (s.ok) { c.hidden = true; combat.push(`${c.name} hides as a bonus action.`, ''); } else combat.push(`${c.name} fails to hide.`, ''); }
    } else if (feature.kind === 'channel-heal') {
      const allies = combat.combatants.filter((x) => x.side === c.side && !x.dead && !x.down);
      let pool = feature.heal || 15;
      combat.push(`${c.name} channels Preserve Life (${pool} HP to divide).`, 'heal');
      while (pool > 0) {
        const hurt = allies.filter((a) => a.hp < a.maxHp).sort((a, b) => (a.maxHp - a.hp) - (b.maxHp - b.hp))[0];
        if (!hurt) break;
        const amount = Math.min(pool, hurt.maxHp - hurt.hp);
        heal(combat, hurt, amount); pool -= amount;
      }
    }
    feature.uses = Math.max(0, (feature.uses ?? 1) - 1);
    if (feature.cost === 'bonus') c.bonusUsed = true;
    if (feature.cost === 'action') c.actionUsed = true;
    checkVictory(combat);
    return { ok: true };
  }

  function usePotion(combat, c, target) {
    if (!canAct(combat, c)) return { ok: false };
    if (c.actionUsed) return { ok: false, reason: 'action already used' };
    heal(combat, target, rollExpr('2d4+2').total);
    c.actionUsed = true; c.bonusUsed = c.bonusUsed;
    return { ok: true };
  }

  function throwAlchemistsFire(combat, c, target) {
    if (!canAct(combat, c)) return { ok: false };
    if (c.actionUsed) return { ok: false, reason: 'action already used' };
    const atk = { ability: 'dex', damage: '1d4', type: 'fire', range: 20, proficient: true };
    const r = attackRoll(combat, c, target, atk, {});
    if (r.ok && !target.dead) target.burning = 2;
    c.actionUsed = true;
    checkVictory(combat);
    return r;
  }

  function moveToward(combat, c, target, preferRange = 1) {
    if (hasCond(c, 'restrained') || speedLeft(c) <= 0) return;
    const reach = reachable(combat, c);
    let best = null, bestScore = Infinity;
    for (const [key, cost] of reach) {
      const [x, y] = key.split(',').map(Number);
      const d = minDistance({ x, y, size: c.size || 1 }, target);
      const score = Math.abs(d - preferRange) * 10 + cost * 0.1;
      if (score < bestScore) { bestScore = score; best = { x, y, cost, d }; }
    }
    if (best && best.d < minDistance(c, target)) {
      c.x = best.x; c.y = best.y; c.moved += best.cost;
      combat.push(`${c.name} moves.`, '');
    }
  }

  function enemyTurn(combat, c) {
    if (combat.status !== 'active' || c.dead || c.down) { endTurn(combat); return; }
    const pcs = combat.combatants.filter((x) => x.side === 'pc' && !x.dead && !x.down);
    if (!pcs.length) { checkVictory(combat); return; }
    const nearest = pcs.sort((a, b) => minDistance(c, a) - minDistance(c, b))[0];

    if (c.ai === 'tree') {
      combat.push(`${c.name} waits. The roots tighten around the grove.`, 'sys');
      checkVictory(combat); if (combat.status === 'active') endTurn(combat); return;
    }

    if (c.ai === 'druid') {
      const wounded = combat.combatants.filter((x) => x.side === c.side && !x.dead && x.hp < x.maxHp * 0.5).sort((a, b) => a.hp - b.hp)[0];
      const cure = c.spells && c.spells.find((s) => s.name === 'Cure Wounds' && s.used < (s.uses || 2));
      if (wounded && cure && minDistance(c, wounded) <= 1) {
        cure.used++; heal(combat, wounded, rollExpr(cure.heal).total);
        combat.push(`${c.name} casts Cure Wounds on ${wounded.name}.`, 'heal');
        endTurn(combat); return;
      }
      const entangle = c.spells && c.spells.find((s) => s.name === 'Entangle' && !s.used);
      if (entangle && !hasCond(nearest, 'restrained') && distanceFt(c, nearest) <= 60) {
        entangle.used = true;
        const s = save(nearest, 'str', 13);
        if (s.ok) combat.push(`${nearest.name} resists ${c.name}'s Entangle.`, '');
        else { addCond(nearest, 'restrained', 2); combat.push(`${nearest.name} is restrained by roots!`, 'hit'); }
        endTurn(combat); return;
      }
      if (distanceFt(c, nearest) > 30) moveToward(combat, c, nearest, 4);
      if (distanceFt(c, nearest) <= 30 && lineOfSight(combat, c, nearest)) {
        const atk = c.attacks.find((a) => a.name === 'Thorn Whip') || c.attacks[0];
        attackRoll(combat, c, nearest, atk, {});
      } else if (minDistance(c, nearest) <= 1) {
        attackRoll(combat, c, nearest, c.attacks[0], {});
      }
      checkVictory(combat); if (combat.status === 'active') endTurn(combat); return;
    }

    if (c.spells && c.spells.length) {
      const mm = c.spells.find((s) => s.name === 'Magic Missile' && s.used < (s.uses || 2));
      if (mm && distanceFt(c, nearest) <= 60) {
        mm.used++;
        const dmg = rollExpr(mm.damage).total;
        applyDamage(combat, nearest, dmg, mm.type, { source: c });
        combat.push(`${c.name} casts Magic Missile at ${nearest.name} for ${dmg} force damage.`, 'hit');
        checkVictory(combat); if (combat.status === 'active') endTurn(combat); return;
      }
    }

    const ranged = c.attacks.find((a) => a.range > 5);
    const melee = c.attacks.find((a) => a.range <= 5) || c.attacks[0];
    if (ranged && distanceFt(c, nearest) > 5 && distanceFt(c, nearest) <= ranged.range && lineOfSight(combat, c, nearest)) {
      attackRoll(combat, c, nearest, ranged, {});
    } else {
      if (minDistance(c, nearest) > 1) moveToward(combat, c, nearest, 1);
      if (minDistance(c, nearest) <= 1) attackRoll(combat, c, nearest, melee, {});
      else if (ranged && distanceFt(c, nearest) <= ranged.range && lineOfSight(combat, c, nearest)) attackRoll(combat, c, nearest, ranged, {});
    }
    checkVictory(combat);
    if (combat.status === 'active') endTurn(combat);
  }

  function shortRest(party, log = []) {
    party.forEach((pc) => {
      if (pc.dead) return;
      pc.conditions = [];
      pc.down = false; pc.stable = false; pc.deathSaves = { s: 0, f: 0 };
      if (pc.hp <= 0) pc.hp = 1;
      if (pc.hp < pc.maxHp && (pc.hitDiceLeft ?? pc.level) > 0) {
        const die = rollExpr(`1d${pc.hitDie}`).total + abilityMod(pc, 'con');
        const before = pc.hp;
        pc.hp = Math.min(pc.maxHp, pc.hp + Math.max(1, die));
        pc.hitDiceLeft = (pc.hitDiceLeft ?? pc.level) - 1;
        log.push(`${pc.name} spends a Hit Die and recovers ${pc.hp - before} HP.`);
      }
      (pc.features || []).forEach((f) => { if (f.reset === 'short') f.uses = f.usesMax ?? 1; });
      if (pc.class === 'Wizard') {
        const s1 = pc.slots?.[1]; if (s1) s1.used = Math.max(0, s1.used - 2);
        log.push(`${pc.name} uses Arcane Recovery to recover spell slots.`);
      }
      if (pc.class === 'Cleric' && pc.features.find((f) => f.id === 'channel-divinity')) {
        pc.features.find((f) => f.id === 'channel-divinity').uses = 1;
      }
    });
    return log;
  }

  return {
    ABILITIES, SKILLS, SKILL_LABEL, mod, prof, sign, rollExpr, rollD20,
    abilityMod, saveMod, skillMod, skillAbility,
    check, save, d20Test,
    hasCond, addCond, removeCond, tickConds,
    minDistance, distanceFt, reachable, speedLeft, lineOfSight, effectiveAC,
    buildCombat, current, beginTurn, endTurn, canAct, move,
    actionAttack, actionSpell, useFeature, usePotion, throwAlchemistsFire,
    applyDamage, heal, deathSave, checkVictory, enemyTurn, shortRest,
    occupiedSquares, blockedSet
  };
})();

window.Rules = Rules;
