import { HORIZONTAL, createBoard, placeShip } from '../src/engine.js';

export function rowsFleet(fleet) {
  let board = createBoard();
  fleet.forEach((spec, row) => {
    const result = placeShip(board, spec, row, 0, HORIZONTAL);
    if (!result.ok) throw new Error(`could not place ${spec.name}`);
    board = result.board;
  });
  return board;
}

export function shipSquares(board) {
  return board.ships.flatMap((ship) => ship.cells);
}

export function openWater(board) {
  const taken = new Set(shipSquares(board).map((c) => `${c.row},${c.col}`));
  const squares = [];
  for (let row = 0; row < 10; row += 1) {
    for (let col = 0; col < 10; col += 1) {
      if (!taken.has(`${row},${col}`)) squares.push({ row, col });
    }
  }
  return squares;
}

export function fakeClock({ honourCancel = true } = {}) {
  let now = 0;
  let nextId = 1;
  const timers = new Map();
  return {
    schedule(fn, ms) {
      const id = nextId;
      nextId += 1;
      timers.set(id, { fn, at: now + ms });
      return id;
    },
    cancel(id) {
      if (honourCancel) timers.delete(id);
    },
    advance(ms) {
      now += ms;
      const due = [...timers].filter(([, t]) => t.at <= now).sort((a, b) => a[1].at - b[1].at);
      for (const [id, t] of due) {
        timers.delete(id);
        t.fn();
      }
    },
    get pending() {
      return timers.size;
    },
  };
}
