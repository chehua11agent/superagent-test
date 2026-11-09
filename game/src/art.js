// 雾港全景插画：一块 1600x900 的 SVG 世界，12 幕用不同的镜头取景。
// 全部图形由代码生成，无外部图片依赖。

const VIEWS = {
  map: { x: 0, y: 0, w: 1600, h: 900 },
  dock: { x: 0, y: 360, w: 800, h: 560 },
  ferry: { x: 0, y: 380, w: 800, h: 560 },
  tide: { x: 0, y: 400, w: 800, h: 560 },
  lighthouse: { x: 920, y: 180, w: 680, h: 476 },
  reef: { x: 800, y: 380, w: 800, h: 560 },
  yard: { x: 460, y: 380, w: 800, h: 560 },
  market: { x: 600, y: 380, w: 800, h: 560 },
  alley: { x: 360, y: 360, w: 800, h: 560 },
  watch: { x: 280, y: 350, w: 800, h: 560 },
  shelter: { x: 120, y: 330, w: 800, h: 560 },
  bridge: { x: 0, y: 330, w: 800, h: 560 },
  gate: { x: 0, y: 280, w: 800, h: 560 }
};

const PALETTES = {
  night: {
    skyTop: '#071019',
    skyMid: '#0e2834',
    skyLow: '#2b5a60',
    seaTop: '#17454b',
    seaLow: '#07171e',
    moon: '#f7e8c7',
    mist: '#c8dedb',
    star: 1
  },
  dusk: {
    skyTop: '#131624',
    skyMid: '#34303e',
    skyLow: '#8a6450',
    seaTop: '#30454a',
    seaLow: '#0d1a1f',
    moon: '#f0cf9f',
    mist: '#e0cdb8',
    star: 0.35
  },
  storm: {
    skyTop: '#080f16',
    skyMid: '#142630',
    skyLow: '#2f4e55',
    seaTop: '#163b43',
    seaLow: '#061017',
    moon: '#b9c8c2',
    mist: '#abc4c1',
    star: 0.05
  },
  dawn: {
    skyTop: '#101a29',
    skyMid: '#2b4658',
    skyLow: '#c69a74',
    seaTop: '#335155',
    seaLow: '#0d1d22',
    moon: '#f8ddb2',
    mist: '#e6d8c6',
    star: 0.18
  }
};

// 稳定的小伪随机，保证每次生成的星星位置一致。
function rng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function starField() {
  const rand = rng(20261108);
  let out = '';
  for (let i = 0; i < 78; i += 1) {
    const x = (rand() * 1600).toFixed(1);
    const y = (rand() * 360).toFixed(1);
    const r = (0.5 + rand() * 1.1).toFixed(2);
    const o = (0.25 + rand() * 0.7).toFixed(2);
    const delay = (rand() * 6).toFixed(2);
    out += `<circle class="star" cx="${x}" cy="${y}" r="${r}" fill="#f6efdd" opacity="${o}" style="animation-delay:-${delay}s"></circle>`;
  }
  return out;
}

function waveLines(offset = 0) {
  const rand = rng(77 + offset);
  let out = '';
  for (let i = 0; i < 18; i += 1) {
    const y = 490 + i * 21 + rand() * 8;
    const x = rand() * 500 - 100;
    const w = 260 + rand() * 700;
    const o = (0.05 + rand() * 0.1).toFixed(3);
    out += `<path class="wave" d="M ${x.toFixed(0)} ${y.toFixed(0)} q ${(w / 4).toFixed(0)} -6 ${(w / 2).toFixed(0)} 0 t ${(w / 2).toFixed(0)} 0" fill="none" stroke="#cfe6e0" stroke-width="1" opacity="${o}"></path>`;
  }
  return out;
}

