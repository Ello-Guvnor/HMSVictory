import { coordLabel, isOnBoard, shipAt } from './engine.js';

export const ROYAL_NAVY = 'royal-navy';
export const FRANCO_SPANISH = 'franco-spanish';

export const MISS = 'miss';
export const HIT = 'hit';
export const SUNK = 'sunk';

export function opponentOf(side) {
  return side === ROYAL_NAVY ? FRANCO_SPANISH : ROYAL_NAVY;
}

export function createGame(royalNavyBoard, francoSpanishBoard) {
  return {
    boards: { [ROYAL_NAVY]: royalNavyBoard, [FRANCO_SPANISH]: francoSpanishBoard },
    turn: ROYAL_NAVY,
    winner: null,
    history: [],
  };
}

export function shotsBy(game, shooter) {
  return game.history.filter((shot) => shot.shooter === shooter);
}

export function shotAt(game, shooter, row, col) {
  return game.history.find((shot) => shot.shooter === shooter && shot.row === row && shot.col === col) ?? null;
}

export function isShipSunk(game, side, ship) {
  const shooter = opponentOf(side);
  return ship.cells.every((c) => shotAt(game, shooter, c.row, c.col) !== null);
}

export function sunkShips(game, side) {
  return game.boards[side].ships.filter((ship) => isShipSunk(game, side, ship));
}

export function isFleetSunk(game, side) {
  const { ships } = game.boards[side];
  return ships.length > 0 && ships.every((ship) => isShipSunk(game, side, ship));
}

export function fire(game, shooter, row, col) {
  if (game.winner) return { ok: false, reason: 'game-over' };
  if (shooter !== game.turn) return { ok: false, reason: 'not-your-turn' };
  if (!isOnBoard(row, col)) return { ok: false, reason: 'off-board' };
  if (shotAt(game, shooter, row, col)) return { ok: false, reason: 'repeat', coord: coordLabel(row, col) };

  const target = opponentOf(shooter);
  const ship = shipAt(game.boards[target], row, col);
  const shot = { number: game.history.length + 1, shooter, row, col, coord: coordLabel(row, col), result: ship ? HIT : MISS, sunkShip: null };
  const afterShot = { ...game, history: [...game.history, shot] };
  if (ship && isShipSunk(afterShot, target, ship)) {
    shot.result = SUNK;
    shot.sunkShip = ship.name;
  }
  Object.freeze(shot);
  const winner = isFleetSunk(afterShot, target) ? shooter : null;
  return {
    ok: true,
    shot,
    game: { ...afterShot, winner, turn: winner ? null : target },
  };
}
