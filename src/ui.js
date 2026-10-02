import {
  BOARD_SIZE,
  ROW_LABELS,
  HORIZONTAL,
  VERTICAL,
  ROYAL_NAVY_FLEET,
  FRANCO_SPANISH_FLEET,
  coordLabel,
  createBoard,
  isOnBoard,
  shipAt,
  shipCells,
  validatePlacement,
  placeShip,
  nextUnplacedShip,
  validateFleet,
  randomFleet,
} from './engine.js';
import { ROYAL_NAVY, FRANCO_SPANISH, MISS, HIT, SUNK, shotAt, isShipSunk } from './game.js';
import { createBattle } from './battle.js';
import { createRng } from './rng.js';
import { ENEMY_NATIONS, flagSvg, shipProfileSvg, shipTopSvg } from './art.js';

const PLACEMENT = 'placement';
const BATTLE = 'battle';
const OVER = 'over';

const params = new URLSearchParams(window.location.search);
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const rng = createRng(Number.isFinite(seedParam) ? seedParam : Date.now());

const el = {
  playerBoard: document.getElementById('player-board'),
  enemyBoard: document.getElementById('enemy-board'),
  playerRoster: document.getElementById('player-roster'),
  enemyRoster: document.getElementById('enemy-roster'),
  status: document.getElementById('status'),
  turn: document.getElementById('turn'),
  log: document.getElementById('shot-log'),
  rotate: document.getElementById('rotate-btn'),
  random: document.getElementById('random-btn'),
  clear: document.getElementById('clear-btn'),
  start: document.getElementById('start-btn'),
  restart: document.getElementById('restart-btn'),
};

function freshState() {
  return {
    phase: PLACEMENT,
    player: createBoard(),
    enemy: randomFleet(FRANCO_SPANISH_FLEET, rng),
    orientation: HORIZONTAL,
    hover: null,
    focus: { row: 0, col: 0 },
    enemyFocus: { row: 0, col: 0 },
    inputMode: 'keyboard',
    pointerOverBoard: false,
  };
}

let state = freshState();
let battle = null;

document.getElementById('player-flags').innerHTML = flagSvg('white-ensign');
document.getElementById('enemy-flags').innerHTML = flagSvg('french') + flagSvg('spanish');

const playerCells = buildBoard(el.playerBoard, 'player');
const enemyCells = buildBoard(el.enemyBoard, 'enemy');

function buildBoard(container, side) {
  const cells = [];
  container.append(axisCell('', 1, 1));
  for (let col = 0; col < BOARD_SIZE; col += 1) container.append(axisCell(String(col + 1), 1, col + 2));
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    container.append(axisCell(ROW_LABELS[row], row + 2, 1));
    const rowCells = [];
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cell';
      button.dataset.row = String(row);
      button.dataset.col = String(col);
      button.dataset.side = side;
      button.tabIndex = -1;
      button.style.gridArea = `${row + 2} / ${col + 2}`;
      container.append(button);
      rowCells.push(button);
    }
    cells.push(rowCells);
  }
  return cells;
}

function axisCell(text, gridRow, gridColumn) {
  const div = document.createElement('div');
  div.className = 'axis';
  div.textContent = text;
  div.setAttribute('aria-hidden', 'true');
  div.style.gridArea = `${gridRow} / ${gridColumn}`;
  return div;
}

function setStatus(message, isError = false) {
  el.status.textContent = message;
  el.status.classList.toggle('error', isError);
}

function orientationWord(orientation) {
  return orientation === HORIZONTAL ? 'horizontal' : 'vertical';
}

function promptNextShip() {
  const next = nextUnplacedShip(state.player, ROYAL_NAVY_FLEET);
  if (next) {
    setStatus(`Place ${next.name} (${next.length} squares, ${orientationWord(state.orientation)}).`);
  } else {
    setStatus('Royal Navy Fleet ready. Press Start battle, or Clear fleet to rearrange.');
  }
}

function previewCells() {
  if (state.phase !== PLACEMENT || !state.hover) return null;
  const next = nextUnplacedShip(state.player, ROYAL_NAVY_FLEET);
  if (!next) return null;
  const { row, col } = state.hover;
  const result = validatePlacement(state.player, next, row, col, state.orientation);
  const cells = shipCells(row, col, next.length, state.orientation).filter((c) => isOnBoard(c.row, c.col));
  return { ok: result.ok, cells };
}