export function worldSVG({ camera = 'map', time = 'night', weather = 'fog', className = '', fit = 'slice' } = {}) {
  const view = VIEWS[camera] || VIEWS.map;
  const p = PALETTES[time] || PALETTES.night;
  const foggy = weather === 'fog' || weather === 'rain';
  const rainy = weather === 'rain';

  return `
  <div class="world-frame ${className}" data-time="${time}" data-weather="${weather}">
    <svg class="world-svg" viewBox="${view.x} ${view.y} ${view.w} ${view.h}" preserveAspectRatio="xMidYMid ${fit}" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="sky-${time}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${p.skyTop}"/>
          <stop offset="58%" stop-color="${p.skyMid}"/>
          <stop offset="100%" stop-color="${p.skyLow}"/>
        </linearGradient>
        <linearGradient id="sea-${time}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${p.seaTop}"/>
          <stop offset="100%" stop-color="${p.seaLow}"/>
        </linearGradient>
        <radialGradient id="moon-glow-${time}" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${p.moon}" stop-opacity="0.45"/>
          <stop offset="45%" stop-color="${p.moon}" stop-opacity="0.12"/>
          <stop offset="100%" stop-color="${p.moon}" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="beam-${time}" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stop-color="${p.moon}" stop-opacity="0.5"/>
          <stop offset="55%" stop-color="${p.moon}" stop-opacity="0.1"/>
          <stop offset="100%" stop-color="${p.moon}" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="reflection-${time}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${p.moon}" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="${p.moon}" stop-opacity="0"/>
        </linearGradient>
        <radialGradient id="vignette" cx="50%" cy="48%" r="72%">
          <stop offset="50%" stop-color="#02060a" stop-opacity="0"/>
          <stop offset="100%" stop-color="#02060a" stop-opacity="0.7"/>
        </radialGradient>
        <filter id="soft" x="-30%" y="-80%" width="160%" height="260%">
          <feGaussianBlur stdDeviation="26"/>
        </filter>
        <filter id="lamp-glow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="12"/>
        </filter>
      </defs>

      <g class="world-camera">
      <g class="parallax-layer layer-far" data-depth="0.3">
      <rect width="1600" height="900" fill="url(#sky-${time})"/>
      <g class="stars">${starField()}</g>

      <circle cx="1188" cy="152" r="150" fill="url(#moon-glow-${time})"/>
      <circle class="moon" cx="1188" cy="152" r="42" fill="${p.moon}" opacity="0.92"/>
      <circle cx="1201" cy="141" r="8" fill="#0b1d2a" opacity="0.18"/>
      <circle cx="1178" cy="163" r="5" fill="#0b1d2a" opacity="0.14"/>

      <g class="clouds" fill="${p.mist}" filter="url(#soft)" opacity="0.16">
        <ellipse cx="1030" cy="150" rx="280" ry="20"/>
        <ellipse cx="760" cy="215" rx="330" ry="15"/>
        <ellipse cx="1340" cy="235" rx="260" ry="18"/>
      </g>
      </g>

      <g class="parallax-layer layer-mid" data-depth="0.16">
      <path d="M0 432 L120 360 L238 408 L352 318 L470 405 L588 352 L700 416 L826 330 L946 406 L1088 348 L1210 420 L1330 356 L1462 412 L1600 366 L1600 470 L0 470 Z"
            fill="#08151c" opacity="0.92"/>
      <path d="M0 432 L120 360 L238 408 L352 318 L470 405 L588 352 L700 416 L826 330 L946 406 L1088 348 L1210 420 L1330 356 L1462 412 L1600 366"
            fill="none" stroke="${p.mist}" stroke-width="1" opacity="0.12"/>
      <path d="M0 462 L150 420 L298 456 L430 412 L566 458 L720 418 L880 460 L1044 414 L1210 456 L1380 420 L1600 458 L1600 520 L0 520 Z"
            fill="#0a1a22" opacity="0.9"/>

      <rect y="432" width="1600" height="468" fill="url(#sea-${time})"/>
      <ellipse cx="820" cy="470" rx="760" ry="130" fill="${p.skyLow}" opacity="0.16" filter="url(#soft)"/>
      <g class="waves">${waveLines(0)}</g>
      <ellipse cx="1188" cy="570" rx="22" ry="96" fill="url(#reflection-${time})" opacity="0.28"/>

      <g class="cliff-right">
        <path d="M1150 900 L1172 654 L1186 626 L1178 604 L1204 588 L1196 566 L1238 548 L1256 566 L1272 538 L1294 556 L1320 512 L1348 528 L1376 508 L1420 500 L1452 518 L1494 496 L1532 486 L1600 470 L1600 900 Z" fill="#081014"/>
        <path d="M1238 548 L1256 566 L1272 538 L1294 556 L1320 512 L1348 528 L1376 508 L1420 500 L1452 518 L1494 496 L1532 486 L1600 470 L1600 520 L1420 500 L1290 620 L1180 900 L1600 900 L1600 520 Z" fill="#0a1418" opacity="0.72"/>
        <path d="M1178 604 L1204 588 L1196 566 L1238 548 L1256 566 L1272 538 L1294 556 L1320 512 L1348 528 L1376 508 L1420 500 L1452 518 L1494 496 L1532 486" fill="none" stroke="#9db9b2" stroke-width="1.2" opacity="0.16"/>
      </g>

      <g class="lighthouse">
        <path d="M1348 540 L1382 540 L1372 330 L1358 330 Z" fill="#0b1215"/>
        <path d="M1352 512 L1378 512 L1376 486 L1354 486 Z" fill="#1b2a2c" opacity="0.7"/>
        <path d="M1352 420 L1378 420 L1376 396 L1354 396 Z" fill="#1b2a2c" opacity="0.55"/>
        <rect x="1350" y="316" width="30" height="18" fill="#0b1215"/>
        <path d="M1346 316 L1384 316 L1365 292 Z" fill="#0b1215"/>
        <circle cx="1365" cy="326" r="44" fill="${p.moon}" opacity="0.16" filter="url(#lamp-glow)"/>
        <circle class="lamp" cx="1365" cy="326" r="5.5" fill="${p.moon}"/>
        <g class="beam" style="transform-origin:1365px 326px">
          <polygon points="1365,326 640,180 640,470" fill="url(#beam-${time})" opacity="0.55"/>
        </g>
      </g>

      <g class="distant-town" fill="#081216" opacity="0.92">
        <path d="M560 620 L560 548 L604 548 L604 522 L650 522 L650 560 L700 560 L700 590 L744 590 L744 636 L560 636 Z"/>
        <path d="M760 622 L760 566 L806 566 L806 540 L850 540 L850 580 L892 580 L892 640 L760 640 Z"/>
        <rect x="642" y="498" width="6" height="46" fill="#081216"/>
        <rect x="810" y="512" width="5" height="50" fill="#081216"/>
      </g>

      <g class="market" fill="#081216" opacity="0.96">
        <path d="M670 720 L670 640 L730 608 L790 640 L790 720 Z"/>
        <path d="M640 640 L730 596 L800 640 L790 652 L730 616 L680 652 Z" fill="#101d20"/>
        <path d="M838 724 L838 652 L890 624 L942 652 L942 724 Z"/>
        <path d="M818 654 L890 614 L952 654 L942 666 L890 630 L848 666 Z" fill="#101d20"/>
        <rect x="860" y="676" width="8" height="20" fill="#101d20"/>
        <circle class="lantern-glow" cx="860" cy="678" r="7" fill="#e3b978" opacity="0.75"/>
      </g>
      </g>

      <g class="parallax-layer layer-near" data-depth="0.06">
      <g class="dock">
        <path d="M0 700 L560 700 L560 726 L0 742 Z" fill="#0a1417"/>
        <path d="M0 742 L560 726 L560 756 L0 790 Z" fill="#060e11"/>
        <rect x="46" y="664" width="14" height="150" fill="#0a1417"/>
        <rect x="206" y="674" width="12" height="140" fill="#0a1417"/>
        <rect x="408" y="682" width="12" height="132" fill="#0a1417"/>
        <rect x="524" y="688" width="10" height="124" fill="#0a1417"/>
        <rect x="70" y="700" width="64" height="42" fill="#0c1719"/>
        <rect x="148" y="712" width="48" height="34" fill="#0b1517"/>
        <path d="M330 700 L380 700 L374 732 L336 732 Z" fill="#0c1719"/>
        <path d="M0 726 L560 726" stroke="#1a2b2c" stroke-width="1" opacity="0.5"/>
        <g class="lantern-glow">
          <circle cx="250" cy="642" r="34" fill="#e3b978" opacity="0.12" filter="url(#lamp-glow)"/>
          <circle cx="250" cy="642" r="4" fill="#f3d6a0"/>
          <line x1="250" y1="646" x2="250" y2="700" stroke="#0a1417" stroke-width="2"/>
        </g>
        <g class="lantern-glow">
          <circle cx="462" cy="656" r="30" fill="#e3b978" opacity="0.1" filter="url(#lamp-glow)"/>
          <circle cx="462" cy="656" r="3.4" fill="#f3d6a0"/>
          <line x1="462" y1="660" x2="462" y2="702" stroke="#0a1417" stroke-width="2"/>
        </g>
      </g>

      <g class="boat">
        <path d="M170 704 Q270 760 430 704 L408 746 Q290 786 192 744 Z" fill="#0a1316"/>
        <path d="M212 700 L402 700 L392 712 L222 712 Z" fill="#101d1f"/>
        <rect x="300" y="606" width="5" height="96" fill="#0a1316"/>
        <path d="M304 616 L366 668 L304 692 Z" fill="#0d191c" opacity="0.9"/>
        <line x1="304" y1="616" x2="214" y2="700" stroke="#1a2b2c" stroke-width="1" opacity="0.4"/>
        <circle class="lantern-glow" cx="368" cy="672" r="20" fill="#e3b978" opacity="0.15" filter="url(#lamp-glow)"/>
        <circle cx="368" cy="672" r="3" fill="#f3d6a0"/>
      </g>

      <g class="rope-bridge" stroke="#0a1417" stroke-width="3" fill="none" opacity="0.95">
        <path d="M250 566 Q360 610 470 574"/>
        <path d="M250 600 Q360 636 470 604"/>
        <path d="M290 584 L290 606 M330 594 L330 616 M370 600 L370 620 M410 598 L410 618 M450 588 L450 608" stroke-width="1.4"/>
        <rect x="240" y="552" width="10" height="64" fill="#0a1417" stroke="none"/>
        <rect x="468" y="560" width="10" height="58" fill="#0a1417" stroke="none"/>
      </g>

      <g class="rain" stroke="#b9d6d4" stroke-width="1" opacity="${rainy ? 0.28 : 0}">
        ${Array.from({ length: 46 }, (_, i) => {
          const x = ((i * 137) % 1600) + 20;
          const y = (i * 83) % 900;
          return `<line x1="${x}" y1="${y}" x2="${x - 12}" y2="${y + 46}"/>`;
        }).join('')}
      </g>

      <g class="fog-layer fog-1" fill="${p.mist}" filter="url(#soft)" opacity="${foggy ? 0.16 : 0.05}">
        <ellipse cx="360" cy="640" rx="520" ry="58"/>
        <ellipse cx="1140" cy="700" rx="620" ry="64"/>
      </g>
      <g class="fog-layer fog-2" fill="${p.mist}" filter="url(#soft)" opacity="${foggy ? 0.13 : 0.04}">
        <ellipse cx="820" cy="520" rx="700" ry="44"/>
        <ellipse cx="240" cy="760" rx="520" ry="50"/>
      </g>
      </g>
      </g>

      <rect width="1600" height="900" fill="url(#vignette)"/>
    </svg>
    <div class="world-grain" aria-hidden="true"></div>
    ${rainy ? '<div class="world-rain" aria-hidden="true"></div>' : ''}
  </div>`;
}

