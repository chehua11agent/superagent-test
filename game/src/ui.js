// 小工具：转义、图标、进度环、日期格式。
import { GAME_ICON_PATHS } from './game-icons.js';

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const ICONS = {
  spark: '<path d="M12 2.5l2.1 6.4L20.5 11l-6.4 2.1L12 19.5l-2.1-6.4L3.5 11l6.4-2.1L12 2.5z"/>',
  bag: '<path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 016 0v2"/><path d="M9 12h6"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  shield: '<path d="M12 3l7 3v6c0 4.2-3 7.2-7 9-4-1.8-7-4.8-7-9V6l7-3z"/>',
  key: '<circle cx="8.5" cy="8.5" r="4"/><path d="M11.5 11.5L20 20M16.5 16.5l2-2M14 14l2-2"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z"/><path d="M9 4v14M15 6v14"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 016.5 3H20v16H6.5A2.5 2.5 0 004 21.5v-16z"/><path d="M4 18.5A2.5 2.5 0 016.5 16H20"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>',
  arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>',
  back: '<path d="M20 12H5M11 6l-6 6 6 6"/>',
  check: '<path d="M4.5 12.5l5 5L20 6.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/>',
  play: '<path d="M8 5.5l10 6.5-10 6.5v-13z"/>',
  refresh: '<path d="M20 11a8 8 0 10-2.3 6.4M20 4v7h-7"/>',
  star: '<path d="M12 3l2.7 5.7 6.3.9-4.6 4.4 1.1 6.2-5.5-3-5.5 3 1.1-6.2L3 9.6l6.3-.9L12 3z"/>',
  flame: '<path d="M12 21c3.5 0 6-2.4 6-5.8 0-4.3-4.2-6-4.2-9.7 0-1.1.3-2 .8-2.5-3.7.8-7.6 4.6-7.6 9.1C7 17 9.5 21 12 21z"/>',
  leave: '<path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'
};

export function icon(name, className = '') {
  const path = ICONS[name] || ICONS.spark;
  return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

/** game-icons.net 的实心图标，仅用于战斗界面；未知名字退回内联线性图标。 */
export function gameIcon(name, className = '') {
  const path = GAME_ICON_PATHS[name];
  if (!path) return icon('spark', className);
  return `<svg class="icon icon-solid ${className}" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="${path}"/></svg>`;
}

export function ring({ percent, label, value, sub, tone = 'gold' }) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  const circumference = 2 * Math.PI * 26;
  const offset = circumference * (1 - p / 100);
  return `
    <div class="ring-block tone-${tone}">
      <svg class="ring" viewBox="0 0 64 64" role="img" aria-label="${esc(label)} ${p}%">
        <circle class="ring-track" cx="32" cy="32" r="26"></circle>
        <circle class="ring-value" cx="32" cy="32" r="26" stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"></circle>
      </svg>
      <div class="ring-text">
        <strong>${esc(value)}</strong>
        <span>${esc(sub)}</span>
      </div>
      <div class="ring-label">${esc(label)}</div>
    </div>`;
}

export function chip(text, tone = '') {
  return `<span class="chip ${tone ? `chip-${tone}` : ''}">${text}</span>`;
}

export function progressBar(percent, tone = 'gold') {
  return `<div class="progress ${tone}"><span style="width:${Math.max(0, Math.min(100, percent))}%"></span></div>`;
}

export function formatDateCN(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return `${y} 年 ${m} 月 ${d} 日`;
}

export function weekdayCN(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return names[new Date(y, m - 1, d, 12).getDay()];
}

export function plural(n, unit) {
  return `${n} ${unit}`;
}

export function statChip(iconName, value, label, tone = '') {
  return `<span class="stat-chip ${tone ? `tone-${tone}` : ''}">${icon(iconName)}<b>${esc(value)}</b><i>${esc(label)}</i></span>`;
}
