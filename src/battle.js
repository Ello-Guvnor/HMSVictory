import { ROYAL_NAVY_FLEET } from './engine.js';
import { createGame, fire, shotsBy, ROYAL_NAVY, FRANCO_SPANISH, SUNK } from './game.js';
import { huntTargetShot } from './opponent.js';

export const COMPUTER_DELAY_MS = 800;

export function createBattle({
  royalNavy,
  francoSpanish,
  rng,
  schedule,
  cancel,
  chooseShot = huntTargetShot,
  delayMs = COMPUTER_DELAY_MS,
  onComputerShot = () => {},
}) {
  let game = createGame(royalNavy, francoSpanish);
  let timer = null;
  let disposed = false;

  function computerMove() {
    timer = null;
    if (disposed) return;
    const ownShots = shotsBy(game, FRANCO_SPANISH).map(({ row, col, result, sunkShip }) => (result === SUNK
      ? { row, col, result, sunkLength: ROYAL_NAVY_FLEET.find((spec) => spec.name === sunkShip).length }
      : { row, col, result }));
    const { row, col } = chooseShot(ownShots, rng);
    const outcome = fire(game, FRANCO_SPANISH, row, col);
    if (!outcome.ok) throw new Error(`Computer chose an illegal shot (${outcome.reason})`);
    game = outcome.game;
    onComputerShot(outcome);
  }

  function playerFire(row, col) {
    if (disposed) return { ok: false, reason: 'game-over' };
    const outcome = fire(game, ROYAL_NAVY, row, col);
    if (!outcome.ok) return outcome;
    game = outcome.game;
    if (!game.winner) timer = schedule(computerMove, delayMs);
    return outcome;
  }

  function dispose() {
    disposed = true;
    if (timer !== null) cancel(timer);
    timer = null;
  }

  return {
    playerFire,
    dispose,
    get game() { return game; },
    get computerPending() { return timer !== null; },
  };
}