export const viewFor = (camera) => VIEWS[camera] || VIEWS.map;

/**
 * 战斗对手的立绘：暗色剪影 + 提灯，保持与雾港一致的“雾里看不清”的气质。
 * 刻意不依赖外部图片；雾、受击与消散动画由 CSS 叠加。
 */
export function foePortraitSVG({ className = '' } = {}) {
  return `
  <svg class="foe-svg ${className}" viewBox="0 0 260 460" role="img" aria-label="雾中守塔人的剪影">
    <defs>
      <radialGradient id="foe-lamp" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffe6b0" stop-opacity="0.9"/>
        <stop offset="38%" stop-color="#e3b978" stop-opacity="0.26"/>
        <stop offset="100%" stop-color="#e3b978" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="foe-cloak" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0a151b"/>
        <stop offset="58%" stop-color="#050c10"/>
        <stop offset="100%" stop-color="#02070a"/>
      </linearGradient>
      <linearGradient id="foe-rim" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#bcd4cf" stop-opacity="0.3"/>
        <stop offset="22%" stop-color="#bcd4cf" stop-opacity="0"/>
        <stop offset="78%" stop-color="#bcd4cf" stop-opacity="0"/>
        <stop offset="100%" stop-color="#bcd4cf" stop-opacity="0.2"/>
      </linearGradient>
    </defs>

    <g class="foe-ground">
      <ellipse cx="130" cy="402" rx="120" ry="30" fill="#071116" opacity="0.85"/>
      <ellipse cx="130" cy="398" rx="92" ry="16" fill="#c8dedb" opacity="0.07"/>
    </g>

    <g class="foe-body">
      <path class="foe-cloak" d="M130 56 C 96 56 78 80 74 120 L 54 306 L 46 340 L 62 330 L 70 356 L 86 338 L 96 366 L 114 344 L 130 372 L 146 344 L 164 366 L 174 338 L 190 356 L 198 330 L 214 340 L 206 306 L 186 120 C 182 80 164 56 130 56 Z" fill="url(#foe-cloak)"/>
      <path class="foe-rim" d="M130 56 C 96 56 78 80 74 120 L 54 306 L 46 340 L 62 330 L 70 356" fill="none" stroke="url(#foe-rim)" stroke-width="3" stroke-linejoin="round"/>
      <path class="foe-cloak-line" d="M130 128 L 126 340 M 98 150 L 86 320 M 162 150 L 174 320" stroke="#0c1b21" stroke-width="2" fill="none" opacity="0.8"/>

      <path class="foe-horn" d="M98 42 C 86 32 78 18 72 8 C 86 14 98 24 106 38 Z" fill="#04090c"/>
      <path class="foe-horn" d="M162 42 C 174 32 182 18 188 8 C 174 14 162 24 154 38 Z" fill="#04090c"/>
      <path class="foe-horn-rim" d="M98 42 C 86 32 78 18 72 8" fill="none" stroke="#9db9b2" stroke-width="1.2" opacity="0.18"/>
      <path class="foe-horn-rim" d="M162 42 C 174 32 182 18 188 8" fill="none" stroke="#9db9b2" stroke-width="1.2" opacity="0.18"/>
      <path class="foe-hood" d="M130 34 C 102 34 84 58 84 90 C 84 118 104 140 130 140 C 156 140 176 118 176 90 C 176 58 158 34 130 34 Z" fill="#04090c"/>
      <path class="foe-hood-rim" d="M130 34 C 102 34 84 58 84 90 C 84 118 104 140 130 140" fill="none" stroke="#9db9b2" stroke-width="1.4" opacity="0.2"/>
      <ellipse cx="130" cy="94" rx="25" ry="32" fill="#010406"/>
      <circle class="foe-eye" cx="119" cy="92" r="2.8" fill="#f3d6a0"/>
      <circle class="foe-eye" cx="141" cy="92" r="2.8" fill="#f3d6a0"/>

      <path class="foe-arm" d="M182 168 C 206 178 216 204 214 232" fill="none" stroke="#050c10" stroke-width="16" stroke-linecap="round"/>
      <path class="foe-arm-rim" d="M182 168 C 206 178 216 204 214 232" fill="none" stroke="#9db9b2" stroke-width="1.2" opacity="0.16"/>

      <g class="foe-lantern">
        <circle cx="214" cy="264" r="62" fill="url(#foe-lamp)" opacity="0.85"/>
        <path d="M211 234 L217 234 L217 244 L211 244 Z" fill="#0a1418"/>
        <rect x="200" y="242" width="28" height="36" rx="4" fill="#0a1418" stroke="#e3b978" stroke-opacity="0.55"/>
        <rect x="205" y="247" width="18" height="24" rx="3" fill="#f6dfae" opacity="0.92"/>
        <path d="M214 252 C 220 258 220 264 214 268 C 208 264 208 258 214 252 Z" fill="#fff5d8" opacity="0.9"/>
      </g>
    </g>

    <g class="foe-mist" fill="#c8dedb">
      <ellipse cx="86" cy="380" rx="104" ry="16" opacity="0.06"/>
      <ellipse cx="186" cy="404" rx="120" ry="18" opacity="0.05"/>
    </g>
  </svg>`;
}


