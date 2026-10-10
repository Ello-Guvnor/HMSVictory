// Development-only browser check (needs Google Chrome). Not shipped with the game.
// Verifies the square under the pointer shows the same preview colour as the rest of the preview,
// that board squares stay under their coordinate labels once ship drawings are on the board,
// that a fired-at square keeps its hit or miss marking while the pointer is over it,
// that on a phone the strip above the enemy board shows whose turn it is and flags a tap refused during the enemy's turn,
// and that winning shows the Royal Navy victory screen without a busy cursor on the enemy board.
// Usage: node tools/check-hover-preview.mjs [baseUrl]   (default http://localhost:8000)
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FRANCO_SPANISH_FLEET, randomFleet } from '../src/engine.js';
import { createRng } from '../src/rng.js';

const baseUrl = process.argv[2] ?? 'http://localhost:8000';
const port = 9300 + Math.floor(Math.random() * 500);
const profileDir = mkdtempSync(join(tmpdir(), 'hms-check-'));
const chrome = spawn('google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${port}`,
  `--user-data-dir=${profileDir}`, 'about:blank',
], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
try {
  let targets;
  for (let i = 0; i < 40 && !targets; i += 1) {
    await sleep(250);
    targets = await fetch(`http://127.0.0.1:${port}/json`).then((r) => r.json()).catch(() => undefined);
  }
  const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let nextId = 0;
  const pending = new Map();
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data);
    if (pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id); }
  });
  const send = (method, params = {}) => new Promise((r) => { nextId += 1; pending.set(nextId, r); ws.send(JSON.stringify({ id: nextId, method, params })); });
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result.value;

  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `${baseUrl}/?seed=42` });
  await sleep(1500);

  const cases = [
    { label: 'A1 (legal)', row: 0, col: 0, neighbourCol: 1, expectClass: 'preview-ok' },
    { label: 'A8 (off board)', row: 0, col: 7, neighbourCol: 8, expectClass: 'preview-bad' },
  ];
  for (const c of cases) {
    const cell = (col) => `document.querySelector('#player-board .cell[data-row="${c.row}"][data-col="${col}"]')`;
    const point = await evaluate(`(() => { const b = ${cell(c.col)}; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y });
    await sleep(200);
    const info = await evaluate(`(() => ({ hovered: ${cell(c.col)}.matches(':hover'), hasClass: ${cell(c.col)}.classList.contains('${c.expectClass}'), bg: getComputedStyle(${cell(c.col)}).backgroundColor, neighbourBg: getComputedStyle(${cell(c.neighbourCol)}).backgroundColor }))()`);
    const ok = info.hovered && info.hasClass && info.bg === info.neighbourBg;
    if (!ok) failures += 1;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${c.label}: hovered=${info.hovered} ${c.expectClass}=${info.hasClass} hovered-bg=${info.bg} neighbour-bg=${info.neighbourBg}`);
  }

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await sleep(300);
  const tap = async (selector) => {
    const p = await evaluate(`(() => { const b = document.querySelector('${selector}'); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] });
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(400);
  };
  const victoryCells = () => evaluate(`[...document.querySelectorAll('#player-board .cell')].filter((b) => b.classList.contains('ship') && /^[A-J]\\d+, Victory/.test(b.getAttribute('aria-label'))).map((b) => b.dataset.row + b.dataset.col).join(' ')`);
  await evaluate(`document.getElementById('clear-btn').click()`);
  const turnButton = await evaluate(`(() => { const b = document.getElementById('board-rotate-btn'); const board = document.getElementById('player-board').getBoundingClientRect(); const r = b.getBoundingClientRect(); return { visible: !b.hidden && r.height >= 44, aboveBoard: r.bottom <= board.top + 1 && board.top - r.bottom < 80 }; })()`);
  await tap('#board-rotate-btn');
  await tap('#player-board .cell[data-row="2"][data-col="2"]');
  const tappedVertical = await victoryCells();
  await tap('#player-board .cell[data-row="4"][data-col="2"]');
  const turnedHorizontal = await victoryCells();
  const refusedEdge = await (async () => {
    await evaluate(`document.getElementById('clear-btn').click()`);
    if (!(await evaluate(`/Vertical/.test(document.getElementById('board-rotate-btn').textContent)`))) await tap('#board-rotate-btn');
    await tap('#player-board .cell[data-row="0"][data-col="9"]');
    await tap('#player-board .cell[data-row="0"][data-col="9"]');
    return evaluate(`({ cells: [...document.querySelectorAll('#player-board .cell')].filter((b) => b.classList.contains('ship') && /^[A-J]\\d+, Victory/.test(b.getAttribute('aria-label'))).map((b) => b.dataset.row + b.dataset.col).join(' '), status: document.getElementById('status').textContent })`);
  })();
  const touchOk = turnButton.visible && turnButton.aboveBoard
    && tappedVertical === '22 32 42 52 62' && turnedHorizontal === '22 23 24 25 26'
    && refusedEdge.cells === '09 19 29 39 49' && /can't turn horizontal/.test(refusedEdge.status);
  if (!touchOk) failures += 1;
  console.log(`${touchOk ? 'PASS' : 'FAIL'} phone taps: turn button visible=${turnButton.visible} above-board=${turnButton.aboveBoard}; placed vertical=${tappedVertical}; tap ship -> ${turnedHorizontal}; edge refusal keeps ${refusedEdge.cells} ("${refusedEdge.status}")`);
  await evaluate(`document.getElementById('random-btn').click(); document.getElementById('start-btn').click(); document.getElementById('enemy-board').scrollIntoView({ block: 'center' })`);
  await sleep(300);
  const quickTap = async (row, col) => {
    const p = await evaluate(`(() => { const r = document.querySelector('#enemy-board .cell[data-row="${row}"][data-col="${col}"]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] });
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(50);
  };
  const strip = () => evaluate(`(() => { const s = document.getElementById('enemy-turn'); const r = s.getBoundingClientRect(); return { text: s.textContent, ours: s.classList.contains('ours'), theirs: s.classList.contains('theirs'), refused: s.classList.contains('refused'), inView: r.top >= 0 && r.bottom <= innerHeight, height: Math.round(r.height), shots: document.querySelectorAll('#enemy-board .cell.hit, #enemy-board .cell.miss').length, dimmed: getComputedStyle(document.querySelector('#enemy-board .cell')).filter !== 'none' }; })()`);
  const ready = await strip();
  await quickTap(0, 0);
  await quickTap(0, 1);
  const waiting = await strip();
  await sleep(1200);
  const back = await strip();
  await quickTap(0, 1);
  const fired = await strip();
  const fireOk = ready.ours && ready.inView && /Your turn/.test(ready.text)
    && waiting.shots === 1 && waiting.theirs && waiting.refused && waiting.inView && waiting.dimmed && /hold fire/.test(waiting.text) && /Your shot at A1/.test(waiting.text)
    && back.ours && !back.dimmed && /They fired at [A-J]\d+/.test(back.text) && fired.shots === 2
    && ready.height === waiting.height && waiting.height === back.height;
  if (!fireOk) failures += 1;
  console.log(`${fireOk ? 'PASS' : 'FAIL'} phone firing: strip in view=${ready.inView}/${waiting.inView}; tap during enemy turn refused=${waiting.shots === 1} flashed=${waiting.refused} dimmed=${waiting.dimmed} ("${waiting.text}"); after delay "${back.text}"; next tap fired=${fired.shots === 2}; strip height ${ready.height}/${waiting.height}/${back.height}px`);
  await send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 2, mobile: true });
  await sleep(300);
  const landscape = await evaluate(`(() => { document.querySelector('#enemy-board .cell[data-row="9"][data-col="9"]').scrollIntoView({ block: 'end' }); const s = document.getElementById('enemy-turn').getBoundingClientRect(); return s.top >= 0 && s.bottom <= innerHeight; })()`);
  if (!landscape) failures += 1;
  console.log(`${landscape ? 'PASS' : 'FAIL'} landscape phone (844x390): turn strip stays in view with row J at the bottom of the screen`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: `${baseUrl}/?seed=42` });
  await sleep(1500);
  await send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
  await sleep(300);

  const alignment = await evaluate(`(() => {
    document.getElementById('random-btn').click();
    const board = document.getElementById('player-board');
    const axes = board.querySelectorAll('.axis');
    const misplaced = [];
    for (const cell of board.querySelectorAll('.cell')) {
      const row = Number(cell.dataset.row), col = Number(cell.dataset.col);
      const r = cell.getBoundingClientRect();
      const colX = axes[1 + col].getBoundingClientRect().left;
      const rowY = axes[11 + row].getBoundingClientRect().top;
      if (Math.abs(r.left - colX) > 1 || Math.abs(r.top - rowY) > 1) misplaced.push(String.fromCharCode(65 + row) + (col + 1));
    }
    const art = board.querySelectorAll('.ship-art').length;
    return { art, misplaced };
  })()`);
  const aligned = alignment.art === 5 && alignment.misplaced.length === 0;
  if (!aligned) failures += 1;
  console.log(`${aligned ? 'PASS' : 'FAIL'} squares under labels after Random placement: ship drawings=${alignment.art} misplaced=${alignment.misplaced.length}${alignment.misplaced.length ? ` (${alignment.misplaced.slice(0, 8).join(' ')}...)` : ''}`);

  const controls = () => evaluate(`({ clear: !document.getElementById('clear-btn').disabled, restart: !document.getElementById('restart-btn').disabled })`);
  const placingControls = await controls();
  const shotCell = `document.querySelector('#enemy-board .cell[data-row="5"][data-col="0"]')`;
  const shotPoint = await evaluate(`(() => {
    document.getElementById('start-btn').click();
    const b = ${shotCell};
    b.click();
    b.scrollIntoView({ block: 'center' });
    const r = b.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  })()`);
  const battleControls = await controls();
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: shotPoint.x, y: shotPoint.y });
  await sleep(200);
  const marked = await evaluate(`(() => { const b = ${shotCell}; return { hovered: b.matches(':hover'), result: b.classList.contains('hit') ? 'hit' : b.classList.contains('miss') ? 'miss' : 'none', image: getComputedStyle(b).backgroundImage }; })()`);
  const keptMark = marked.hovered && marked.result !== 'none' && marked.image.includes('gradient');
  if (!keptMark) failures += 1;
  console.log(`${keptMark ? 'PASS' : 'FAIL'} F1 keeps its ${marked.result} marking under the pointer: hovered=${marked.hovered} background-image=${marked.image.startsWith('radial') ? 'radial-gradient' : marked.image}`);

  const enemyShips = randomFleet(FRANCO_SPANISH_FLEET, createRng(42)).ships.flatMap((ship) => ship.cells);
  for (const { row, col } of enemyShips) {
    await sleep(1000);
    await evaluate(`document.querySelector('#enemy-board .cell[data-row="${row}"][data-col="${col}"]').click()`);
  }
  await sleep(2000);
  const ending = await evaluate(`(() => {
    const d = document.getElementById('ending');
    const cell = document.querySelector('#enemy-board .cell');
    return { open: d.open, royal: d.classList.contains('royal'), title: d.querySelector('h2')?.textContent ?? '', waiting: document.getElementById('enemy-board').classList.contains('waiting'), cursor: getComputedStyle(cell).cursor, strip: document.getElementById('enemy-turn').textContent };
  })()`);
  const lastCoord = `${'ABCDEFGHIJ'[enemyShips.at(-1).row]}${enemyShips.at(-1).col + 1}`;
  const won = ending.open && ending.royal && ending.title === 'Royal Navy Victory!' && !ending.waiting && ending.cursor !== 'wait' && ending.strip.includes(`Your shot at ${lastCoord}`);
  if (!won) failures += 1;
  console.log(`${won ? 'PASS' : 'FAIL'} winning shows the victory screen with no busy cursor: open=${ending.open} title="${ending.title}" waiting=${ending.waiting} cursor=${ending.cursor} strip="${ending.strip}"`);

  const overControls = await controls();
  const orders = await evaluate(`document.querySelector('.instructions').textContent.replace(/\\s+/g, ' ')`);
  const fmt = (c) => `clear=${c.clear ? 'on' : 'off'} restart=${c.restart ? 'on' : 'off'}`;
  const statesOk = placingControls.clear && !placingControls.restart
    && !battleControls.clear && battleControls.restart
    && !overControls.clear && overControls.restart;
  const ordersOk = !/at any time/i.test(orders)
    && /Clear fleet removes all your ships so you can place them again; it works only while placing/.test(orders)
    && /Restart unlocks once the battle begins and stays available after it ends/.test(orders);
  if (!(statesOk && ordersOk)) failures += 1;
  console.log(`${statesOk && ordersOk ? 'PASS' : 'FAIL'} Clear fleet / Restart availability matches the Orders: placing ${fmt(placingControls)}; battle ${fmt(battleControls)}; game over ${fmt(overControls)}; orders-wording-ok=${ordersOk}`);
  ws.close();
} finally {
  const exited = new Promise((r) => chrome.once('exit', r));
  chrome.kill();
  await exited;
  rmSync(profileDir, { recursive: true, force: true });
}
process.exit(failures ? 1 : 0);