function describeRejection(spec, result) {
  if (result.reason === 'off-board') return `${spec.name} would run off the board there.`;
  if (result.reason === 'overlap') return `${spec.name} would overlap ${result.overlapsWith}.`;
  return `${spec.name} cannot be placed there.`;
}

function resultWord(result) {
  return result === MISS ? 'miss' : result === HIT ? 'hit' : 'hit, ship sunk';
}

function renderPlayerBoard() {
  const preview = previewCells();
  const previewKeys = new Set(preview ? preview.cells.map((c) => `${c.row},${c.col}`) : []);
  const next = nextUnplacedShip(state.player, ROYAL_NAVY_FLEET);
  const placing = state.phase === PLACEMENT && next !== null;
  const game = battle?.game ?? null;

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const button = playerCells[row][col];
      const ship = shipAt(state.player, row, col);
      const incoming = game ? shotAt(game, FRANCO_SPANISH, row, col) : null;
      button.className = 'cell';
      button.replaceChildren();
      let label = coordLabel(row, col);
      if (ship) {
        const index = ship.cells.findIndex((c) => c.row === row && c.col === col);
        button.classList.add('ship');
        label += `, ${ship.name}${index === 0 ? ' (bow)' : ''}`;
      } else {
        label += ', open water';
      }
      if (incoming) {
        const sunk = ship && isShipSunk(game, ROYAL_NAVY, ship);
        button.classList.add(incoming.result === MISS ? 'miss' : 'hit');
        if (sunk) button.classList.add('sunk');
        label += incoming.result === MISS ? ', enemy shot missed' : sunk ? ', hit, sunk' : ', hit';
      }
      if (previewKeys.has(`${row},${col}`)) {
        button.classList.add(preview.ok ? 'preview-ok' : 'preview-bad');
      }
      if (placing) {
        const check = validatePlacement(state.player, next, row, col, state.orientation);
        label += `. ${next.name} here, ${orientationWord(state.orientation)}: `;
        label += check.ok ? 'allowed' : `not allowed, ${describeRejection(next, check)}`;
      }
      button.setAttribute('aria-label', label);
      button.disabled = !placing;
      button.tabIndex = placing && row === state.focus.row && col === state.focus.col ? 0 : -1;
    }
  }
  renderShipArt(el.playerBoard, state.player.ships, () => 'royal');
}

const drawnShipKeys = new WeakMap();

function renderShipArt(boardEl, ships, nationOf) {
  const key = JSON.stringify(ships.map((ship) => [ship.id, ship.orientation, ship.cells[0]]));
  if (drawnShipKeys.get(boardEl) === key) return;
  drawnShipKeys.set(boardEl, key);
  boardEl.querySelectorAll('.ship-art').forEach((node) => node.remove());
  for (const ship of ships) {
    const { row, col } = ship.cells[0];
    const art = document.createElement('div');
    art.className = 'ship-art';
    art.setAttribute('aria-hidden', 'true');
    art.style.gridRow = `${row + 2} / span ${ship.orientation === VERTICAL ? ship.length : 1}`;
    art.style.gridColumn = `${col + 2} / span ${ship.orientation === HORIZONTAL ? ship.length : 1}`;
    art.innerHTML = shipTopSvg(ship.length, nationOf(ship), ship.orientation);
    boardEl.append(art);
  }
}

function renderEnemyBoard() {
  const game = battle?.game ?? null;
  const active = state.phase === BATTLE || state.phase === OVER;
  const holdFire = active && game.turn !== ROYAL_NAVY;
  const sunk = game ? state.enemy.ships.filter((ship) => isShipSunk(game, FRANCO_SPANISH, ship)) : [];
  el.enemyBoard.classList.toggle('waiting', holdFire);
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const button = enemyCells[row][col];
      const shot = game ? shotAt(game, ROYAL_NAVY, row, col) : null;
      const sunkShip = sunk.find((ship) => ship.cells.some((c) => c.row === row && c.col === col));
      button.className = 'cell';
      let label = coordLabel(row, col);
      if (sunkShip) {
        button.classList.add('hit', 'sunk', 'ship');
        label += `, hit, ${sunkShip.name} sunk`;
      } else if (shot) {
        button.classList.add(shot.result === MISS ? 'miss' : 'hit');
        label += `, ${resultWord(shot.result)}`;
      } else {
        label += ', unexplored';
      }
      button.setAttribute('aria-label', label);
      button.disabled = !active;
      button.setAttribute('aria-disabled', String(holdFire));
      button.tabIndex = active && row === state.enemyFocus.row && col === state.enemyFocus.col ? 0 : -1;
    }
  }
  renderShipArt(el.enemyBoard, sunk, (ship) => ENEMY_NATIONS[ship.id]);
}