/**
 * 玩家角色「拾词者」：戴宽檐帽的旅人，手持一张发光的词卡。
 * 与守塔人共用暗色剪影语言，但用青绿轮廓和纸色卡光区分“人物”。
 */
export function playerPortraitSVG({ className = '' } = {}) {
  return `
  <svg class="player-svg ${className}" viewBox="0 0 220 380" role="img" aria-label="拾词者的剪影">
    <defs>
      <linearGradient id="player-coat" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0d2027"/>
        <stop offset="62%" stop-color="#071318"/>
        <stop offset="100%" stop-color="#03090c"/>
      </linearGradient>
      <radialGradient id="player-card-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fff1c8" stop-opacity="0.9"/>
        <stop offset="36%" stop-color="#e3b978" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#e3b978" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="player-rim" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#bfe3d4" stop-opacity="0.32"/>
        <stop offset="24%" stop-color="#bfe3d4" stop-opacity="0"/>
        <stop offset="100%" stop-color="#bfe3d4" stop-opacity="0.06"/>
      </linearGradient>
    </defs>

    <g class="player-ground">
      <ellipse cx="108" cy="358" rx="94" ry="22" fill="#071116" opacity="0.85"/>
      <ellipse cx="108" cy="354" rx="70" ry="12" fill="#c8dedb" opacity="0.06"/>
    </g>

    <g class="player-body">
      <path class="player-legs" d="M88 294 L82 352 L104 354 L108 306 Z" fill="#03090c"/>
      <path class="player-legs" d="M132 294 L138 352 L116 354 L112 306 Z" fill="#03090c"/>
      <path class="player-boot" d="M78 342 L106 344 L106 354 L76 352 Z" fill="#061115"/>
      <path class="player-boot" d="M144 342 L116 344 L116 354 L146 352 Z" fill="#061115"/>

      <path class="player-coat" d="M110 92 C 84 92 70 116 66 150 L 52 286 L 70 298 L 80 326 L 96 306 L 110 330 L 124 306 L 140 326 L 150 298 L 168 286 L 154 150 C 150 116 136 92 110 92 Z" fill="url(#player-coat)"/>
      <path class="player-rim" d="M110 92 C 84 92 70 116 66 150 L 52 286 L 70 298" fill="none" stroke="url(#player-rim)" stroke-width="3" stroke-linejoin="round"/>
      <path class="player-coat-line" d="M110 150 L 104 300 M 88 168 L 80 292 M 132 168 L 140 292" stroke="#0d252c" stroke-width="2" fill="none" opacity="0.85"/>

      <path class="player-scarf" d="M90 104 Q110 118 130 104 L138 120 Q110 136 82 120 Z" fill="#12343b"/>
      <path class="player-scarf-tail" d="M124 120 L136 152 L126 156 L116 124 Z" fill="#102b31"/>

      <path class="player-strap" d="M82 128 L146 218" stroke="#0d2a31" stroke-width="9" opacity="0.9"/>
      <rect class="player-satchel" x="58" y="216" width="40" height="38" rx="5" fill="#071318" stroke="#9db9b2" stroke-opacity="0.16"/>
      <path d="M63 224 H93 M63 232 H93" stroke="#9db9b2" stroke-opacity="0.22"/>

      <circle class="player-head" cx="110" cy="82" r="22" fill="#02070a"/>
      <path class="player-hat" d="M54 78 Q110 58 166 78 Q110 94 54 78 Z" fill="#061115"/>
      <path class="player-hat-crown" d="M82 76 Q86 40 110 36 Q134 40 138 76 Z" fill="#0a1a20"/>
      <path class="player-hat-rim" d="M54 78 Q110 58 166 78" fill="none" stroke="#9db9b2" stroke-opacity="0.2"/>

      <path class="player-arm" d="M146 148 C 170 154 180 174 182 194" fill="none" stroke="#050c10" stroke-width="13" stroke-linecap="round"/>
      <path class="player-arm-rim" d="M146 148 C 170 154 180 174 182 194" fill="none" stroke="#9db9b2" stroke-width="1.2" opacity="0.16"/>

      <g class="player-card">
        <circle cx="186" cy="206" r="48" fill="url(#player-card-glow)" opacity="0.9"/>
        <rect x="173" y="187" width="25" height="34" rx="3" transform="rotate(-12 185 204)" fill="#0a1418" stroke="#e3b978" stroke-opacity="0.6"/>
        <path d="M180 194 L190 204 L180 214" stroke="#f6dfae" stroke-width="2" fill="none" transform="rotate(-12 185 204)"/>
      </g>
    </g>

    <g class="player-mist" fill="#c8dedb">
      <ellipse cx="74" cy="344" rx="80" ry="12" opacity="0.05"/>
      <ellipse cx="152" cy="364" rx="96" ry="14" opacity="0.05"/>
    </g>
  </svg>`;
}

