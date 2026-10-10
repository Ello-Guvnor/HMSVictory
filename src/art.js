import { VERTICAL } from './engine.js';

export const LIVERIES = Object.freeze({
  royal: { hull: '#1c1a17', band: '#d9a441', deck: '#b8894f', sail: '#f6efdc', trim: '#d9a441', ensign: 'white-ensign' },
  french: { hull: '#201c19', band: '#9c2f25', deck: '#a67c4a', sail: '#efe6cf', trim: '#9c2f25', ensign: 'french' },
  spanish: { hull: '#2a1d17', band: '#a3372b', deck: '#a67c4a', sail: '#efe6cf', trim: '#c9a13b', ensign: 'spanish' },
});

export const ENEMY_NATIONS = Object.freeze({
  'santisima-trinidad': 'spanish',
  bucentaure: 'french',
  redoutable: 'french',
  'santa-ana': 'spanish',
  argonaute: 'french',
});

export const FLAG_NAMES = Object.freeze({
  'white-ensign': 'White Ensign of the Royal Navy (1801 pattern)',
  french: 'French tricolour',
  spanish: 'Spanish naval ensign (1785 pattern, simplified)',
});

export function gunDecks(length) {
  return { 5: 3, 4: 2, 3: 2, 2: 1 }[length] ?? 1;
}

export function mastPositions(length) {
  return length >= 3 ? [0.3, 0.52, 0.74] : [0.38, 0.66];
}

const n = (value) => Math.round(value * 10) / 10;

function unionFlag() {
  return '<rect width="30" height="15" fill="#012169"/>'
    + '<path d="M0 0L30 15M0 15L30 0" stroke="#fff" stroke-width="3"/>'
    + '<path d="M0 0L30 15M0 15L30 0" stroke="#c8102e" stroke-width="1"/>'
    + '<rect x="12.5" width="5" height="15" fill="#fff"/><rect y="5" width="30" height="5" fill="#fff"/>'
    + '<rect x="13.5" width="3" height="15" fill="#c8102e"/><rect y="6" width="30" height="3" fill="#c8102e"/>';
}

export function flagInner(kind) {
  if (kind === 'white-ensign') {
    return '<rect width="60" height="30" fill="#fff"/>'
      + '<rect x="27" width="6" height="30" fill="#c8102e"/><rect y="12" width="60" height="6" fill="#c8102e"/>'
      + `<g transform="scale(0.9 0.8)">${unionFlag()}</g>`;
  }
  if (kind === 'french') {
    return '<rect width="20" height="30" fill="#002395"/><rect x="20" width="20" height="30" fill="#fff"/>'
      + '<rect x="40" width="20" height="30" fill="#ed2939"/>';
  }
  if (kind === 'spanish') {
    return '<rect width="60" height="30" fill="#ad1519"/><rect y="7.5" width="60" height="15" fill="#fabd00"/>'
      + '<path d="M10 11h8v6q0 4-4 4t-4-4z" fill="#ad1519" stroke="#6b4b12" stroke-width="0.6"/>'
      + '<path d="M14 11h4v6q0 4-4 4z" fill="#f4f1e8"/>'
      + '<path d="M10 10.5l0-3 2 1.5 2-2.5 2 2.5 2-1.5 0 3z" fill="#fabd00" stroke="#6b4b12" stroke-width="0.6"/>';
  }
  throw new Error(`Unknown flag: ${kind}`);
}

export function flagSvg(kind) {
  return `<svg class="flag" viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg" data-flag="${kind}">`
    + `<title>${FLAG_NAMES[kind]}</title>${flagInner(kind)}`
    + '<rect width="60" height="30" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="1"/></svg>';
}

