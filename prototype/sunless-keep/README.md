# The Sunless Keep

A complete, playable **D&D 5e adventure prototype**: one short scenario, from the first conversation in the village to the last choice after the final battle. It is built as a real adventure framework — exploration, social encounters and grid combat all use 5e procedures — with a **DM dialogue mode**, a full Chinese layer, and pre-generated neural read-aloud.

> **Play online:** <https://chehua11agent.github.io/superagent-test/prototype/sunless-keep/>
>
> **Run locally:** open `index.html` directly, or serve the folder:
> `python3 -m http.server 4193` then <http://127.0.0.1:4193/>.
> No build step, no external assets, no network requests.

This is an adaptation of the first adventure in the 5e anthology the requester supplied — a sunken citadel, two warring dungeon tribes, a missing brother and sister, an outcast druid, and a tree that eats people. All prose, names and dialogue here are **original**; the scenario structure and the open 5e numbers are used, not the book text.

---

## What is in the box

| | |
| --- | --- |
| **One full scenario** | village → ravine → citadel gate → kobold court → goblin gate → twilight grove → coda → one of four endings |
| **Three player characters** | choose any 3 of 4 level-3 pregens (fighter, rogue, wizard, cleric); you control the whole party |
| **Three pillars** | exploration (checks, terrain, light pressure), social (insight / persuasion / intimidation / stealth), combat (initiative, grid, spells) |
| **DM dialogue mode** | default view: the DM narrates in chat bubbles, you answer with choices, dice results come back as DM replies; switch to the document view any time |
| **Neural read-aloud** | 71 pre-generated Edge Neural clips in the DM's voice (Ryan), bundled and offline; per-line play buttons; browser voice as fallback |
| **Rules** | d20 checks and saves, advantage/disadvantage, AC and cover, critical hits, damage types, conditions, death saves, short rests, spell slots |
| **Learning layer** | 47 highlighted CET-4 words with Chinese + example; **full Chinese UI** on by default (scene text, choices, combat controls, sheets, logs, endings); top-bar `中文` or inline `中文对照` switches back to English; word drawer |
| **Save** | automatic `localStorage` save between scenes; Continue from the title |
| **Responsive** | desktop and phone; zoom controls and names on the token bases in combat |

### DM mode

On first load the scenario is a **conversation, not a page**:

- The DM appears in a chat column and narrates each scene in order, one beat at a time, with English above and Chinese below.
- Your options sit at the bottom as player choices; when a choice needs a roll you pick who tries it, the dice open, and the result is appended as a DM reply (success/failure, consequence, loot, clue).
- Every DM line has a ▶ button that plays the bundled neural clip; the voice picker switches between **Ryan** (Edge neural, offline) and the browser's own voice.
- `DM 对话` in the top bar toggles the conversation view; `文字阅读` returns to the original document layout with the same state.
- Combat still uses the tactical board; after the fight the DM returns with a short aftermath conversation, then the next scene.

## The flow

1. **Oakvale, the Oak & Owl** — take the rescue job from Lady Vane. Four optional approaches; each changes what you know or carry.
2. **The ravine** — study the ledge, move quietly, climb down. The first fight is two giant rats.
3. **The citadel gate** — talk, threaten, sneak or fight three kobolds. Talking opens the kobold court; fighting skips it and costs you allies.
4. **Queen Sesh's court** — ask about the twins, ask about the tree, promise to find her dragon, or refuse. The key and the alchemist's fire change the last act.
5. **The goblin gate** — a hobgoblin chief wears Talen's signet ring. Intimidation or stealth changes the enemy line-up. After the fight, Erin the gnome tells you what waits below.
6. **The Twilight Grove** — Corvin the Outcast, two bark-skinned thralls, two twig blights and the Blackroot. Talk first: fire is the tree's weakness, and destroying the tree frees the thralls.
7. **The coda** — the red fruit is warm in your pack. Give it to the Vanes, keep it, or burn it. The choice selects one of four endings.

A full run is about **20–35 minutes**; combat can end a run early, and the defeat screen retries the last fight with the party restored.

---

## How the 5e rules are used