/**
 * 剧情里的雾中客：戴斗笠、撑灯杆的渡口/守夜人剪影。
 * 与玩家、守塔人区分：斗笠 + 灯杆，作为剧情场景里的“人”。
 */
export function npcPortraitSVG({ className = '' } = {}) {
  return `
  <svg class="npc-svg ${className}" viewBox="0 0 240 420" role="img" aria-label="雾中客的剪影">
    <defs>
      <linearGradient id="npc-coat" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0b1a20"/>
        <stop offset="60%" stop-color="#061015"/>
        <stop offset="100%" stop-color="#02080b"/>
      </linearGradient>
      <radialGradient id="npc-lamp" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffe6b0" stop-opacity="0.85"/>
        <stop offset="38%" stop-color="#e3b978" stop-opacity="0.24"/>
        <stop offset="100%" stop-color="#e3b978" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="npc-rim" x1="1" y1="0" x2="0" y2="0">
        <stop offset="0%" stop-color="#9db9b2" stop-opacity="0.28"/>
        <stop offset="26%" stop-color="#9db9b2" stop-opacity="0"/>
        <stop offset="100%" stop-color="#9db9b2" stop-opacity="0.05"/>
      </linearGradient>
    </defs>

    <g class="npc-ground">
      <ellipse cx="116" cy="394" rx="104" ry="24" fill="#071116" opacity="0.85"/>
      <ellipse cx="116" cy="390" rx="78" ry="13" fill="#c8dedb" opacity="0.05"/>
    </g>

    <g class="npc-body">
      <path d="M96 300 L88 364 L112 366 L116 312 Z" fill="#03090c"/>
      <path d="M136 300 L144 364 L120 366 L116 312 Z" fill="#03090c"/>
      <path d="M82 352 L114 354 L114 366 L80 364 Z" fill="#061115"/>
      <path d="M150 352 L118 354 L118 366 L152 364 Z" fill="#061115"/>

      <path class="npc-coat" d="M116 112 C 88 112 72 136 68 172 L 52 318 L 72 332 L 84 358 L 102 336 L 116 362 L 130 336 L 148 358 L 160 332 L 180 318 L 164 172 C 160 136 144 112 116 112 Z" fill="url(#npc-coat)"/>
      <path class="npc-rim" d="M116 112 C 144 112 160 136 164 172 L 180 318 L 160 332 L 148 358" fill="none" stroke="url(#npc-rim)" stroke-width="3" stroke-linejoin="round"/>
      <path d="M116 168 L 110 338 M 94 186 L 86 322 M 138 186 L 146 322" stroke="#0b2027" stroke-width="2" fill="none" opacity="0.8"/>

      <path class="npc-hat" d="M48 128 Q116 88 184 128 Q116 152 48 128 Z" fill="#061115"/>
      <path class="npc-hat-top" d="M88 122 Q100 76 116 62 Q132 76 144 122 Z" fill="#0a1a20"/>
      <path class="npc-hat-rim" d="M48 128 Q116 88 184 128" fill="none" stroke="#9db9b2" stroke-opacity="0.2"/>
      <ellipse cx="116" cy="140" rx="21" ry="19" fill="#010406"/>
      <circle cx="108" cy="141" r="1.8" fill="#f3d6a0" opacity="0.75"/>
      <circle cx="124" cy="141" r="1.8" fill="#f3d6a0" opacity="0.75"/>

      <path class="npc-arm" d="M74 180 C 58 202 56 228 64 248" fill="none" stroke="#050c10" stroke-width="13" stroke-linecap="round"/>
      <path class="npc-pole" d="M196 44 L 188 386" stroke="#071318" stroke-width="5" stroke-linecap="round"/>
      <path class="npc-pole-rim" d="M196 44 L 188 386" stroke="#9db9b2" stroke-width="1" opacity="0.16"/>
      <path class="npc-arm" d="M164 184 C 182 200 190 224 190 244" fill="none" stroke="#050c10" stroke-width="12" stroke-linecap="round"/>

      <g class="npc-lantern">
        <circle cx="197" cy="88" r="46" fill="url(#npc-lamp)" opacity="0.9"/>
        <path d="M194 66 L200 66 L200 74 L194 74 Z" fill="#0a1418"/>
        <rect x="186" y="74" width="22" height="28" rx="3" fill="#0a1418" stroke="#e3b978" stroke-opacity="0.55"/>
        <rect x="190" y="78" width="14" height="19" rx="2" fill="#f6dfae" opacity="0.9"/>
        <path d="M197 82 C 202 87 202 92 197 95 C 192 92 192 87 197 82 Z" fill="#fff5d8" opacity="0.9"/>
      </g>
    </g>

    <g class="npc-mist" fill="#c8dedb">
      <ellipse cx="84" cy="380" rx="92" ry="14" opacity="0.05"/>
      <ellipse cx="164" cy="398" rx="112" ry="16" opacity="0.05"/>
    </g>
  </svg>`;
}
