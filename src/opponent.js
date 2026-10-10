import { BOARD_SIZE } from './engine.js';

export function randomShot(ownShots, rng) {
  const tried = new Set(ownShots.map((s) => `${s.row},${s.col}`));
  const open = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (!tried.has(`${row},${col}`)) open.push({ row, col });
    }
  }
  if (open.length === 0) throw new Error('No squares left to fire at');
  return open[Math.floor(rng() * open.length)];
}