export function shipProfileSvg(length, nation) {
  const c = LIVERIES[nation];
  const W = 40 * length;
  const water = 86;
  const decks = gunDecks(length);
  const top = water - decks * 10 - 8;
  const bow = W * 0.1;
  const stern = W * 0.86;
  const parts = [];

  parts.push(`<line x1="${n(bow + 4)}" y1="${top + 2}" x2="${n(W * 0.01)}" y2="${top - 10}" stroke="${c.hull}" stroke-width="2"/>`);

  const masts = mastPositions(length);
  const tiers = decks >= 2 ? 3 : 2;
  const sailHalf = W * 0.085;
  masts.forEach((f, i) => {
    const x = W * f;
    const mastTop = i === 1 ? 6 : 12;
    parts.push(`<line class="mast" x1="${n(x)}" y1="${mastTop}" x2="${n(x)}" y2="${top}" stroke="#4a3219" stroke-width="2"/>`);
    const span = top - 4 - (mastTop + 4);
    const h = span / tiers;
    for (let t = 0; t < tiers; t += 1) {
      const y0 = mastTop + 4 + t * h;
      const y1 = y0 + h - 1.5;
      const halfTop = sailHalf * (0.6 + 0.15 * t);
      const halfBottom = sailHalf * (0.75 + 0.15 * t);
      parts.push(`<path d="M${n(x - halfTop)} ${n(y0)}L${n(x + halfTop)} ${n(y0)}L${n(x + halfBottom)} ${n(y1)}L${n(x - halfBottom)} ${n(y1)}Z" fill="${c.sail}" stroke="#8a7a5a" stroke-width="0.8"/>`);
    }
  });

  parts.push(`<path d="M${n(bow)} ${top + 3}L${n(stern)} ${top - 3}L${n(stern - 3)} ${water}L${n(bow + W * 0.06)} ${water}Q${n(bow + 2)} ${water - 4} ${n(bow)} ${top + 3}Z" fill="${c.hull}"/>`);
  parts.push(`<line x1="${n(bow)}" y1="${top + 3}" x2="${n(stern)}" y2="${top - 3}" stroke="${c.trim}" stroke-width="1.5"/>`);

  for (let d = 0; d < decks; d += 1) {
    const y = top + 5 + d * 10;
    const x0 = bow + 6;
    const x1 = stern - 5;
    let ports = '';
    for (let x = x0 + 4; x < x1 - 4; x += 9) ports += `<rect x="${n(x)}" y="${y + 1}" width="4" height="3" fill="${c.hull}"/>`;
    parts.push(`<g class="gun-deck"><rect x="${n(x0)}" y="${y}" width="${n(x1 - x0)}" height="5" fill="${c.band}"/>${ports}</g>`);
  }

  parts.push(`<line x1="0" y1="${water}" x2="${W}" y2="${water}" stroke="#2e4a78" stroke-width="2"/>`);

  const flagW = Math.min(14, W * 0.12);
  parts.push(`<line x1="${n(stern - 1)}" y1="${top - 3}" x2="${n(stern - 1)}" y2="${top - 20}" stroke="#4a3219" stroke-width="1.2"/>`);
  parts.push(`<svg x="${n(stern - 0.5)}" y="${top - 20}" width="${n(flagW)}" height="${n(flagW / 2)}" viewBox="0 0 60 30" preserveAspectRatio="none">${flagInner(c.ensign)}</svg>`);

  return `<svg class="ship-profile" viewBox="0 0 ${W} 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${parts.join('')}</svg>`;
}

export function shipTopSvg(length, nation, orientation) {
  const c = LIVERIES[nation];
  const L = 100 * length;
  const hull = `M4 50C20 18 60 12 100 12L${L - 10} 14Q${L - 3} 16 ${L - 3} 50Q${L - 3} 84 ${L - 10} 86L100 88C60 88 20 82 4 50Z`;
  const parts = [
    `<line x1="30" y1="50" x2="0" y2="50" stroke="#4a3219" stroke-width="4"/>`,
    `<path d="${hull}" fill="${c.deck}" stroke="${c.hull}" stroke-width="10"/>`,
    `<path d="${hull}" fill="none" stroke="${c.band}" stroke-width="3"/>`,
    ...[36, 50, 64].map((y) => `<line x1="40" y1="${y}" x2="${L - 16}" y2="${y}" stroke="rgba(0,0,0,0.18)" stroke-width="1.5"/>`),
    `<rect x="${L - 30}" y="28" width="16" height="44" rx="3" fill="${c.hull}"/>`,
  ];
  for (const f of mastPositions(length)) {
    const x = n(L * f);
    parts.push(`<rect x="${n(x - 8)}" y="20" width="11" height="60" rx="4" fill="${c.sail}" stroke="#8a7a5a" stroke-width="1.5"/>`);
    parts.push(`<line x1="${x}" y1="16" x2="${x}" y2="84" stroke="#4a3219" stroke-width="4"/>`);
    parts.push(`<circle class="mast" cx="${x}" cy="50" r="6" fill="#3b2a17"/>`);
  }
  const body = parts.join('');
  if (orientation === VERTICAL) {
    return `<svg class="ship-top" viewBox="0 0 100 ${L}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><g transform="translate(100 0) rotate(90)">${body}</g></svg>`;
  }
  return `<svg class="ship-top" viewBox="0 0 ${L} 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${body}</svg>`;
}