| Rule | Implementation |
| --- | --- |
| Ability checks | `d20 + ability modifier (+ proficiency)` vs a DC; group checks pass when at least half the party succeeds |
| Saving throws | `d20 + save modifier`; restrained gives disadvantage on DEX saves |
| Advantage / disadvantage | roll two d20 and keep the higher/lower; the two cancel; granted by surprise, stealth, restrained targets, dodging, pack tactics, guiding bolt, help |
| Attacks | `d20 + ability + proficiency` vs AC; natural 1 misses, natural 20 crits; champion fighter crits on 19–20; critical hits double damage dice |
| Damage | bludgeoning / piercing / slashing / fire / cold / radiant / force / poison; resistance halves, vulnerability doubles, immunity negates |
| Cover and range | cover tiles give +2 AC against ranged attacks; ranged attacks in melee have disadvantage; range and line of sight are checked |
| Initiative | `d20 + DEX`; individual turns in order, round counter |
| Movement | 5-ft grid; 30 ft (6 squares) per turn, 25 ft for the dwarf; difficult terrain costs 2 squares; Dash doubles movement |
| Actions | Attack, Cast a Spell, Dash, Dodge, Disengage, Hide, Help, Use an Item; bonus actions for Second Wind, Cunning Action, Healing Word and some features |
| Conditions | restrained, dodging, hidden, dying, stable, burning, blessed; durations tick at the start of a turn |
| Death | at 0 HP a character is dying and rolls death saves (10+ succeeds, 3 successes stabilise, 3 failures die); healing revives |
| Spells | fire bolt, ray of frost, magic missile, burning hands, sacred flame, guiding bolt, cure wounds, healing word, bless; slots are tracked per character |
| Class features | Second Wind, Action Surge, Cunning Action, Arcane Recovery (short rest), Preserve Life |
| Rest | after a fight a short rest spends one Hit Die per character, resets short-rest features, and recovers two levels of wizard slots |
| XP | awarded per defeated creature and per victory; pregens are level 3 and this vertical slice does not include level-up |

## English-learning layer

Chinese is **on by default across the whole interface**: scene titles, read-aloud and result cards, choice labels, objectives, combat controls, character sheets, item/spell/feature names, damage types, combat logs, aftermath, endings and stats. The English prose stays above its Chinese paragraph so the original is still there to learn from. The top-bar `中文 ✓` button and the inline `中文对照` button switch the whole interface back to English; the setting is saved.

Every highlighted word opens a Chinese meaning and an example; the Words drawer lists all 47. Read-aloud uses pre-generated **Edge Neural** audio (Ryan) where available; the browser's SpeechSynthesis is the fallback for lines outside the 71 bundled clips. The clips were generated once for this prototype with Microsoft Edge Neural TTS; no API key or network call is used at runtime. Ending paragraphs also have a ▶ button.

### Deliberate simplifications

This is a **prototype of one scenario**, not a complete 5e implementation. The following are intentionally out of scope:

- no opportunity attacks or reactions (including *shield*);
- no concentration checks, grapple/shove, or equipment encumbrance;
- cover is a flat +2 AC on marked tiles, not directional;
- the Blackroot is an **objective**, not a soldier: it has no attack, and destroying it frees the thralls and ends the fight;
- a party of **three level-3 characters** instead of the original adventure's four level-1 characters levelling to 3; monster numbers are the open 5e numbers, not rebalanced except where the reduced party size made an encounter unwinnable;
- no long rest, no travel/light/ration simulation, no magic item economy;
- English read-aloud uses the browser's SpeechSynthesis; nothing is uploaded.

---

## How to modify it

The content is deliberately separate from the engine.

```text
prototype/sunless-keep/
  index.html      UI shell and CSS
  scenario.js     ALL content: pregens, monsters, scenes, encounters, endings, glossary
  i18n.js         Chinese UI/scene/combat/ending strings and log templates
  audio/          pre-generated Edge Neural clips + manifest.json (Ryan voice)
  rules.js        5e rules engine (pure functions + combat state)
  app.js          screens, checks, combat UI, save/load
  README.md
  screenshots/    before/after captures
```

### Add or change a scene

Every scene is in `SCENES` in `scenario.js`:

```js
myScene: {
  id: 'myScene', type: 'story', art: 'gate',
  kicker: 'The keep · somewhere new',
  title: 'A new room',
  read: [{ en: 'Read-aloud text here.', zh: '中文提示。' }],
  objectives: ['Find the thing'],
  interactions: [
    { id: 'look', kind: 'check', label: 'Look closer', hint: 'Investigation · DC 12',
      skill: 'investigation', ability: 'int', dc: 12,
      success: { en: 'You find it.', zh: '你找到了。', clue: 'A new clue.' },
      fail: { en: 'You find nothing.', zh: '你什么也没找到。' } }
  ],
  next: { label: 'Go on', scene: 'nextScene' }
}
```

- `kind: 'check'` → pick a character, roll, apply `success`/`fail`.
- `kind: 'action'` → always resolves; use `result`.
- `outcome.combat: 'encounterId'` starts a fight after the result.
- `outcome.next: 'sceneId'` adds a Continue button.
- `outcome.ending: 'good'` opens an ending.
- Side effects: `clue`, `flag`, `item`, `items`, `gold`, `xp`, `damage`, `heal`.

### Add a fight

Encounters live in `ENCOUNTERS`. `grid` is in 5-ft squares; `x` grows east, `y` grows south.

