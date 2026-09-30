import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BOARD_SIZE,
  HORIZONTAL,
  VERTICAL,
  ROYAL_NAVY_FLEET,
  FRANCO_SPANISH_FLEET,
  coordLabel,
  createBoard,
  shipCells,
  shipAt,
  validatePlacement,
  placeShip,
  nextUnplacedShip,
  isFleetComplete,
  validateFleet,
  randomFleet,
} from '../src/engine.js';
import { createRng } from '../src/rng.js';

const [victory, sovereign, vanguard, defiance, swift] = ROYAL_NAVY_FLEET;

function mustPlace(board, spec, row, col, orientation) {
  const result = placeShip(board, spec, row, col, orientation);
  assert.equal(result.ok, true, `expected ${spec.name} at ${coordLabel(row, col)} ${orientation} to be legal`);
  return result.board;
}

test('board is 10 by 10', () => {
  assert.equal(BOARD_SIZE, 10);
});

test('Royal Navy fleet: Victory 5, Sovereign 4, Vanguard 3, Defiance 3, Swift 2', () => {
  assert.deepEqual(
    ROYAL_NAVY_FLEET.map((s) => [s.name, s.length]),
    [['Victory', 5], ['Sovereign', 4], ['Vanguard', 3], ['Defiance', 3], ['Swift', 2]],
  );
});

test('Franco-Spanish fleet has five distinct names with lengths 5, 4, 3, 3, 2', () => {
  assert.deepEqual(FRANCO_SPANISH_FLEET.map((s) => s.length), [5, 4, 3, 3, 2]);
  assert.equal(new Set(FRANCO_SPANISH_FLEET.map((s) => s.name)).size, 5);
  assert.equal(new Set(FRANCO_SPANISH_FLEET.map((s) => s.id)).size, 5);
});

test('coordinates are labelled A-J by 1-10', () => {
  assert.equal(coordLabel(0, 0), 'A1');
  assert.equal(coordLabel(9, 9), 'J10');
  assert.equal(coordLabel(2, 4), 'C5');
});

test('shipCells extends right when horizontal and down when vertical', () => {
  assert.deepEqual(shipCells(1, 2, 3, HORIZONTAL), [{ row: 1, col: 2 }, { row: 1, col: 3 }, { row: 1, col: 4 }]);
  assert.deepEqual(shipCells(1, 2, 3, VERTICAL), [{ row: 1, col: 2 }, { row: 2, col: 2 }, { row: 3, col: 2 }]);
});

test('ships that fit exactly against the edge are legal', () => {
  assert.equal(validatePlacement(createBoard(), victory, 0, 5, HORIZONTAL).ok, true);
  assert.equal(validatePlacement(createBoard(), victory, 5, 0, VERTICAL).ok, true);
  assert.equal(validatePlacement(createBoard(), swift, 9, 8, HORIZONTAL).ok, true);
});

test('ships cannot extend off the board', () => {
  const board = createBoard();
  const cases = [
    [victory, 0, 6, HORIZONTAL],
    [victory, 6, 0, VERTICAL],
    [swift, 9, 9, HORIZONTAL],
    [swift, 9, 9, VERTICAL],
    [swift, -1, 0, HORIZONTAL],
    [swift, 0, -1, VERTICAL],
    [swift, 10, 0, HORIZONTAL],
    [swift, 0, 10, VERTICAL],
  ];
  for (const [spec, row, col, orientation] of cases) {
    const result = validatePlacement(board, spec, row, col, orientation);
    assert.equal(result.ok, false, `${spec.name} at ${row},${col} ${orientation}`);
    assert.equal(result.reason, 'off-board');
  }
});

test('non-integer coordinates are rejected', () => {
  assert.equal(validatePlacement(createBoard(), swift, 1.5, 0, HORIZONTAL).ok, false);
});

test('unknown orientation is rejected', () => {
  assert.equal(validatePlacement(createBoard(), swift, 0, 0, 'diagonal').reason, 'bad-orientation');
});

test('ships cannot overlap, including crossing at a single square', () => {
  let board = mustPlace(createBoard(), victory, 2, 0, HORIZONTAL);
  const crossing = validatePlacement(board, sovereign, 0, 3, VERTICAL);
  assert.equal(crossing.ok, false);
  assert.equal(crossing.reason, 'overlap');
  assert.equal(crossing.overlapsWith, 'Victory');
  const sameRow = validatePlacement(board, swift, 2, 4, HORIZONTAL);
  assert.equal(sameRow.reason, 'overlap');
});

test('touching ships are allowed (side by side, end to end, and diagonal)', () => {
  let board = mustPlace(createBoard(), victory, 0, 0, HORIZONTAL);
  board = mustPlace(board, sovereign, 1, 0, HORIZONTAL);
  board = mustPlace(board, vanguard, 0, 5, HORIZONTAL);
  board = mustPlace(board, defiance, 2, 4, VERTICAL);
  board = mustPlace(board, swift, 5, 5, HORIZONTAL);
  assert.equal(board.ships.length, 5);
});

