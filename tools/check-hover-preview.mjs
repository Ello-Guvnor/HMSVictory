// Development-only browser check (needs Google Chrome). Not shipped with the game.
// Verifies the square under the pointer shows the same preview colour as the rest of the preview.
// Usage: node tools/check-hover-preview.mjs [baseUrl]   (default http://localhost:8000)
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const baseUrl = process.argv[2] ?? 'http://localhost:8000';
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn('google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${port}`,
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'hms-check-'))}`, 'about:blank',
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
  ws.close();
} finally {
  chrome.kill();
}
process.exit(failures ? 1 : 0);