function profile(length, nation) {
  const span = document.createElement('span');
  span.className = 'profile';
  span.innerHTML = shipProfileSvg(length, nation);
  return span;
}

function rosterItem(name, length, nation, stateText, classes) {
  const li = document.createElement('li');
  li.classList.add(...classes);
  const nameSpan = document.createElement('span');
  nameSpan.textContent = `${name} (${length})`;
  const stateSpan = document.createElement('span');
  stateSpan.className = 'ship-state';
  stateSpan.textContent = stateText;
  li.append(nameSpan, profile(length, nation), stateSpan);
  return li;
}

function renderRosters() {
  const game = battle?.game ?? null;
  const next = state.phase === PLACEMENT ? nextUnplacedShip(state.player, ROYAL_NAVY_FLEET) : null;
  el.playerRoster.replaceChildren(
    ...ROYAL_NAVY_FLEET.map((spec) => {
      const ship = state.player.ships.find((s) => s.id === spec.id);
      if (game && ship) {
        const hits = ship.cells.filter((c) => shotAt(game, FRANCO_SPANISH, c.row, c.col)).length;
        const sunk = hits === ship.length;
        const text = sunk ? '✕ Sunk' : hits ? `Hit ${hits}/${ship.length}` : 'Afloat';
        return rosterItem(spec.name, spec.length, 'royal', text, sunk ? ['sunk'] : []);
      }
      const isNext = next?.id === spec.id;
      return rosterItem(spec.name, spec.length, 'royal', ship ? 'Placed' : isNext ? 'Next' : 'To place', isNext ? ['next'] : []);
    }),
  );
  el.enemyRoster.replaceChildren(
    ...FRANCO_SPANISH_FLEET.map((spec) => {
      const ship = state.enemy.ships.find((s) => s.id === spec.id);
      const sunk = game && isShipSunk(game, FRANCO_SPANISH, ship);
      const text = !game ? 'Hidden' : sunk ? '✕ Sunk' : 'Afloat';
      return rosterItem(spec.name, spec.length, ENEMY_NATIONS[spec.id], text, sunk ? ['sunk'] : []);
    }),
  );
}

function renderTurn() {
  const game = battle?.game ?? null;
  el.turn.classList.remove('ours', 'theirs', 'won', 'lost');
  if (!game) {
    el.turn.textContent = 'Placing the Royal Navy Fleet';
  } else if (game.winner === ROYAL_NAVY) {
    el.turn.textContent = '⚓ Royal Navy victory';
    el.turn.classList.add('won');
  } else if (game.winner === FRANCO_SPANISH) {
    el.turn.textContent = '✕ Your fleet has been defeated';
    el.turn.classList.add('lost');
  } else if (game.turn === ROYAL_NAVY) {
    el.turn.textContent = '▶ Royal Navy’s turn';
    el.turn.classList.add('ours');
  } else {
    el.turn.textContent = '… Franco-Spanish Fleet is firing';
    el.turn.classList.add('theirs');
  }
}

function logEntryText(shot) {
  const who = shot.shooter === ROYAL_NAVY ? 'Royal Navy' : 'Franco-Spanish';
  let text = `${shot.number}. ${who} → ${shot.coord}: ${shot.result === MISS ? '• miss' : '✕ hit'}`;
  if (shot.result === SUNK) text += ` — ${shot.sunkShip} sunk`;
  return text;
}

function renderLog() {
  const history = battle?.game.history ?? [];
  if (history.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'No shots fired yet.';
    el.log.replaceChildren(li);
    return;
  }
  el.log.replaceChildren(
    ...history.map((shot) => {
      const li = document.createElement('li');
      li.className = shot.shooter === ROYAL_NAVY ? 'ours' : 'theirs';
      li.textContent = logEntryText(shot);
      return li;
    }),
  );
  el.log.scrollTop = el.log.scrollHeight;
}

function renderControls() {
  const placing = state.phase === PLACEMENT;
  el.rotate.textContent = `Rotate (R): ${state.orientation === HORIZONTAL ? 'Horizontal' : 'Vertical'}`;
  el.rotate.disabled = !placing;
  el.random.disabled = !placing;
  el.clear.disabled = !placing;
  el.start.disabled = !placing || !validateFleet(state.player, ROYAL_NAVY_FLEET).ok;
  el.restart.disabled = placing;
}