test('the same ship cannot be placed twice', () => {
  const board = mustPlace(createBoard(), swift, 0, 0, HORIZONTAL);
  assert.equal(validatePlacement(board, swift, 5, 5, HORIZONTAL).reason, 'already-placed');
});

test('placeShip does not modify the original board and rejects without changes', () => {
  const empty = createBoard();
  const placed = mustPlace(empty, victory, 0, 0, HORIZONTAL);
  assert.equal(empty.ships.length, 0);
  assert.equal(placed.ships.length, 1);
  const rejected = placeShip(placed, sovereign, 0, 0, VERTICAL);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.board, undefined);
  assert.equal(placed.ships.length, 1);
});

test('shipAt finds the ship occupying a square', () => {
  const board = mustPlace(createBoard(), vanguard, 4, 4, VERTICAL);
  assert.equal(shipAt(board, 6, 4)?.name, 'Vanguard');
  assert.equal(shipAt(board, 7, 4), null);
});

test('manual placement order and completion tracking', () => {
  let board = createBoard();
  assert.equal(nextUnplacedShip(board, ROYAL_NAVY_FLEET).name, 'Victory');
  assert.equal(isFleetComplete(board, ROYAL_NAVY_FLEET), false);
  board = mustPlace(board, victory, 0, 0, HORIZONTAL);
  board = mustPlace(board, sovereign, 1, 0, HORIZONTAL);
  board = mustPlace(board, vanguard, 2, 0, HORIZONTAL);
  board = mustPlace(board, defiance, 3, 0, HORIZONTAL);
  assert.equal(nextUnplacedShip(board, ROYAL_NAVY_FLEET).name, 'Swift');
  assert.equal(isFleetComplete(board, ROYAL_NAVY_FLEET), false);
  board = mustPlace(board, swift, 4, 0, HORIZONTAL);
  assert.equal(nextUnplacedShip(board, ROYAL_NAVY_FLEET), null);
  assert.equal(isFleetComplete(board, ROYAL_NAVY_FLEET), true);
});

function assertLegalFleet(board, fleet) {
  assert.equal(board.ships.length, fleet.length);
  const seen = new Set();
  for (const spec of fleet) {
    const ship = board.ships.find((s) => s.id === spec.id);
    assert.ok(ship, `${spec.name} missing`);
    assert.equal(ship.cells.length, spec.length);
    for (const { row, col } of ship.cells) {
      assert.ok(row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE, `${spec.name} off board`);
      const key = `${row},${col}`;
      assert.ok(!seen.has(key), `overlap at ${key}`);
      seen.add(key);
    }
  }
  assert.equal(seen.size, 17);
}

test('random placement always produces a legal fleet (1,000 seeds per fleet)', () => {
  for (let seed = 1; seed <= 1000; seed += 1) {
    const royal = randomFleet(ROYAL_NAVY_FLEET, createRng(seed));
    const enemy = randomFleet(FRANCO_SPANISH_FLEET, createRng(seed));
    assertLegalFleet(royal, ROYAL_NAVY_FLEET);
    assertLegalFleet(enemy, FRANCO_SPANISH_FLEET);
    assert.equal(validateFleet(royal, ROYAL_NAVY_FLEET).ok, true);
    assert.equal(validateFleet(enemy, FRANCO_SPANISH_FLEET).ok, true);
  }
});

test('random placement is reproducible with the same seed and varies across seeds', () => {
  const a = randomFleet(ROYAL_NAVY_FLEET, createRng(42));
  const b = randomFleet(ROYAL_NAVY_FLEET, createRng(42));
  assert.deepEqual(a, b);
  const layouts = new Set();
  for (let seed = 1; seed <= 50; seed += 1) {
    layouts.add(JSON.stringify(randomFleet(ROYAL_NAVY_FLEET, createRng(seed)).ships.map((s) => s.cells)));
  }
  assert.ok(layouts.size > 45, `expected varied layouts, got ${layouts.size} distinct of 50`);
});

test('random placement uses both orientations', () => {
  const orientations = new Set();
  for (let seed = 1; seed <= 20; seed += 1) {
    for (const ship of randomFleet(ROYAL_NAVY_FLEET, createRng(seed)).ships) orientations.add(ship.orientation);
  }
  assert.deepEqual([...orientations].sort(), [HORIZONTAL, VERTICAL]);
});

test('a full fleet can be placed flush against all four edges and is valid', () => {
  let board = mustPlace(createBoard(), victory, 0, 2, HORIZONTAL); // top edge A3-A7
  board = mustPlace(board, sovereign, 9, 6, HORIZONTAL); // bottom edge J7-J10
  board = mustPlace(board, vanguard, 3, 0, VERTICAL); // left edge D1-F1
  board = mustPlace(board, defiance, 4, 9, VERTICAL); // right edge E10-G10
  board = mustPlace(board, swift, 5, 4, HORIZONTAL);
  assert.deepEqual(validateFleet(board, ROYAL_NAVY_FLEET), { ok: true });
});

