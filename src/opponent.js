import { BOARD_SIZE } from './engine.js';
import { HIT, SUNK } from './game.js';

const key = (row, col) => `${row},${col}`;
const onBoard = (row, col) => row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
const AXES = [
  [0, 1],
  [1, 0],
];

function untried(tried) {
  const open = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (!tried.has(key(row, col))) open.push({ row, col });
    }
  }
  return open;
}

function pick(candidates, rng) {
  return candidates[Math.floor(rng() * candidates.length)];
}

export function randomShot(ownShots, rng) {
  const open = untried(new Set(ownShots.map((s) => key(s.row, s.col))));
  if (open.length === 0) throw new Error('No squares left to fire at');
  return pick(open, rng);
}

function runThrough(cells, row, col, [dr, dc]) {
  const run = [{ row, col }];
  for (const sign of [-1, 1]) {
    let r = row + dr * sign;
    let c = col + dc * sign;
    while (cells.has(key(r, c))) {
      run.push({ row: r, col: c });
      r += dr * sign;
      c += dc * sign;
    }
  }
  return run;
}

// Hits that do not yet belong to a sunk ship. The strategy is told only that a
// shot sank a ship, not which ship, so it assumes the sunk ship is the straight
// run of open hits through the sinking shot (the longer run if both directions have one).
function openHits(ownShots) {
  const open = new Set();
  for (const { row, col, result } of ownShots) {
    if (result === HIT) open.add(key(row, col));
    if (result !== SUNK) continue;
    const runs = AXES.map((axis) => runThrough(open, row, col, axis));
    const sunk = runs[0].length >= runs[1].length ? runs[0] : runs[1];
    for (const cell of sunk) open.delete(key(cell.row, cell.col));
  }
  return [...open].map((k) => {
    const [row, col] = k.split(',').map(Number);
    return { row, col };
  });
}

function lineEnds(hits, open, tried) {
  const ends = new Map();
  for (const { row, col } of hits) {
    for (const axis of AXES) {
      const run = runThrough(open, row, col, axis);
      if (run.length < 2) continue;
      const [dr, dc] = axis;
      for (const sign of [-1, 1]) {
        let r = row;
        let c = col;
        while (open.has(key(r, c))) {
          r += dr * sign;
          c += dc * sign;
        }
        if (onBoard(r, c) && !tried.has(key(r, c))) ends.set(key(r, c), { row: r, col: c });
      }
    }
  }
  return [...ends.values()];
}

function neighbours(hits, tried) {
  const found = new Map();
  for (const { row, col } of hits) {
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const r = row + dr;
      const c = col + dc;
      if (onBoard(r, c) && !tried.has(key(r, c))) found.set(key(r, c), { row: r, col: c });
    }
  }
  return [...found.values()];
}

const byPosition = (a, b) => a.row - b.row || a.col - b.col;

/**
 * Hunt-and-target computer strategy (not an AI or LLM).
 * Input: only the computer's own earlier shots, each { row, col, result }.
 * Target: after a hit, fire next to it, following the line once two hits line up.
 * Hunt: otherwise fire at a random untried square on a checkerboard pattern;
 * every ship is at least 2 long, so it always covers a checkerboard square.
 * Once the checkerboard is used up, squares next to any earlier hit come first.
 */
export function huntTargetShot(ownShots, rng) {
  const tried = new Set(ownShots.map((s) => key(s.row, s.col)));
  const hits = openHits(ownShots);
  if (hits.length > 0) {
    const openSet = new Set(hits.map((h) => key(h.row, h.col)));
    const ends = lineEnds(hits, openSet, tried);
    if (ends.length > 0) return pick(ends.sort(byPosition), rng);
    const next = neighbours(hits, tried);
    if (next.length > 0) return pick(next.sort(byPosition), rng);
  }
  const open = untried(tried);
  if (open.length === 0) throw new Error('No squares left to fire at');
  const checkerboard = open.filter(({ row, col }) => (row + col) % 2 === 0);
  if (checkerboard.length > 0) return pick(checkerboard, rng);
  const allHits = ownShots.filter((s) => s.result === HIT || s.result === SUNK);
  const nearHits = neighbours(allHits, tried);
  return pick(nearHits.length > 0 ? nearHits.sort(byPosition) : open, rng);
}
