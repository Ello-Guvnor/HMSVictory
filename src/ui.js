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
import { createRng } from './rng.js';

const PLACEMENT = 'placement';
const DEPLOYED = 'deployed';

const params = new URLSearchParams(window.location.search);
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const rng = createRng(Number.isFinite(seedParam) ? seedParam : Date.now());

const el = {
  playerBoard: document.getElementById('player-board'),
  enemyBoard: document.getElementById('enemy-board'),
  playerRoster: document.getElementById('player-roster'),
  enemyRoster: document.getElementById('enemy-roster'),
  status: document.getElementById('status'),
  rotate: document.getElementById('rotate-btn'),
  random: document.getElementById('random-btn'),
  clear: document.getElementById('clear-btn'),
  start: document.getElementById('start-btn'),
};

const state = {
  phase: PLACEMENT,
  player: createBoard(),
  enemy: randomFleet(FRANCO_SPANISH_FLEET, rng),
  orientation: HORIZONTAL,
  hover: null,
  focus: { row: 0, col: 0 },
};

const playerCells = buildBoard(el.playerBoard, 'player');
const enemyCells = buildBoard(el.enemyBoard, 'enemy');

function buildBoard(container, side) {
  const cells = [];
  container.append(axisCell(''));
  for (let col = 0; col < BOARD_SIZE; col += 1) container.append(axisCell(String(col + 1)));
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    container.append(axisCell(ROW_LABELS[row]));
    const rowCells = [];
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cell';
      button.dataset.row = String(row);
      button.dataset.col = String(col);
      button.dataset.side = side;
      button.tabIndex = -1;
      container.append(button);
      rowCells.push(button);
    }
    cells.push(rowCells);
  }
  return cells;
}

function axisCell(text) {
  const div = document.createElement('div');
  div.className = 'axis';
  div.textContent = text;
  div.setAttribute('aria-hidden', 'true');
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

function renderPlayerBoard() {
  const preview = previewCells();
  const previewKeys = new Set(preview ? preview.cells.map((c) => `${c.row},${c.col}`) : []);
  const next = nextUnplacedShip(state.player, ROYAL_NAVY_FLEET);
  const placing = state.phase === PLACEMENT && next !== null;

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const button = playerCells[row][col];
      const ship = shipAt(state.player, row, col);
      button.className = 'cell';
      button.replaceChildren();
      let label = coordLabel(row, col);
      if (ship) {
        const index = ship.cells.findIndex((c) => c.row === row && c.col === col);
        button.classList.add('ship', ship.orientation === HORIZONTAL ? 'h' : 'v');
        if (index === 0) button.classList.add('bow');
        if (index === ship.cells.length - 1) button.classList.add('stern');
        const hull = document.createElement('span');
        hull.className = 'hull';
        button.append(hull);
        label += `, ${ship.name}`;
      } else {
        label += ', open water';
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
}

function renderEnemyBoard() {
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const button = enemyCells[row][col];
      button.disabled = true;
      button.setAttribute('aria-label', `${coordLabel(row, col)}, unexplored`);
    }
  }
}

function silhouette(length) {
  const span = document.createElement('span');
  span.className = 'silhouette';
  span.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < length; i += 1) span.append(document.createElement('span'));
  return span;
}

function rosterItem(name, length, stateText, isNext) {
  const li = document.createElement('li');
  if (isNext) li.classList.add('next');
  const nameSpan = document.createElement('span');
  nameSpan.textContent = `${name} (${length})`;
  const stateSpan = document.createElement('span');
  stateSpan.className = 'ship-state';
  stateSpan.textContent = stateText;
  li.append(nameSpan, silhouette(length), stateSpan);
  return li;
}

function renderRosters() {
  const next = state.phase === PLACEMENT ? nextUnplacedShip(state.player, ROYAL_NAVY_FLEET) : null;
  el.playerRoster.replaceChildren(
    ...ROYAL_NAVY_FLEET.map((spec) => {
      const placed = state.player.ships.some((s) => s.id === spec.id);
      const isNext = next?.id === spec.id;
      return rosterItem(spec.name, spec.length, placed ? 'Placed' : isNext ? 'Next' : 'To place', isNext);
    }),
  );
  el.enemyRoster.replaceChildren(
    ...FRANCO_SPANISH_FLEET.map((spec) => rosterItem(spec.name, spec.length, 'Hidden', false)),
  );
}

function renderControls() {
  const placing = state.phase === PLACEMENT;
  el.rotate.textContent = `Rotate (R): ${state.orientation === HORIZONTAL ? 'Horizontal' : 'Vertical'}`;
  el.rotate.disabled = !placing;
  el.random.disabled = !placing;
  el.clear.disabled = !placing;
  el.start.disabled = !placing || !validateFleet(state.player, ROYAL_NAVY_FLEET).ok;
}

function render() {
  renderPlayerBoard();
  renderEnemyBoard();
  renderRosters();
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

function rotate() {
  if (state.phase !== PLACEMENT) return;
  state.orientation = state.orientation === HORIZONTAL ? VERTICAL : HORIZONTAL;
  render();
  promptNextShip();
}

function moveFocus(dRow, dCol) {
  const row = Math.min(BOARD_SIZE - 1, Math.max(0, state.focus.row + dRow));
  const col = Math.min(BOARD_SIZE - 1, Math.max(0, state.focus.col + dCol));
  state.focus = { row, col };
  state.hover = { row, col };
  render();
  playerCells[row][col].focus();
}

el.playerBoard.addEventListener('click', (event) => {
  const button = event.target.closest('.cell');
  if (!button || button.disabled) return;
  const row = Number(button.dataset.row);
  const col = Number(button.dataset.col);
  state.focus = { row, col };
  tryPlaceAt(row, col);
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

el.playerBoard.addEventListener('keydown', (event) => {
  const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
  if (moves[event.key]) {
    event.preventDefault();
    moveFocus(...moves[event.key]);
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

el.start.addEventListener('click', () => {
  if (state.phase !== PLACEMENT || !validateFleet(state.player, ROYAL_NAVY_FLEET).ok) return;
  state.phase = DEPLOYED;
  state.hover = null;
  render();
  setStatus('Royal Navy Fleet deployed. Firing is not built yet — it arrives in Milestone 2.');
});

render();
promptNextShip();