test('rotating near a corner: legal one way, refused the other way', () => {
  const empty = createBoard();
  assert.equal(validatePlacement(empty, victory, 9, 0, HORIZONTAL).ok, true); // J1-J5
  assert.equal(validatePlacement(empty, victory, 9, 0, VERTICAL).reason, 'off-board');
  assert.equal(validatePlacement(empty, victory, 0, 9, VERTICAL).ok, true); // A10-E10
  assert.equal(validatePlacement(empty, victory, 0, 9, HORIZONTAL).reason, 'off-board');
  assert.equal(validatePlacement(empty, swift, 9, 9, HORIZONTAL).reason, 'off-board');
  assert.equal(validatePlacement(empty, swift, 9, 9, VERTICAL).reason, 'off-board');
  assert.equal(validatePlacement(empty, swift, 8, 8, HORIZONTAL).ok, true);
  assert.equal(validatePlacement(empty, swift, 8, 8, VERTICAL).ok, true);
});

function legalRoyalFleet() {
  return randomFleet(ROYAL_NAVY_FLEET, createRng(7));
}

function withShip(board, id, changes) {
  return { ships: board.ships.map((ship) => (ship.id === id ? { ...ship, ...changes } : ship)) };
}

test('Start check: an incomplete fleet is not valid', () => {
  const board = mustPlace(createBoard(), victory, 0, 0, HORIZONTAL);
  const result = validateFleet(board, ROYAL_NAVY_FLEET);
  assert.equal(result.ok, false);
  assert.equal(result.problems.length, 4);
  assert.equal(validateFleet(createBoard(), ROYAL_NAVY_FLEET).ok, false);
});

test('Start check: wrong ship lengths are not valid', () => {
  const board = legalRoyalFleet();
  const swiftShip = board.ships.find((s) => s.id === 'swift');
  const shortened = withShip(board, 'swift', { length: 1, cells: swiftShip.cells.slice(0, 1) });
  assert.deepEqual(validateFleet(shortened, ROYAL_NAVY_FLEET).problems, ['Swift must be 2 squares long']);
  const mislabelled = withShip(board, 'swift', { length: 3 });
  assert.equal(validateFleet(mislabelled, ROYAL_NAVY_FLEET).ok, false);
});

test('Start check: ships off the board, overlapping, broken or bent are not valid', () => {
  const base = { ships: [] };
  const fleet = [victory, swift];
  const victoryShip = { id: 'victory', name: 'Victory', length: 5, orientation: HORIZONTAL, cells: shipCells(0, 0, 5, HORIZONTAL) };
  const ok = { ships: [victoryShip, { id: 'swift', name: 'Swift', length: 2, orientation: VERTICAL, cells: shipCells(1, 0, 2, VERTICAL) }] };
  assert.equal(validateFleet(ok, fleet).ok, true);
  const offBoard = { ships: [victoryShip, { id: 'swift', name: 'Swift', length: 2, orientation: VERTICAL, cells: shipCells(9, 9, 2, VERTICAL) }] };
  assert.deepEqual(validateFleet(offBoard, fleet).problems, ['Swift runs off the board']);
  const overlap = { ships: [victoryShip, { id: 'swift', name: 'Swift', length: 2, orientation: VERTICAL, cells: shipCells(0, 2, 2, VERTICAL) }] };
  assert.deepEqual(validateFleet(overlap, fleet).problems, ['Swift overlaps Victory at A3']);
  const gap = { ships: [victoryShip, { id: 'swift', name: 'Swift', length: 2, orientation: HORIZONTAL, cells: [{ row: 5, col: 0 }, { row: 5, col: 2 }] }] };
  assert.deepEqual(validateFleet(gap, fleet).problems, ['Swift must be one straight, unbroken line']);
  const bent = { ships: [victoryShip, { id: 'swift', name: 'Swift', length: 2, orientation: 'diagonal', cells: [{ row: 5, col: 0 }, { row: 6, col: 1 }] }] };
  assert.equal(validateFleet(bent, fleet).ok, false);
  assert.equal(validateFleet(base, fleet).ok, false);
});

test('Start check: duplicate or foreign ships are not valid', () => {
  const board = legalRoyalFleet();
  const swiftShip = board.ships.find((s) => s.id === 'swift');
  const duplicated = { ships: [...board.ships, swiftShip] };
  assert.ok(validateFleet(duplicated, ROYAL_NAVY_FLEET).problems.includes('Swift is placed more than once'));
  const foreign = { ships: [...board.ships, { ...randomFleet(FRANCO_SPANISH_FLEET, createRng(1)).ships[0] }] };
  assert.ok(validateFleet(foreign, ROYAL_NAVY_FLEET).problems.includes('Santísima Trinidad is not part of this fleet'));
});
