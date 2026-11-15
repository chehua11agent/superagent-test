#!/usr/bin/env node
// Render data/lmop/map-schematics/*.svg from data/lmop/maps.json.
// These are original schematic redraws (not scans of the published maps).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/lmop/maps.json'), 'utf8'));
const outDir = path.join(root, 'data/lmop/map-schematics');
fs.mkdirSync(outDir, { recursive: true });

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n) => Math.round(n * 10) / 10;
const centroid = (pts) => {
  const n = pts.length;
  return [pts.reduce((s, p) => s + p[0], 0) / n, pts.reduce((s, p) => s + p[1], 0) / n];
};
const poly = (pts) => pts.map((p) => `${fmt(p[0])},${fmt(p[1])}`).join(' ');
const bounds = (pts) => {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
};

function paletteFor(m, a) {
  const light = a.light || '';
  if (light === 'darkness' || light === 'magical-darkness') return { fill: '#b9ac93', stroke: '#4d4132', text: '#2f2820' };
  if (light === 'dim') return { fill: '#d8c9ad', stroke: '#5d4c37', text: '#33291e' };
  if (light === 'daylight') return { fill: '#dce8c8', stroke: '#4c5a3a', text: '#2c3522' };
  return { fill: '#e6d9bf', stroke: '#5a4a36', text: '#33291e' };
}

