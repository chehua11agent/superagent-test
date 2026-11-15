#!/usr/bin/env node
// Generate docs/content/lmop-atlas.md from maps.json, rules.json and rules-crossref.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const maps = read('data/lmop/maps.json');
const rules = read('data/lmop/rules.json');
const cr = read('data/lmop/rules-crossref.json');
const ruleTitle = new Map(rules.rules.map((r) => [r.id, r.title]));
const crById = new Map(cr.records.map((r) => [r.record_id, r]));

const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const ruleNames = (ids) => (ids || []).map((id) => ruleTitle.get(id) || id).join('、');
const bbox = (pts) => {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
};
const sizeOf = (a) => { const b = bbox(a.footprint); return `${Math.round(b.w)}×${Math.round(b.h)} ft`; };
const connName = (id) => id?.startsWith('external:') ? `外部：${id.split(':').slice(2).join(':')}` : (crById.get(id)?.name || id);
const lightZh = { daylight: '白天', bright: '明亮', dim: '微光', darkness: '黑暗', 'magical-darkness': '魔法黑暗' };
const kindZh = { region: '区域图', battlemap: '战斗地图', dungeon: '地下城', site: '野外地点', town: '城镇' };

let md = [];
md.push('# 《凡戴尔的失落矿坑》地图与规则对照图集');
md.push('');
md.push('> 对象：D&D 5e（2014）入门模组《凡戴尔的失落矿坑》（Lost Mine of Phandelver）的**地图、场景与规则对照**。');
md.push('> 数据：`data/lmop/maps.json`、`data/lmop/rules.json`、`data/lmop/rules-crossref.json`；示意图：`data/lmop/map-schematics/`。');
md.push('> 本图集不收录原图扫描或模组译文正文；地图为按原图方格/比例尺重绘的**示意矢量图**，场景文字为生成式摘要。');
md.push('> 3D 场景切片：见 [`prototype/lmop-3d/`](../../prototype/lmop-3d/)（把本图集的地图 JSON 生成成可走入的克拉格莫窝点）。');
md.push('');
md.push('## 1. 坐标、比例与精度');
md.push('');
md.push('- `maps.json` 中每张图使用独立坐标系：原点在左上角，x 向东、y 向南，单位为英尺（区域地图为 hex）。');
md.push('- `scale.feet_per_square` 是原图方格边长；`footprint` 是多边形顶点，`ceiling_ft` 是默认净高，`elevation_ft` 是相对标高。');
md.push('- 示意几何按原图方格计数或比例尺重绘，地下城误差约 ±1 格（5 尺），室外约 ±1 格（10 尺）；精确尺寸以原图与 DM 判断为准。');
md.push('- 原图未标注的地点（克拉格莫城堡、潮音洞、飞龙崖）在区域图上只给推算 hex，并标 `map_label:false`，不作为精确位置。');
md.push('');
md.push('## 2. 总览');
md.push('');
md.push('| 地图 | 类型 | 书内页 / PDF | 比例 | 区域 | 场景记录 | 示意图 |');
md.push('|---|---|---|---:|---:|---|---|');
for (const m of maps.maps) {
  const areas = (m.areas || []).length;
  const sites = (m.sites || []).length;
  const count = areas || sites;
  const scene = m.scene_id ? crById.get(m.scene_id)?.name || '—' : '—';
  md.push(`| ${esc(m.title)} | ${kindZh[m.kind] || m.kind} | ${m.page} / ${m.pdf_page} | ${m.scale?.feet_per_square ? m.scale.feet_per_square + ' ft/格' : m.scale?.miles_per_hex ? m.scale.miles_per_hex + ' mi/hex' : '比例尺'} | ${count} | ${esc(scene)} | [SVG](../../data/lmop/map-schematics/${m.id}.svg) |`);
}
md.push('');
md.push('## 3. 地图与场景');
md.push('');
for (const m of maps.maps) {
  md.push(`### 3.${maps.maps.indexOf(m) + 1} ${esc(m.title)}（${m.title_en}）`);
  md.push('');
  md.push(`![${esc(m.title)} 示意重绘](../../data/lmop/map-schematics/${m.id}.svg)`);
  md.push('');
  md.push(`- 页码：书内 ${m.page} / PDF ${m.pdf_page}；类型：${kindZh[m.kind] || m.kind}。`);
  if (m.scale?.feet_per_square) md.push(`- 比例：1 格 = ${m.scale.feet_per_square} 尺；画布 ${m.canvas.width}×${m.canvas.height} 尺。`);
  if (m.scale?.miles_per_hex) md.push(`- 比例：1 hex = ${m.scale.miles_per_hex} 英里；画布 ${m.canvas.width}×${m.canvas.height} hex。`);
  if (m.environment) md.push(`- 环境：${esc(Object.values(m.environment).join('；'))}。`);
  if (m.page_basis) md.push(`- 页码口径：${esc(m.page_basis)}。`);
  md.push(`- 布局：${esc(m.layout)}`);
  md.push(`- 精度：${esc(m.accuracy)}`);
  md.push('');
  if (m.kind === 'region') {
    md.push('**地点**');
    md.push('');
    md.push('| 地点 | 英文 | 类型 | hex | 场景 | 备注 |');
    md.push('|---|---|---|---:|---|---|');
    for (const s of m.sites || []) {
      md.push(`| ${esc(s.name)} | ${esc(s.name_en || '')} | ${s.type} | ${s.hex.join(',')} | ${s.scene_id ? esc(crById.get(s.scene_id)?.name || s.scene_id) : '—'} | ${esc(s.note || (s.label ? '原图标注' : '原图未标注，推算'))} |`);
    }
    md.push('');
    md.push('**旅行距离（用于估算，不是强制路线）**');
    md.push('');
    md.push('| 起点 | 终点 | 英里 | 依据 |');
    md.push('|---|---|---:|---|');
    for (const t of m.travel || []) {
      const f = m.sites.find((s) => s.id === t.from)?.name || t.from;
      const g = m.sites.find((s) => s.id === t.to)?.name || t.to;
      md.push(`| ${esc(f)} | ${esc(g)} | ${t.miles} | ${t.source === 'text' ? '模组文字' : 'hex 估算'} |`);
    }
    md.push('');
  } else {
    md.push('**区域**');
    md.push('');
    md.push('| # | 名称 | 页 | 尺寸（包围盒） | 净高 | 光照 | 连接（邻区/类型） | 关键物件 | 规则 |');
    md.push('|---:|---|---:|---:|---:|---|---|---|---|');
    const byArea = new Map((m.areas || []).map((a) => [a.area_id, a]));
    for (const a of m.areas || []) {
      const rec = crById.get(a.area_id);
      const conns = (m.connections || []).filter((c) => c.from === a.area_id || c.to === a.area_id).map((c) => {
        const other = c.from === a.area_id ? c.to : c.from;
        const otherNo = other?.startsWith('external:') ? '外' : (byArea.get(other)?.no ?? '?');
        return `#${otherNo} ${c.type}`;
      });
      const entrances = (a.entrances || []).length ? a.entrances.join('；') : conns.slice(0, 5).join('；');
      const props = (a.props || []).slice(0, 4).join('；');
      md.push(`| ${a.no} | ${esc(a.name)} | ${esc(a.page)} | ${sizeOf(a)} | ${a.ceiling_ft} ft | ${lightZh[a.light] || a.light} | ${esc(entrances)} | ${esc(props)} | ${esc(ruleNames(rec?.rule_ids || a.rules))} |`);
    }
    md.push('');
    md.push('**场景摘要与机械要点**');
    md.push('');
    md.push('| # | 场景摘要 | 机械要点 |');
    md.push('|---:|---|---|');
    for (const a of m.areas || []) {
      const rec = crById.get(a.area_id);
      md.push(`| ${a.no} | ${esc(rec?.summary || a.visual || '')} | ${esc(rec?.mechanics_summary || '—')} |`);
    }
    md.push('');
    md.push('**连接**');
    md.push('');
    md.push('| 从 | 到 | 类型 | 宽度 | 备注 |');
    md.push('|---|---|---|---:|---|');
    for (const c of m.connections || []) {
      md.push(`| ${esc(connName(c.from))} | ${esc(connName(c.to))} | ${c.type} | ${c.width_ft} ft | ${esc(c.notes || '')} |`);
    }
    md.push('');
  }
  if (m.notes?.length) {
    md.push('**运行备注**');
    md.push('');
    for (const n of m.notes) md.push(`- ${esc(n)}`);
    md.push('');
  }
}

