import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROYAL_NAVY_FLEET, FRANCO_SPANISH_FLEET } from '../src/engine.js';
import {
  ROYAL_NAVY,
  FRANCO_SPANISH,
  MISS,
  HIT,
  SUNK,
  createGame,
  fire,
  shotsBy,
  sunkShips,
} from '../src/game.js';
import { rowsFleet, shipSquares, openWater } from './helpers.js';

const royal = rowsFleet(ROYAL_NAVY_FLEET);
const enemy = rowsFleet(FRANCO_SPANISH_FLEET);

function mustFire(game, shooter, row, col) {
  const outcome = fire(game, shooter, row, col);
  assert.equal(outcome.ok, true, `expected ${shooter} at ${row},${col} to be accepted (${outcome.reason})`);
  return outcome;
}

test('Royal Navy fires first and the Franco-Spanish Fleet cannot fire out of turn', () => {
  const game = createGame(royal, enemy);
  assert.equal(game.turn, ROYAL_NAVY);
  assert.deepEqual(fire(game, FRANCO_SPANISH, 9, 9), { ok: false, reason: 'not-your-turn' });
});

test('turns alternate after every valid shot, including hits', () => {
  let game = createGame(royal, enemy);
  game = mustFire(game, ROYAL_NAVY, 0, 0).game;
  assert.equal(game.turn, FRANCO_SPANISH, 'a hit still passes the turn');
  assert.deepEqual(fire(game, ROYAL_NAVY, 0, 1), { ok: false, reason: 'not-your-turn' });
  game = mustFire(game, FRANCO_SPANISH, 9, 9).game;
  assert.equal(game.turn, ROYAL_NAVY, 'a miss passes the turn');
  game = mustFire(game, ROYAL_NAVY, 9, 9).game;
  assert.equal(game.turn, FRANCO_SPANISH);
});

test('shots resolve as hit or miss, and sunk on the last square of a ship with its name', () => {
  let game = createGame(royal, enemy);
  const miss = mustFire(game, ROYAL_NAVY, 9, 0);
  assert.equal(miss.shot.result, MISS);
  assert.equal(miss.shot.coord, 'J1');
  game = mustFire(miss.game, FRANCO_SPANISH, 9, 9).game;

  const hit = mustFire(game, ROYAL_NAVY, 4, 0);
  assert.equal(hit.shot.result, HIT);
  assert.equal(hit.shot.sunkShip, null, 'a hit does not reveal the ship name');
  game = mustFire(hit.game, FRANCO_SPANISH, 9, 8).game;

  const sunk = mustFire(game, ROYAL_NAVY, 4, 1);
  assert.equal(sunk.shot.result, SUNK);
  assert.equal(sunk.shot.sunkShip, 'Argonaute');
  assert.deepEqual(sunkShips(sunk.game, FRANCO_SPANISH).map((s) => s.name), ['Argonaute']);
  assert.equal(sunk.game.winner, null);
});

test('a repeated shot is rejected and does not use up the turn', () => {
  let game = createGame(royal, enemy);
  game = mustFire(game, ROYAL_NAVY, 0, 0).game;
  game = mustFire(game, FRANCO_SPANISH, 5, 5).game;
  const before = game;
  const repeat = fire(game, ROYAL_NAVY, 0, 0);
  assert.deepEqual(repeat, { ok: false, reason: 'repeat', coord: 'A1' });
  assert.equal(game, before);
  assert.equal(game.turn, ROYAL_NAVY);
  assert.equal(game.history.length, 2);
  game = mustFire(game, ROYAL_NAVY, 0, 1).game;
  assert.equal(game.turn, FRANCO_SPANISH);
  assert.equal(fire(game, FRANCO_SPANISH, 5, 5).reason, 'repeat');
  assert.equal(game.turn, FRANCO_SPANISH, 'the computer keeps its turn too');
});

test('off-board shots are rejected without using the turn', () => {
  const game = createGame(royal, enemy);
  assert.equal(fire(game, ROYAL_NAVY, 10, 0).reason, 'off-board');
  assert.equal(fire(game, ROYAL_NAVY, 0, -1).reason, 'off-board');
  assert.equal(game.turn, ROYAL_NAVY);
});

test('fire never changes the previous game state', () => {
  const game = createGame(royal, enemy);
  const snapshot = JSON.stringify(game);
  mustFire(game, ROYAL_NAVY, 0, 0);
  assert.equal(JSON.stringify(game), snapshot);
});

test('shot history records every valid shot in order with shooter and result', () => {
  let game = createGame(royal, enemy);
  game = mustFire(game, ROYAL_NAVY, 0, 0).game;
  game = mustFire(game, FRANCO_SPANISH, 0, 0).game;
  game = mustFire(game, ROYAL_NAVY, 9, 9).game;
  assert.deepEqual(
    game.history.map((s) => [s.number, s.shooter, s.coord, s.result]),
    [[1, ROYAL_NAVY, 'A1', HIT], [2, FRANCO_SPANISH, 'A1', HIT], [3, ROYAL_NAVY, 'J10', MISS]],
  );
  assert.equal(shotsBy(game, ROYAL_NAVY).length, 2);
});

function playOut(winnerSide) {
  const targets = shipSquares(winnerSide === ROYAL_NAVY ? enemy : royal);
  const misses = openWater(winnerSide === ROYAL_NAVY ? royal : enemy);
  let game = createGame(royal, enemy);
  let last = null;
  for (let i = 0; i < targets.length; i += 1) {
    const royalShot = winnerSide === ROYAL_NAVY ? targets[i] : misses[i];
    last = mustFire(game, ROYAL_NAVY, royalShot.row, royalShot.col);
    game = last.game;
    if (game.winner) break;
    const enemyShot = winnerSide === FRANCO_SPANISH ? targets[i] : misses[i];
    last = mustFire(game, FRANCO_SPANISH, enemyShot.row, enemyShot.col);
    game = last.game;
    if (game.winner) break;
  }
  return last;
}

test('Royal Navy wins when its final shot sinks the last enemy ship', () => {
  const last = playOut(ROYAL_NAVY);
  assert.equal(last.shot.shooter, ROYAL_NAVY);
  assert.equal(last.shot.result, SUNK);
  assert.equal(last.shot.sunkShip, 'Argonaute');
  assert.equal(last.game.winner, ROYAL_NAVY);
  assert.equal(last.game.turn, null);
  assert.equal(shotsBy(last.game, ROYAL_NAVY).length, 17);
  assert.equal(shotsBy(last.game, FRANCO_SPANISH).length, 16, 'the computer does not get a reply after the final shot');
  assert.equal(sunkShips(last.game, FRANCO_SPANISH).length, 5);
});

test('Franco-Spanish Fleet wins when its final shot sinks the last Royal Navy ship', () => {
  const last = playOut(FRANCO_SPANISH);
  assert.equal(last.shot.shooter, FRANCO_SPANISH);
  assert.equal(last.shot.result, SUNK);
  assert.equal(last.shot.sunkShip, 'Swift');
  assert.equal(last.game.winner, FRANCO_SPANISH);
  assert.equal(last.game.turn, null);
  assert.equal(shotsBy(last.game, FRANCO_SPANISH).length, 17);
});

test('no shots from either side are accepted after the game ends', () => {
  for (const winner of [ROYAL_NAVY, FRANCO_SPANISH]) {
    const { game } = playOut(winner);
    assert.deepEqual(fire(game, ROYAL_NAVY, 9, 9), { ok: false, reason: 'game-over' });
    assert.deepEqual(fire(game, FRANCO_SPANISH, 9, 9), { ok: false, reason: 'game-over' });
  }
});