function render() {
  renderPlayerBoard();
  renderEnemyBoard();
  renderRosters();
  renderTurn();
  renderLog();
  renderControls();
}

function tryPlaceAt(row, col) {
  if (state.phase !== PLACEMENT) return;
  const next = nextUnplacedShip(state.player, ROYAL_NAVY_FLEET);
  if (!next) return;
  const result = placeShip(state.player, next, row, col, state.orientation);
  if (!result.ok) {
    render();
    setStatus(describeRejection(next, result), true);
    return;
  }
  state.player = result.board;
  const cells = result.ship.cells;
  const after = nextUnplacedShip(state.player, ROYAL_NAVY_FLEET);
  render();
  const placedMsg = `${next.name} placed at ${coordLabel(cells[0].row, cells[0].col)}–${coordLabel(cells.at(-1).row, cells.at(-1).col)}.`;
  if (after) {
    setStatus(`${placedMsg} Next: ${after.name} (${after.length} squares, ${orientationWord(state.orientation)}).`);
  } else {
    setStatus(`${placedMsg} Royal Navy Fleet ready. Press Start battle, or Clear fleet to rearrange.`);
    el.start.focus();
  }
}

function setOrientation(orientation) {
  if (state.phase !== PLACEMENT) return;
  state.orientation = orientation;
  render();
  promptNextShip();
}

function rotate() {
  setOrientation(state.orientation === HORIZONTAL ? VERTICAL : HORIZONTAL);
}

function moveFocus(dRow, dCol) {
  const row = Math.min(BOARD_SIZE - 1, Math.max(0, state.focus.row + dRow));
  const col = Math.min(BOARD_SIZE - 1, Math.max(0, state.focus.col + dCol));
  state.focus = { row, col };
  state.hover = { row, col };
  render();
  playerCells[row][col].focus();
}

function moveEnemyFocus(dRow, dCol) {
  const row = Math.min(BOARD_SIZE - 1, Math.max(0, state.enemyFocus.row + dRow));
  const col = Math.min(BOARD_SIZE - 1, Math.max(0, state.enemyFocus.col + dCol));
  state.enemyFocus = { row, col };
  renderEnemyBoard();
  enemyCells[row][col].focus();
}

function afterShotMessage(shot, game) {
  const mine = shot.shooter === ROYAL_NAVY;
  let message;
  if (mine) {
    message = shot.result === SUNK
      ? `Enemy ship sunk: ${shot.sunkShip}!`
      : `You fired at ${shot.coord}: ${shot.result}.`;
  } else {
    const ship = shipAt(state.player, shot.row, shot.col);
    message = shot.result === SUNK
      ? `Franco-Spanish Fleet fired at ${shot.coord} and sank ${shot.sunkShip}.`
      : `Franco-Spanish Fleet fired at ${shot.coord}: ${shot.result === HIT ? `hit on ${ship.name}` : 'miss'}.`;
  }
  if (game.winner === ROYAL_NAVY) return `${message} Royal Navy victory — the Franco-Spanish Fleet is destroyed. Press Restart to play again.`;
  if (game.winner === FRANCO_SPANISH) return `${message} Your fleet has been defeated. Press Restart to play again.`;
  return `${message} ${game.turn === ROYAL_NAVY ? 'Royal Navy’s turn.' : 'Franco-Spanish Fleet is firing…'}`;
}

function onComputerShot({ shot, game }) {
  if (game.winner) state.phase = OVER;
  render();
  setStatus(afterShotMessage(shot, game));
}

function playerFireAt(row, col) {
  if (!battle) return;
  state.enemyFocus = { row, col };
  const outcome = battle.playerFire(row, col);
  if (!outcome.ok) {
    renderEnemyBoard();
    if (outcome.reason === 'repeat') setStatus(`You have already fired at ${outcome.coord}. Choose another square — it is still your turn.`, true);
    else if (outcome.reason === 'not-your-turn') setStatus('Hold fire — the Franco-Spanish Fleet is firing.', true);
    else if (outcome.reason === 'game-over') setStatus('The battle is over. Press Restart to play again.', true);
    return;
  }
  if (outcome.game.winner) state.phase = OVER;
  render();
  setStatus(afterShotMessage(outcome.shot, outcome.game));
}

