import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROYAL_NAVY_FLEET, FRANCO_SPANISH_FLEET, randomFleet } from '../src/engine.js';
import { ROYAL_NAVY, FRANCO_SPANISH, SUNK, shotsBy } from '../src/game.js';
import { createBattle, COMPUTER_DELAY_MS } from '../src/battle.js';
import { randomShot } from '../src/opponent.js';
import { createRng } from '../src/rng.js';
import { rowsFleet, shipSquares, openWater, fakeClock } from './helpers.js';

const royal = rowsFleet(ROYAL_NAVY_FLEET);
const enemy = rowsFleet(FRANCO_SPANISH_FLEET);

function newBattle(clock, options = {}) {
  return createBattle({
    royalNavy: royal,
    francoSpanish: enemy,
    rng: createRng(1),
    schedule: clock.schedule,
    cancel: clock.cancel,
    ...options,
  });
}

test('after a valid player shot the computer fires once, after the delay', () => {
  const clock = fakeClock();
  const replies = [];
  const battle = newBattle(clock, { onComputerShot: (o) => replies.push(o) });
  assert.equal(battle.playerFire(9, 9).ok, true);
  assert.equal(battle.game.turn, FRANCO_SPANISH);
  assert.equal(battle.computerPending, true);
  clock.advance(COMPUTER_DELAY_MS - 1);
  assert.equal(replies.length, 0, 'no reply before the delay');
  clock.advance(1);
  assert.equal(replies.length, 1);
  assert.equal(battle.game.turn, ROYAL_NAVY);
  assert.equal(battle.computerPending, false);
});

test('rapid double clicks: the second click is rejected during the computer turn', () => {
  const clock = fakeClock();
  const battle = newBattle(clock);
  assert.equal(battle.playerFire(9, 9).ok, true);
  assert.deepEqual(battle.playerFire(9, 8), { ok: false, reason: 'not-your-turn' });
  assert.deepEqual(battle.playerFire(9, 9), { ok: false, reason: 'not-your-turn' });
  assert.equal(shotsBy(battle.game, ROYAL_NAVY).length, 1);
  assert.equal(clock.pending, 1, 'exactly one computer move is queued');
  clock.advance(COMPUTER_DELAY_MS);
  assert.equal(shotsBy(battle.game, FRANCO_SPANISH).length, 1);
  assert.equal(clock.pending, 0);
});

test('a rejected repeat shot does not queue a computer move', () => {
  const clock = fakeClock();
  const battle = newBattle(clock);
  battle.playerFire(9, 9);
  clock.advance(COMPUTER_DELAY_MS);
  assert.equal(battle.playerFire(9, 9).reason, 'repeat');
  assert.equal(clock.pending, 0);
  assert.equal(battle.game.turn, ROYAL_NAVY);
});

test('restart during the computer delay cancels its pending move', () => {
  const clock = fakeClock();
  const replies = [];
  const battle = newBattle(clock, { onComputerShot: (o) => replies.push(o) });
  battle.playerFire(9, 9);
  clock.advance(COMPUTER_DELAY_MS / 2);
  battle.dispose();
  assert.equal(clock.pending, 0, 'the timer is cancelled');
  clock.advance(COMPUTER_DELAY_MS * 10);
  assert.equal(replies.length, 0);
  assert.equal(shotsBy(battle.game, FRANCO_SPANISH).length, 0);
  assert.equal(battle.playerFire(8, 8).reason, 'game-over', 'the old battle accepts no more shots');
});

test('even if a cancelled timer still fires, the old battle does not move', () => {
  const clock = fakeClock({ honourCancel: false });
  const replies = [];
  const battle = newBattle(clock, { onComputerShot: (o) => replies.push(o) });
  battle.playerFire(9, 9);
  battle.dispose();
  clock.advance(COMPUTER_DELAY_MS);
  assert.equal(replies.length, 0);
  assert.equal(shotsBy(battle.game, FRANCO_SPANISH).length, 0);
});

test('a new battle after restart has no leftover shots, winner or pending move', () => {
  const clock = fakeClock();
  const oldReplies = [];
  const old = newBattle(clock, { onComputerShot: (o) => oldReplies.push(o) });
  old.playerFire(9, 9);
  old.dispose();
  const fresh = newBattle(clock);
  assert.deepEqual(fresh.game.history, []);
  assert.equal(fresh.game.turn, ROYAL_NAVY);
  assert.equal(fresh.game.winner, null);
  assert.equal(fresh.computerPending, false);
  assert.equal(fresh.playerFire(9, 9).ok, true, 'the same square can be fired at again in the new game');
  clock.advance(COMPUTER_DELAY_MS);
  assert.equal(oldReplies.length, 0);
  assert.equal(shotsBy(fresh.game, FRANCO_SPANISH).length, 1);
});