// rules section
md.push('## 4. 规则与剧本对照');
md.push('');
md.push('### 4.1 规则索引');
md.push('');
md.push('规则索引把模组用到的 5e 机制归一为稳定 ID；每条场景/区域都挂到这些 ID 上，便于从剧本反查规则，或从规则反查出现位置。');
md.push('');
md.push('| ID | 规则 | 英文 | 分类 | 来源 | 摘要 |');
md.push('|---|---|---|---|---|---|');
for (const r of rules.rules) {
  md.push(`| \`${r.id}\` | ${esc(r.title)} | ${esc(r.title_en)} | ${r.category} | ${esc(r.source)} | ${esc(r.summary)} |`);
}
md.push('');
md.push('### 4.2 对照覆盖');
md.push('');
const cov = cr.coverage;
md.push(`- 源记录 **${cov.records_total}** 条（含 4 个分卷的场景、红烙印/雷霆树镇/克拉格莫城堡的内嵌区域，以及 1 条全局规则记录）。`);
md.push(`- 检定/豁免/流程判定 **${cov.checks_total}** 条，已映射 **${cov.checks_mapped}** 条；奖励 **${cov.rewards_total}** 条，已映射 **${cov.rewards_mapped}** 条；危险 **${cov.hazards_total}** 条；怪物条目 **${cov.monsters_total}** 条。`);
md.push(`- 使用规则 **${cov.rules_used.length}** 条，未使用 **${cov.rules_unused.length}** 条；没有未解析的检定或奖励引用。`);
md.push(`- 缺少附录数据卡的怪物：${cov.missing_stat_blocks.map((x) => '`' + x + '`').join('、')}。${cov.missing_stat_block_note || ''}`);
md.push('');
md.push('**分卷覆盖**');
md.push('');
md.push('| 分卷 | 记录 | 有检定/怪物/奖励 | 检定 | 怪物条目 | 奖励 |');
md.push('|---|---:|---:|---:|---:|---:|');
for (const part of ['p001-015', 'p016-033', 'p034-061', 'p062-090']) {
  const rs = cr.records.filter((r) => r.part === part);
  const active = rs.filter((r) => r.checks.length + r.monsters.length + r.rewards.length > 0).length;
  md.push(`| ${part} | ${rs.length} | ${active} | ${rs.reduce((n, r) => n + r.checks.length, 0)} | ${rs.reduce((n, r) => n + r.monsters.length, 0)} | ${rs.reduce((n, r) => n + r.rewards.length, 0)} |`);
}
md.push('');
md.push('**检定类型分布**');
md.push('');
md.push('| 类型 | 数量 |');
md.push('|---|---:|');
for (const [k, v] of Object.entries(cov.checks_by_kind)) {
  const zh = { ability_check: '属性/技能检定', saving_throw: '豁免', contest: '对抗检定', passive: '被动检定', procedure: '流程判定' }[k] || k;
  md.push(`| ${zh} | ${v} |`);
}
md.push('');
md.push('**规则分类**');
md.push('');
md.push('| 分类 | 规则数 |');
md.push('|---|---:|');
const catCount = {};
for (const r of rules.rules) catCount[r.category] = (catCount[r.category] || 0) + 1;
for (const [k, v] of Object.entries(catCount)) md.push(`| ${k} | ${v} |`);
md.push('');
md.push('**DC 分布**');
md.push('');
md.push('| DC | 数量 |');
md.push('|---:|---:|');
for (const [k, v] of Object.entries(cov.dc_distribution).sort((a, b) => Number(a[0]) - Number(b[0]))) md.push(`| ${k} | ${v} |`);
md.push('');
md.push('### 4.3 XP 与等级审计');
md.push('');
const la = cr.level_audit;
md.push(`- 第一部分：${la.inputs.part1_per_pc} XP/PC（75 里程碑 + 275 清剿）。`);
md.push(`- 第二部分：${la.inputs.part2_total} XP 总量，按 4–5 人平分。`);
md.push(`- 第三部分：赶走毒牙 ${la.inputs.part3_drive_off_total} XP / 杀死毒牙 ${la.inputs.part3_kill_total} XP 总量（二选一，不叠加）。`);
md.push(`- 第四部分：${la.inputs.part4_listed_total} 点列出的额外 XP + ${la.inputs.part4_monster_total} 怪物 XP。${la.inputs.part4_monster_note}`);
md.push('');
md.push('| 队伍 | 第三部分路线 | 第一部分/PC | 第二部分/PC | 第三部分/PC | 第四部分/PC | 累计/PC | 按 XP 等级 |');
md.push('|---:|---|---:|---:|---:|---:|---:|---:|');
for (const s of la.scenarios) md.push(`| ${s.party_size} 人 | ${s.part3_path === 'kill' ? '杀死毒牙' : '赶走毒牙'} | ${s.part1_per_pc} | ${s.part2_per_pc} | ${s.part3_per_pc} | ${s.part4_per_pc} | ${s.cumulative_per_pc} | ${s.level_by_xp} |`);
md.push('');
md.push(`**结论：** ${la.finding}`);
md.push('');
md.push('### 4.4 非地图场景与总览');
md.push('');
md.push('以下记录没有独立地图几何（城镇店铺、野外地点、任务遭遇或地下城总览），但仍逐条挂了规则与实例，保证整套剧本没有“只写剧情、不接规则”的段落。');
md.push('');
md.push('| 记录 | 分卷 | 类型 | 页 | 检定 | 怪物 | 奖励 | 规则 |');
md.push('|---|---|---|---:|---:|---:|---:|---|');
for (const r of cr.records.filter((x) => !x.map_id && x.record_type !== 'module')) {
  md.push(`| ${esc(r.name)} | ${r.part} | ${r.record_type} | ${esc(r.page ?? '')} | ${r.checks.length} | ${r.monsters.length} | ${r.rewards.length} | ${esc(ruleNames(r.rule_ids))} |`);
}
md.push('');
md.push('### 4.5 怎么读对照表');
md.push('');
md.push('- 每个场景/区域的 `rule_ids` 是“该场景会用到哪些规则”的并集；`checks`、`hazards`、`monsters`、`rewards` 是具体实例。');
md.push('- 检定的 `rule_ids` 由 `kind`、DC、技能与文本关键词推导；例如“敏捷豁免”挂到 `rule-saving-throw`，有 DC 再挂 `rule-dc`。');
md.push('- 地图区域的 `rule_ids` 由 `maps.json` 的区域字段与场景描述共同生成；地下城默认挂光照/困难地形，有怪物再挂战斗/先攻/动作。');
md.push('- 需要新增规则时，先在 `rules.json` 加条目，再在 `maps.json` 或对照生成器里引用；校验器会拒绝未使用或未解析的规则。');
md.push('');
md.push('## 5. 给 3D 建模的使用说明');
md.push('');
md.push('- 单位统一用英尺；`footprint` 直接是地面多边形，`ceiling_ft` 是净高，门宽/桥宽/裂隙宽在 `connections[].width_ft`。');
md.push('- `light` 只有 daylight / bright / dim / darkness；`terrain` 列出困难地形、浅水、碎石等；`props` 是需要建模的关键物件。');
md.push('- 区域之间的 `connections` 给出类型（door / stairs / bridge / chimney / secret_door / tunnel / water_passage 等）与宽度；门默认 6 尺高、4 尺宽（除模组另注）。');
md.push('- 室外图（区域、城镇、废墟、伏击）不是室内方格：区域图用 hex，城镇用比例尺，废墟/伏击用 10 尺方格。');
md.push('- 示意图只表达拓扑与相对位置，不替代原图美术；做 3D 时请以本表尺寸 + 原图页为准，并在建模工具里按 5/10 尺格复核。');
md.push('');
md.push('## 6. 已知边界');
md.push('');
md.push('- 几何为示意重绘，不是测绘数据；洞穴边界与圆弧塔楼为多边形近似。');
md.push('- 原图未标注地点的 hex 为文字推算，只用于旅行估算。');
md.push('- 赭色果冻怪与缚灵莫尔梅斯克在正文出现但附录 B 无数据卡；XP 审计按《怪物图鉴》估算并在对照中标注。');
md.push('- 终局 5 级并非所有队伍都能由 XP 自然达到；若队伍 5 人或只赶走毒牙，建议使用里程碑。');
md.push('- 第一部分与第二部分的页码为书内印刷页；第四部分按 PDF 页记录（见 `maps.json` 的 `page_basis`）。');
md.push('');
md.push('## 7. 校验');
md.push('');
md.push('```bash');
md.push('node scripts/lmop-atlas-validate.mjs   # 地图几何/连接/规则/对照/XP 审计');
md.push('node scripts/build-lmop-crossref.mjs   # 重新生成规则对照');
md.push('node scripts/render-lmop-maps.mjs      # 重新生成示意 SVG');
md.push('node scripts/build-lmop-atlas-doc.mjs  # 重新生成本文');
md.push('node --test tests/lmop-atlas.test.mjs  # 图集测试');
md.push('```');
md.push('');
md.push('原有四段数据校验仍可用：`node scripts/lmop-validate.mjs` 与 `node --test tests/lmop.test.mjs`。');
md.push('');

fs.writeFileSync(path.join(root, 'docs/content/lmop-atlas.md'), md.join('\n'));
console.log('wrote docs/content/lmop-atlas.md', md.length, 'lines');
