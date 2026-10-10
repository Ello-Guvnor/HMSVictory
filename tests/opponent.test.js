import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROYAL_NAVY_FLEET, HORIZONTAL, VERTICAL, createBoard, placeShip, randomFleet } from '../src/engine.js';
import { HIT, MISS, SUNK } from '../src/game.js';
import { huntTargetShot } from '../src/opponent.js';
import { createRng } from '../src/rng.js';
import { rowsFleet } from './helpers.js';

const first = () => 0;
const isNeighbour = (a, b) => Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;

function resolve(board, shot, hitsSoFar) {
  const ship = board.ships.find((s) => s.cells.some((c) => c.row === shot.row && c.col === shot.col));
  if (!ship) return MISS;
  hitsSoFar.add(`${shot.row},${shot.col}`);
  return ship.cells.every((c) => hitsSoFar.has(`${c.row},${c.col}`)) ? SUNK : HIT;
}

function playOut(board, rng) {
  const shots = [];
  const hits = new Set();
  const total = board.ships.reduce((n, s) => n + s.cells.length, 0);
  while (hits.size < total) {
    const { row, col } = huntTargetShot(shots, rng);
    shots.push({ row, col, result: resolve(board, { row, col }, hits) });
    if (shots.length > 100) throw new Error('more than 100 shots');
  }
  return shots;
}

test('hunting fires only at checkerboard squares while any are left', () => {
  const rng = createRng(3);
  const shots = [];
  for (let i = 0; i < 50; i += 1) shots.push({ ...huntTargetShot(shots, rng), result: MISS });
  assert.ok(shots.every(({ row, col }) => (row + col) % 2 === 0));
  assert.equal(new Set(shots.map((s) => `${s.row},${s.col}`)).size, 50);
});

test('after a hit, the next shot is next to it', () => {
  for (let seed = 1; seed <= 30; seed += 1) {
    const next = huntTargetShot([{ row: 4, col: 4, result: HIT }], createRng(seed));
    assert.ok(isNeighbour(next, { row: 4, col: 4 }), `seed ${seed}: ${JSON.stringify(next)}`);
  }
});

test('after a hit on the edge, it only tries neighbours that are on the board and untried', () => {
  const shots = [
    { row: 0, col: 1, result: MISS },
    { row: 0, col: 0, result: HIT },
  ];
  assert.deepEqual(huntTargetShot(shots, first), { row: 1, col: 0 });
});

test('after two hits in a line, it keeps firing along that line', () => {
  const shots = [
    { row: 4, col: 4, result: HIT },
    { row: 4, col: 5, result: HIT },
  ];
  for (let seed = 1; seed <= 30; seed += 1) {
    const next = huntTargetShot(shots, createRng(seed));
    assert.equal(next.row, 4);
    assert.ok(next.col === 3 || next.col === 6, `seed ${seed}: ${JSON.stringify(next)}`);
  }
});

test('when one end of the line is a miss, it fires at the other end', () => {
  const shots = [
    { row: 4, col: 4, result: HIT },
    { row: 4, col: 5, result: HIT },
    { row: 4, col: 6, result: MISS },
  ];
  assert.deepEqual(huntTargetShot(shots, createRng(9)), { row: 4, col: 3 });
});

test('after a sinking, it goes back to hunting', () => {
  const shots = [
    { row: 5, col: 5, result: HIT },
    { row: 5, col: 6, result: SUNK },
  ];
  assert.deepEqual(huntTargetShot(shots, first), { row: 0, col: 0 });
});

test('hits left over from a different ship are still chased after a sinking', () => {
  const shots = [
    { row: 5, col: 5, result: HIT },
    { row: 6, col: 5, result: HIT },
    { row: 5, col: 6, result: SUNK },
  ];
  const next = huntTargetShot(shots, first);
  assert.ok(isNeighbour(next, { row: 6, col: 5 }), JSON.stringify(next));
});

test('once the checkerboard is used up, squares next to earlier hits come first', () => {
  const shots = [
    { row: 4, col: 4, result: HIT },
    { row: 4, col: 5, result: HIT },
    { row: 4, col: 6, result: SUNK },
  ];
  for (let row = 0; row < 10; row += 1) {
    for (let col = 0; col < 10; col += 1) {
      if ((row + col) % 2 === 0 && !(row === 4 && (col === 4 || col === 6))) shots.push({ row, col, result: MISS });
    }
  }
  for (let seed = 1; seed <= 20; seed += 1) {
    const next = huntTargetShot(shots, createRng(seed));
    assert.ok(shots.slice(0, 3).some((hit) => isNeighbour(next, hit)), `seed ${seed}: ${JSON.stringify(next)}`);
  }
});

test('fills the whole board without repeating, then fails loudly', () => {
  const rng = createRng(11);
  const shots = [];
  for (let i = 0; i < 100; i += 1) shots.push({ ...huntTargetShot(shots, rng), result: MISS });
  assert.equal(new Set(shots.map((s) => `${s.row},${s.col}`)).size, 100);
  assert.throws(() => huntTargetShot(shots, rng), /No squares left/);
});

test('sinks every random fleet within 100 shots without repeating a square (500 seeds)', () => {
  for (let seed = 1; seed <= 500; seed += 1) {
    const board = randomFleet(ROYAL_NAVY_FLEET, createRng(seed));
    const shots = playOut(board, createRng(seed + 10000));
    assert.equal(new Set(shots.map((s) => `${s.row},${s.col}`)).size, shots.length, `seed ${seed}`);
    assert.ok(shots.length <= 100, `seed ${seed}: ${shots.length} shots`);
  }
});