function grid(m, W, H) {
  const step = m.scale?.feet_per_square;
  if (!step || step < 5) return '';
  const lines = [];
  for (let x = 0; x <= W; x += step) lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}"/>`);
  for (let y = 0; y <= H; y += step) lines.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`);
  return `<g class="grid" stroke="#8b7a60" stroke-opacity="0.22" stroke-width="0.5">${lines.join('')}</g>`;
}

function connectionsSvg(m) {
  if (!m.connections?.length) return '';
  const byId = new Map((m.areas || []).map((a) => [a.area_id, a]));
  const out = [];
  for (const c of m.connections) {
    const a = byId.get(c.from), b = byId.get(c.to);
    if (!a || !b) continue;
    const [ax, ay] = centroid(a.footprint), [bx, by] = centroid(b.footprint);
    const secret = /secret/.test(c.type) ? ' stroke-dasharray="2 3"' : c.type === 'bridge' ? ' stroke-dasharray="5 2"' : '';
    out.push(`<line x1="${fmt(ax)}" y1="${fmt(ay)}" x2="${fmt(bx)}" y2="${fmt(by)}" stroke="#6b4f3a" stroke-width="1.4"${secret} opacity="0.7"/>`);
  }
  return `<g class="connections">${out.join('')}</g>`;
}

function areasSvg(m) {
  const out = [];
  for (const a of m.areas || []) {
    const p = paletteFor(m, a);
    const [cx, cy] = centroid(a.footprint);
    const b = bounds(a.footprint);
    const no = m.kind === 'combat' || a.no === 0 ? '' : String(a.no);
    out.push(`<g class="area" data-area="${esc(a.area_id)}" data-no="${esc(a.no)}">
      <polygon points="${poly(a.footprint)}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="1.6" stroke-linejoin="round"/>
      ${no ? `<circle cx="${fmt(cx)}" cy="${fmt(cy - 7)}" r="7" fill="#8c2f24" fill-opacity="0.9"/>` : ''}
      ${no ? `<text x="${fmt(cx)}" y="${fmt(cy - 4.2)}" text-anchor="middle" font-size="7" fill="#fff" font-weight="700">${esc(no)}</text>` : ''}
    </g>`);
  }
  return out.join('');
}

function areaLegendSvg(m, W, H, y0) {
  const areas = (m.areas || []).filter((a) => m.kind !== 'combat' && a.no !== 0);
  if (!areas.length) return { svg: '', height: 0 };
  const cols = areas.length > 14 ? 4 : 3;
  const colW = Math.floor(W / cols);
  const rows = Math.ceil(areas.length / cols);
  const out = [`<g class="area-legend"><text x="0" y="${y0 - 10}" font-size="8" font-weight="700" fill="#4a3a27">区域</text>`];
  areas.forEach((a, i) => {
    const x = (i % cols) * colW;
    const y = y0 + Math.floor(i / cols) * 11;
    out.push(`<text x="${x}" y="${y}" font-size="7.5" fill="#4a3a27"><tspan font-weight="700">${a.no}</tspan> ${esc(a.name)}</text>`);
  });
  out.push('</g>');
  return { svg: out.join(''), height: rows * 11 + 18 };
}

function legendSvg(m, W, H, yTop) {
  const items = (m.legend || []).slice(0, 12);
  if (!items.length) return '';
  const cols = 4;
  const colW = Math.max(90, Math.floor(W / cols));
  const rows = Math.ceil(items.length / cols);
  const x0 = 0, y0 = (yTop ?? H + 42);
  return `<g class="legend">
    <text x="${x0}" y="${y0 - 10}" font-size="8" font-weight="700" fill="#4a3a27">图例</text>
    ${items.map((it, i) => `<text x="${x0 + (i % cols) * colW}" y="${y0 + Math.floor(i / cols) * 11}" font-size="7.5" fill="#4a3a27">· ${esc(it)}</text>`).join('')}
  </g>`;
}

function scaleBar(m, x, y) {
  const step = m.scale?.feet_per_square;
  const bar = m.scale?.scale_bar_ft ?? (m.kind === 'region' ? 80 : step ? step * 4 : 40);
  if (!bar) return '';
  const label = m.kind === 'region' ? '20 mi' : `${bar} ft`;
  return `<g class="scale"><line x1="${x}" y1="${y}" x2="${x + bar}" y2="${y}" stroke="#4a3a27" stroke-width="1.4"/>
    <line x1="${x}" y1="${y - 3}" x2="${x}" y2="${y + 3}" stroke="#4a3a27"/>
    <line x1="${x + bar}" y1="${y - 3}" x2="${x + bar}" y2="${y + 3}" stroke="#4a3a27"/>
    <text x="${x}" y="${y + 11}" font-size="8" fill="#4a3a27">0</text>
    <text x="${x + bar}" y="${y + 11}" text-anchor="end" font-size="8" fill="#4a3a27">${label}</text>
  </g>`;
}

function north(x, y) {
  return `<g class="north" transform="translate(${x},${y})"><circle r="12" fill="none" stroke="#4a3a27" stroke-width="1"/><path d="M0,-10 L3,3 L0,0 L-3,3 Z" fill="#4a3a27"/><text y="-14" text-anchor="middle" font-size="8" fill="#4a3a27">N</text></g>`;
}

function renderMap(m) {
  const W = m.kind === 'region' ? m.canvas.width * 20 : m.canvas.width;
  const H = m.kind === 'region' ? m.canvas.height * 17.32 + 10 : m.canvas.height;
  const pad = m.kind === 'region' ? 30 : 20;
  const topPad = 42;
  const areaLegendRows = Math.ceil(((m.areas || []).filter((a) => m.kind !== 'combat' && a.no !== 0)).length / (m.areas?.length > 14 ? 4 : 3));
  const legendRows = Math.ceil(Math.min((m.legend || []).length, 12) / 4);
  const bottomPad = m.kind === 'region' ? 96 : Math.max(86, 44 + areaLegendRows * 11 + 10 + legendRows * 11 + 22);
  const vb = `${-pad} ${-topPad} ${W + pad * 2} ${H + topPad + bottomPad}`;
  const bg = m.kind === 'region' ? '#eee5cf' : m.kind === 'town' ? '#efe7d2' : '#f4ead6';
  let inner = '';
  if (m.kind === 'region') {
    // hex grid
    const hex = [];
    for (let r = 0; r < m.canvas.height; r++) for (let c = 0; c < m.canvas.width; c++) {
      const x = c * 20, y = r * 17.32 + (c % 2 ? 8.66 : 0);
      hex.push(`<polygon points="${x},${y - 10} ${x + 8.66},${y - 5} ${x + 8.66},${y + 5} ${x},${y + 10} ${x - 8.66},${y + 5} ${x - 8.66},${y - 5}" fill="none" stroke="#9b8a6a" stroke-opacity="0.35" stroke-width="0.6"/>`);
    }
    inner += `<g>${hex.join('')}</g>`;
    const siteX = (h) => h[0] * 20, siteY = (h) => h[1] * 17.32 + (h[0] % 2 ? 8.66 : 0);
    for (const r of m.routes || []) {
      const pts = r.points.map((h) => `${siteX(h)},${siteY(h)}`).join(' ');
      inner += `<polyline points="${pts}" fill="none" stroke="${r.type === 'road' ? '#a0522d' : '#8a6d3b'}" stroke-width="2.2" ${r.type === 'trail' ? 'stroke-dasharray="4 3"' : ''}/>`;
    }
    for (const s of m.sites || []) {
      const [x, y] = [siteX(s.hex), siteY(s.hex)];
      const r = s.type === 'city' ? 5 : s.type === 'town' ? 4 : 3;
      inner += `<g><circle cx="${x}" cy="${y}" r="${r}" fill="#3d2f20"/>`;
      if (s.label) inner += `<text x="${x + 7}" y="${y + 3}" font-size="9" fill="#3d2f20" font-family="serif">${esc(s.name)}</text>`;
      inner += `<title>${esc(s.name)} (${s.hex.join(',')})</title></g>`;
    }
  } else {
    inner += grid(m, W, H);
    inner += connectionsSvg(m);
    inner += areasSvg(m);
    // roads for town
    for (const r of m.routes || []) {
      const pts = r.points.map((p) => `${p[0]},${p[1]}`).join(' ');
      inner += `<polyline points="${pts}" fill="none" stroke="#b0895d" stroke-width="6" stroke-opacity="0.55" stroke-linecap="round"/>`;
    }
  }
  const areaLegend = areaLegendSvg(m, W, H, H + 42);
  inner += areaLegend.svg;
  const legendTop = H + 42 + areaLegend.height;
  inner += scaleBar(m, m.kind === 'town' ? 20 : W - 150, H + 16);
  inner += north(W - 20, 18);
  inner += legendSvg(m, W, H, legendTop);
  const title = `<text x="0" y="${-22}" font-size="15" font-weight="700" fill="#3d2f20" font-family="serif">${esc(m.title)}</text>
    <text x="0" y="${-8}" font-size="8.5" fill="#6b5a44" font-family="serif">${esc(m.title_en || '')} · ${m.areas?.length || m.sites?.length || 0} 区域 · 按原图重绘</text>`;
  const footer = `<text x="0" y="${H + bottomPad - 6}" font-size="7.5" fill="#7a674e">示意重绘，非原图扫描；尺寸按 ${m.scale?.feet_per_square ? m.scale.feet_per_square + ' 尺方格' : m.scale?.miles_per_hex ? m.scale.miles_per_hex + ' 英里 hex' : '原图比例尺'}。源：LMoP p.${m.page}${m.pdf_page ? ' / PDF p.' + m.pdf_page : ''}。</text>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${Math.round((W + pad * 2) * 1.1)}" height="${Math.round((H + topPad + bottomPad) * 1.1)}" role="img" aria-labelledby="t d">
  <title id="t">${esc(m.title)} — 示意重绘</title>
  <desc id="d">《凡戴尔的失落矿坑》${esc(m.title)}，按原图${m.scale?.feet_per_square ? m.scale.feet_per_square + ' 尺方格' : '六边形网格'}重绘的结构化示意图，共 ${m.areas?.length || 0} 个区域。</desc>
  <rect x="${-pad}" y="${-topPad}" width="${W + pad * 2}" height="${H + topPad + bottomPad}" fill="${bg}" stroke="#b9a888"/>
  ${title}
  ${inner}
  ${footer}
</svg>
`;
}

for (const m of data.maps) {
  const svg = renderMap(m);
  fs.writeFileSync(path.join(outDir, `${m.id}.svg`), svg);
}
console.log(`rendered ${data.maps.length} SVG maps to data/lmop/map-schematics/`);