function startBattle() {
  if (state.phase !== PLACEMENT || !validateFleet(state.player, ROYAL_NAVY_FLEET).ok) return;
  battle = createBattle({
    royalNavy: state.player,
    francoSpanish: state.enemy,
    rng,
    schedule: (fn, ms) => window.setTimeout(fn, ms),
    cancel: (id) => window.clearTimeout(id),
    onComputerShot,
  });
  state.phase = BATTLE;
  state.hover = null;
  state.enemyFocus = { row: 0, col: 0 };
  render();
  setStatus('Battle stations! Royal Navy’s turn — fire at a square on the Franco-Spanish Fleet board.');
  enemyCells[0][0].focus();
}

function restart() {
  if (state.phase === PLACEMENT) return;
  battle?.dispose();
  battle = null;
  state = freshState();
  render();
  promptNextShip();
  el.random.focus();
}

el.playerBoard.addEventListener('click', (event) => {
  const button = event.target.closest('.cell');
  if (!button || button.disabled) return;
  const row = Number(button.dataset.row);
  const col = Number(button.dataset.col);
  state.focus = { row, col };
  tryPlaceAt(row, col);
});

el.enemyBoard.addEventListener('click', (event) => {
  const button = event.target.closest('.cell');
  if (!button || button.disabled) return;
  playerFireAt(Number(button.dataset.row), Number(button.dataset.col));
});

el.playerBoard.addEventListener('mouseover', (event) => {
  const button = event.target.closest('.cell');
  if (!button || state.phase !== PLACEMENT) return;
  const hover = { row: Number(button.dataset.row), col: Number(button.dataset.col) };
  if (state.hover && state.hover.row === hover.row && state.hover.col === hover.col) return;
  state.hover = hover;
  renderPlayerBoard();
});

el.playerBoard.addEventListener('mouseleave', () => {
  state.pointerOverBoard = false;
  state.hover = null;
  renderPlayerBoard();
});

el.playerBoard.addEventListener('focusin', (event) => {
  const button = event.target.closest('.cell');
  if (!button) return;
  const pos = { row: Number(button.dataset.row), col: Number(button.dataset.col) };
  if (state.hover && state.hover.row === pos.row && state.hover.col === pos.col) return;
  state.focus = pos;
  state.hover = pos;
  renderPlayerBoard();
});

el.playerBoard.addEventListener('mouseenter', () => {
  state.pointerOverBoard = true;
});

el.playerBoard.addEventListener('mousemove', () => {
  state.inputMode = 'mouse';
});

const ARROW_MOVES = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
const ARROW_ORIENTATIONS = { ArrowUp: VERTICAL, ArrowDown: VERTICAL, ArrowLeft: HORIZONTAL, ArrowRight: HORIZONTAL };

document.addEventListener('keydown', (event) => {
  if (event.key === 'Tab') {
    state.inputMode = 'keyboard';
    return;
  }
  if (!ARROW_MOVES[event.key]) return;
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
  if (state.phase !== PLACEMENT) {
    if (document.activeElement?.closest?.('#enemy-board')) {
      event.preventDefault();
      moveEnemyFocus(...ARROW_MOVES[event.key]);
    }
    return;
  }
  const boardFocused = Boolean(document.activeElement?.closest?.('#player-board'));
  if (state.inputMode === 'mouse' && state.pointerOverBoard) {
    event.preventDefault();
    setOrientation(ARROW_ORIENTATIONS[event.key]);
    if (boardFocused) playerCells[state.focus.row][state.focus.col].focus();
  } else if (boardFocused) {
    event.preventDefault();
    state.inputMode = 'keyboard';
    moveFocus(...ARROW_MOVES[event.key]);
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'r' && event.key !== 'R') return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const hadFocus = document.activeElement?.closest?.('#player-board');
  rotate();
  if (hadFocus) playerCells[state.focus.row][state.focus.col].focus();
});

el.rotate.addEventListener('click', rotate);

el.random.addEventListener('click', () => {
  if (state.phase !== PLACEMENT) return;
  state.player = randomFleet(ROYAL_NAVY_FLEET, rng);
  state.hover = null;
  render();
  setStatus('Royal Navy Fleet placed at random. Press Start battle, Random placement again, or Clear fleet.');
});

el.clear.addEventListener('click', () => {
  if (state.phase !== PLACEMENT) return;
  state.player = createBoard();
  state.hover = null;
  render();
  promptNextShip();
});

el.start.addEventListener('click', startBattle);
el.restart.addEventListener('click', restart);

render();
promptNextShip();
