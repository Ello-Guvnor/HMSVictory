export const BOARD_SIZE = 10;
export const ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

export const HORIZONTAL = 'horizontal';
export const VERTICAL = 'vertical';

export const ROYAL_NAVY_FLEET = Object.freeze([
  { id: 'victory', name: 'Victory', length: 5 },
  { id: 'sovereign', name: 'Sovereign', length: 4 },
  { id: 'vanguard', name: 'Vanguard', length: 3 },
  { id: 'defiance', name: 'Defiance', length: 3 },
  { id: 'swift', name: 'Swift', length: 2 },
]);

export const FRANCO_SPANISH_FLEET = Object.freeze([
  { id: 'santisima-trinidad', name: 'Santísima Trinidad', length: 5 },
  { id: 'bucentaure', name: 'Bucentaure', length: 4 },
  { id: 'redoutable', name: 'Redoutable', length: 3 },
  { id: 'santa-ana', name: 'Santa Ana', length: 3 },
  { id: 'argonaute', name: 'Argonaute', length: 2 },
]);

export function coordLabel(row, col) {
  return `${ROW_LABELS[row]}${col + 1}`;
}

export function isOnBoard(row, col) {
  return Number.isInteger(row) && Number.isInteger(col) && row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function shipCells(row, col, length, orientation) {
  const cells = [];
  for (let i = 0; i < length; i += 1) {
    cells.push(orientation === VERTICAL ? { row: row + i, col } : { row, col: col + i });
  }
  return cells;
}

export function createBoard() {
  return { ships: [] };
}

export function shipAt(board, row, col) {
  return board.ships.find((ship) => ship.cells.some((c) => c.row === row && c.col === col)) ?? null;
}

export function validatePlacement(board, spec, row, col, orientation) {
  if (orientation !== HORIZONTAL && orientation !== VERTICAL) {
    return { ok: false, reason: 'bad-orientation' };
  }
  if (board.ships.some((ship) => ship.id === spec.id)) {
    return { ok: false, reason: 'already-placed' };
  }
  const cells = shipCells(row, col, spec.length, orientation);
  if (!cells.every((c) => isOnBoard(c.row, c.col))) {
    return { ok: false, reason: 'off-board', cells };
  }
  for (const c of cells) {
    const other = shipAt(board, c.row, c.col);
    if (other) {
      return { ok: false, reason: 'overlap', overlapsWith: other.name, cells };
    }
  }
  return { ok: true, cells };
}

export function placeShip(board, spec, row, col, orientation) {
  const result = validatePlacement(board, spec, row, col, orientation);
  if (!result.ok) {
    return result;
  }
  const ship = { id: spec.id, name: spec.name, length: spec.length, orientation, cells: result.cells };
  return { ok: true, ship, board: { ships: [...board.ships, ship] } };
}

export function nextUnplacedShip(board, fleet) {
  return fleet.find((spec) => !board.ships.some((ship) => ship.id === spec.id)) ?? null;
}

export function isFleetComplete(board, fleet) {
  return fleet.every((spec) => board.ships.some((ship) => ship.id === spec.id));
}

const MAX_ATTEMPTS_PER_SHIP = 500;
const MAX_RESTARTS = 50;

export function randomFleet(fleet, rng) {
  for (let restart = 0; restart < MAX_RESTARTS; restart += 1) {
    let board = createBoard();
    for (const spec of fleet) {
      let placed = false;
      for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_SHIP && !placed; attempt += 1) {
        const orientation = rng() < 0.5 ? HORIZONTAL : VERTICAL;
        const maxRow = orientation === VERTICAL ? BOARD_SIZE - spec.length : BOARD_SIZE - 1;
        const maxCol = orientation === HORIZONTAL ? BOARD_SIZE - spec.length : BOARD_SIZE - 1;
        const row = Math.floor(rng() * (maxRow + 1));
        const col = Math.floor(rng() * (maxCol + 1));
        const result = placeShip(board, spec, row, col, orientation);
        if (result.ok) {
          board = result.board;
          placed = true;
        }
      }
      if (!placed) break;
    }
    if (isFleetComplete(board, fleet)) {
      return board;
    }
  }
  throw new Error('Could not place fleet randomly');
}