test('the computer is given only its own previous shots and results, never ship positions', () => {
  const clock = fakeClock();
  const seen = [];
  const battle = newBattle(clock, {
    chooseShot: (ownShots, rng) => {
      seen.push(structuredClone(ownShots));
      return randomShot(ownShots, rng);
    },
  });
  for (let i = 0; i < 3; i += 1) {
    battle.playerFire(9, i);
    clock.advance(COMPUTER_DELAY_MS);
  }
  assert.equal(seen.length, 3);
  assert.deepEqual(seen[0], []);
  assert.equal(seen[2].length, 2);
  for (const shot of seen.flat()) {
    assert.deepEqual(Object.keys(shot).sort(), ['col', 'result', 'row']);
  }
});

test('Royal Navy win: the final shot ends the game and no computer reply is queued', () => {
  const clock = fakeClock();
  const battle = newBattle(clock, { chooseShot: (own) => openWater(royal)[own.length] });
  const targets = shipSquares(enemy);
  let last;
  for (const { row, col } of targets) {
    last = battle.playerFire(row, col);
    assert.equal(last.ok, true);
    clock.advance(COMPUTER_DELAY_MS);
  }
  assert.equal(last.shot.result, SUNK);
  assert.equal(battle.game.winner, ROYAL_NAVY);
  assert.equal(battle.computerPending, false);
  assert.equal(clock.pending, 0);
  assert.equal(shotsBy(battle.game, FRANCO_SPANISH).length, 16);
  assert.equal(battle.playerFire(9, 9).reason, 'game-over');
});

test('Franco-Spanish win: the computer final shot ends the game and the player cannot fire', () => {
  const clock = fakeClock();
  const targets = shipSquares(royal);
  const finals = [];
  const battle = newBattle(clock, {
    chooseShot: (own) => targets[own.length],
    onComputerShot: (o) => finals.push(o),
  });
  const misses = openWater(enemy);
  for (let i = 0; i < targets.length; i += 1) {
    assert.equal(battle.playerFire(misses[i].row, misses[i].col).ok, true);
    clock.advance(COMPUTER_DELAY_MS);
  }
  const last = finals.at(-1);
  assert.equal(last.shot.shooter, FRANCO_SPANISH);
  assert.equal(last.shot.result, SUNK);
  assert.equal(last.shot.sunkShip, 'Swift');
  assert.equal(battle.game.winner, FRANCO_SPANISH);
  assert.equal(clock.pending, 0);
  assert.equal(battle.playerFire(9, 9).reason, 'game-over');
});

function seededGame(seed) {
  const rng = createRng(seed);
  const clock = fakeClock();
  const battle = createBattle({
    royalNavy: randomFleet(ROYAL_NAVY_FLEET, rng),
    francoSpanish: randomFleet(FRANCO_SPANISH_FLEET, rng),
    rng,
    schedule: clock.schedule,
    cancel: clock.cancel,
  });
  for (let row = 0; row < 10 && !battle.game.winner; row += 1) {
    for (let col = 0; col < 10 && !battle.game.winner; col += 1) {
      assert.equal(battle.playerFire(row, col).ok, true);
      clock.advance(COMPUTER_DELAY_MS);
    }
  }
  return battle;
}

test('seeded full games with the random opponent always finish, and repeat exactly', () => {
  for (let seed = 1; seed <= 25; seed += 1) {
    const battle = seededGame(seed);
    assert.ok(battle.game.winner === ROYAL_NAVY || battle.game.winner === FRANCO_SPANISH, `seed ${seed} finished`);
    const coords = battle.game.history.filter((s) => s.shooter === FRANCO_SPANISH).map((s) => s.coord);
    assert.equal(new Set(coords).size, coords.length, `seed ${seed}: computer never repeats a square`);
    assert.deepEqual(seededGame(seed).game.history, battle.game.history, `seed ${seed} is reproducible`);
  }
});

test('randomShot picks only squares not yet tried, and fails loudly when none are left', () => {
  const rng = createRng(7);
  const shots = [];
  for (let i = 0; i < 100; i += 1) shots.push({ ...randomShot(shots, rng), result: 'miss' });
  assert.equal(new Set(shots.map((s) => `${s.row},${s.col}`)).size, 100);
  assert.throws(() => randomShot(shots, rng), /No squares left/);
});
