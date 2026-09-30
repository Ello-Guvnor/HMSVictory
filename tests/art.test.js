import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HORIZONTAL, VERTICAL, ROYAL_NAVY_FLEET, FRANCO_SPANISH_FLEET } from '../src/engine.js';
import { ENEMY_NATIONS, LIVERIES, flagSvg, shipProfileSvg, shipTopSvg } from '../src/art.js';

const count = (svg, pattern) => (svg.match(pattern) ?? []).length;

test('bigger ships are drawn with more gun decks and masts', () => {
  const expected = { 5: [3, 3], 4: [2, 3], 3: [2, 3], 2: [1, 2] };
  for (const [length, [decks, masts]] of Object.entries(expected)) {
    const svg = shipProfileSvg(Number(length), 'royal');
    assert.equal(count(svg, /class="gun-deck"/g), decks, `length ${length} gun decks`);
    assert.equal(count(svg, /class="mast"/g), masts, `length ${length} masts`);
  }
});

test('board drawings span the ship length in the right direction', () => {
  assert.match(shipTopSvg(5, 'royal', HORIZONTAL), /viewBox="0 0 500 100"/);
  const vertical = shipTopSvg(3, 'royal', VERTICAL);
  assert.match(vertical, /viewBox="0 0 100 300"/);
  assert.match(vertical, /rotate\(90\)/);
});

test('each enemy ship has a nation, and each nation flies its own ensign', () => {
  for (const spec of FRANCO_SPANISH_FLEET) assert.ok(['french', 'spanish'].includes(ENEMY_NATIONS[spec.id]), spec.name);
  assert.equal(ROYAL_NAVY_FLEET.some((spec) => spec.id in ENEMY_NATIONS), false);
  assert.match(shipProfileSvg(3, 'royal'), /#c8102e/);
  assert.match(shipProfileSvg(3, 'french'), /#002395/);
  assert.match(shipProfileSvg(3, 'spanish'), /#fabd00/);
  assert.notEqual(LIVERIES.royal.band, LIVERIES.french.band);
});

test('flags carry a readable name for tooltips', () => {
  assert.match(flagSvg('white-ensign'), /<title>White Ensign/);
  assert.match(flagSvg('french'), /<title>French tricolour/);
  assert.match(flagSvg('spanish'), /<title>Spanish naval ensign/);
  assert.throws(() => flagSvg('pirate'));
});