test('the same seed gives the same sequence of shots', () => {
  const board = randomFleet(ROYAL_NAVY_FLEET, createRng(42));
  assert.deepEqual(playOut(board, createRng(7)), playOut(board, createRng(7)));
});

const cellKey = ({ row, col }) => `${row},${col}`;

function fleetAt(placements) {
  let board = createBoard();
  ROYAL_NAVY_FLEET.forEach((spec, i) => {
    const [row, col, orientation] = placements[i];
    const result = placeShip(board, spec, row, col, orientation);
    if (!result.ok) throw new Error(`could not place ${spec.name}`);
    board = result.board;
  });
  return board;
}

// Ships in the order Victory 5, Sovereign 4, Vanguard 3, Defiance 3, Swift 2.
const END_TO_END_ROWS = fleetAt([[2, 0, HORIZONTAL], [2, 5, HORIZONTAL], [0, 2, HORIZONTAL], [0, 5, HORIZONTAL], [0, 0, HORIZONTAL]]);
const END_TO_END_COLUMNS = fleetAt([[0, 2, VERTICAL], [5, 2, VERTICAL], [2, 0, VERTICAL], [5, 0, VERTICAL], [0, 0, VERTICAL]]);
const SIDE_BY_SIDE = rowsFleet(ROYAL_NAVY_FLEET);

// Plays a whole game, announcing each sunk ship's length the way the game announces
// the sunk ship. The board is used only to score shots and to check the strategy.
function playOutAnnounced(board, rng) {
  const shots = [];
  const hits = new Set();
  const lapses = [];
  const total = board.ships.reduce((n, s) => n + s.cells.length, 0);
  while (hits.size < total) {
    const unresolved = board.ships.some((s) => s.cells.some((c) => hits.has(cellKey(c))) && !s.cells.every((c) => hits.has(cellKey(c))));
    const shot = huntTargetShot(shots, rng);
    if (unresolved && !shots.some((s) => s.result !== MISS && isNeighbour(s, shot))) lapses.push(shots.length + 1);
    const result = resolve(board, shot, hits);
    const entry = { row: shot.row, col: shot.col, result };
    if (result === SUNK) entry.sunkLength = board.ships.find((s) => s.cells.some((c) => cellKey(c) === cellKey(shot))).cells.length;
    shots.push(entry);
    if (shots.length > 100) throw new Error('more than 100 shots');
  }
  return { shots, lapses };
}

test('a hit on a ship touching end to end is still chased after its neighbour sinks (D21)', () => {
  // Swift at A1-A2 touches Vanguard at A3-A5. A3 hits Vanguard; A2 and A1 sink Swift.
  const shots = [
    { row: 0, col: 2, result: HIT },
    { row: 0, col: 1, result: HIT },
    { row: 0, col: 0, result: SUNK, sunkLength: 2 },
  ];
  for (let seed = 1; seed <= 30; seed += 1) {
    const next = huntTargetShot(shots, createRng(seed));
    assert.ok(isNeighbour(next, { row: 0, col: 2 }), `seed ${seed}: ${JSON.stringify(next)}`);
  }
});

test('when a sinking could be either of two lines, neither hit is written off', () => {
  // Swift at A1-B1 (vertical) touches a ship at A2. A2 and B1 hit, then A1 sinks Swift.
  const shots = [
    { row: 0, col: 1, result: HIT },
    { row: 1, col: 0, result: HIT },
    { row: 0, col: 0, result: SUNK, sunkLength: 2 },
  ];
  for (let seed = 1; seed <= 30; seed += 1) {
    const next = huntTargetShot(shots, createRng(seed));
    assert.ok(isNeighbour(next, shots[0]) || isNeighbour(next, shots[1]), `seed ${seed}: ${JSON.stringify(next)}`);
  }
});

test('touching fleets: never goes back to hunting while a hit ship is still afloat, never repeats a square', () => {
  const layouts = { 'end to end in rows': END_TO_END_ROWS, 'end to end in columns': END_TO_END_COLUMNS, 'side by side': SIDE_BY_SIDE };
  for (const [name, board] of Object.entries(layouts)) {
    for (let seed = 1; seed <= 200; seed += 1) {
      const { shots, lapses } = playOutAnnounced(board, createRng(seed));
      assert.deepEqual(lapses, [], `${name}, seed ${seed}: hunted at shot(s) ${lapses.join(', ')} with a hit ship afloat`);
      assert.equal(new Set(shots.map(cellKey)).size, shots.length, `${name}, seed ${seed}: repeated a square`);
    }
  }
});

test('random fleets: never goes back to hunting while a hit ship is still afloat, never repeats a square (500 seeds)', () => {
  for (let seed = 1; seed <= 500; seed += 1) {
    const board = randomFleet(ROYAL_NAVY_FLEET, createRng(seed));
    const { shots, lapses } = playOutAnnounced(board, createRng(seed + 10000));
    assert.deepEqual(lapses, [], `seed ${seed}: hunted at shot(s) ${lapses.join(', ')} with a hit ship afloat`);
    assert.equal(new Set(shots.map(cellKey)).size, shots.length, `seed ${seed}: repeated a square`);
  }
});