```js
myFight: {
  id: 'myFight', name: 'The New Room', subtitle: 'Two goblins',
  grid: { w: 10, h: 8 },
  start: [[1,2],[1,3],[1,4]],
  difficult: ['4,3'], cover: ['6,4'], walls: [],
  props: [{ type: 'barricade', x: 6, y: 4 }],
  enemies: [{ key: 'goblin', name: 'Goblin A', x: 8, y: 3 }],
  objective: 'defeatAll', // or 'tree'
  victory: { title: 'Clear', read: [{ en: '...', zh: '...' }], next: 'nextScene', items: ['Potion of Healing'], rest: true }
}
```

Monster stat blocks are in `MONSTERS`; pregens in `PREGENS`; endings in `ENDINGS`; vocabulary in `GLOSSARY`. The glossary highlights base forms and common inflections anywhere in prose — add a word and it appears automatically.

### Tuning

- Encounter difficulty: change enemy counts in `ENCOUNTERS.<id>.enemies`, or HP/AC in `MONSTERS`.
- Party power: edit `PREGENS` (level 3 stats, HP, slots, features).
- Learning load: add/remove `GLOSSARY` entries; the drawer and highlighting follow automatically.
- Visuals: scene art is programmatic SVG in `app.js` (`artVillage`, `artRavine`, …); tokens are drawn in `tokenSvg`.

---

## Verification

The prototype was exercised in headless Chromium (Playwright) during development:

- **Full flow** with Bram / Sable / Ilya: village checks → ravine → rats → kobold parley → queen → goblin gate → grove → boss → coda → ending; **zero console errors**.
- **Boss fight** with a full-health party (Bram / Orsa / Ilya): the Blackroot destroyed, thralls freed, aftermath and coda reached.
- **Spells and features**: magic missile, guiding bolt, burning hands, cure wounds, second wind, action surge, cunning action, preserve life; spell slots and short-rest recovery checked.
- **Death saves**: dying character rolls, stabilises or dies, turn advances correctly.
- **Save/continue**: localStorage round trip between scenes.
- **DM mode**, Bram / Orsa / Ilya: DM bubbles → choice → player bubble → DM result; `DM 对话`/`文字阅读` toggle round trip; combat → DM aftermath → next scene; 0 console errors.
- **Neural audio**: manifest loads, first DM line plays `audio/ryan/<hash>.mp3` (HTTP 200/206), voice picker lists Ryan and browser fallback, page-mode Read aloud plays the paragraph sequence.
- **Mobile 390×844**: DM chat, check modal, combat map, action bar, Chinese toggle and word popover; no horizontal page overflow and zero console errors.
- **Direct file open**: `file://.../index.html` renders the title and starts a game.

The before/after screenshots in `screenshots/` were captured from this repository:

- `before-main-cover-1440.png`, `before-main-cover-390.png` — the current `game/` prototype on main, the baseline this new page is meant to be compared against.
- `after-title-1440.png`, `after-dm-1440.png`, `after-dm-result-1440.png`, `after-check-1440.png`, `after-boss-1440.png`, `after-ending-1440.png` — this page, DM mode.
- `after-dm-390.png`, `after-boss-390.png` — phone layout, DM mode.

The "before" is the existing word-card RPG, not the same screen as the new scenario: this ticket adds a **separate playable page** rather than restyling the old one. The comparison is therefore product-baseline vs new prototype, not two takes of one screen; that limitation is stated rather than hidden.

---

## Adaptation map

| Original beat | Prototype |
| --- | --- |
| A merchant family hires the party to find two missing siblings | Lady Vane hires you to find Talen and Shara |
| The ruined fortress in a ravine, reached by a knotted rope | The ravine, the rope, the crumbled courtyard and the dragon-carved door |
| Kobolds and goblins at war over the dungeon | Queen Sesh's court, the goblin gate and the hobgoblin chief |
| The lost adventurers become thralls of the tree | Talen and Shara stand bark-skinned beneath the Blackroot |
| The outcast druid and the vampire-stake tree | Corvin the Outcast and the Blackroot |
| The midsummer fruit | The red fruit in the coda; the last choice is what it is worth |

---

## Known boundaries

- One scenario, not a campaign; no character creation beyond picking pregens, no level-up, no shop.
- The UI is a prototype; art is programmatic SVG, not hand-painted assets.
- Save is local only and is not written during combat.
- The English is written for a CET-4 learner but is not graded/levelled; the glossary is a curated 47-word subset, not a full vocabulary pipeline.
- Neural audio is pre-generated for the 71 story lines only; dynamic combat logs and arbitrary words fall back to the browser voice. Only one narrator voice (Ryan) is bundled.
- No server, account, telemetry or asynchronous play.
