# HMS Victory

*Built with Devin, captained by Alex.*

A browser Battleship game with a Trafalgar-inspired theme: the Royal Navy Fleet against the Franco-Spanish Fleet. The opponent is a computer strategy (hunt-and-target), not an AI or LLM. Ship names are thematic labels, not a historical record.

Plain HTML, CSS and JavaScript. No runtime libraries, no backend, no login.

## Status

Milestones 1–3 (placement, game rules, computer strategy) are accepted; Milestone 4 (release) is in progress. See [PLAN.md](PLAN.md).

## How to play

1. Place your five ships on the **Royal Navy Fleet** board: click a square (ships run right or down from it), press **Rotate** or <kbd>R</kbd> to switch direction, or press **Random placement**.
2. Press **Start battle**, then click or tap squares on the **Franco-Spanish Fleet** board to fire. You fire first; the sides alternate one shot each, including after a hit.
3. ✕ = hit, • = miss, brass outline = sunk. The Battle log lists every shot. Sink all five enemy ships to win.
4. Keyboard only: <kbd>Tab</kbd> to a board, arrow keys to move, <kbd>Enter</kbd>/<kbd>Space</kbd> to place or fire, <kbd>R</kbd> to rotate, <kbd>Esc</kbd> to close the end-of-game card.

## Architecture (five lines)

1. `src/engine.js`: placement rules (board, fleets, legal placement); no page code.
2. `src/game.js`: battle rules (shots, hit/miss/sunk, turns, winner); immutable and page-free, so tests can drive it.
3. `src/battle.js`: turn timing (computer delay, cancel on Restart), with the clock injected so tests control time.
4. `src/opponent.js`: the hunt-and-target computer strategy, which sees only its own earlier shots and results.
5. `src/ui.js` + `src/art.js`: the page — clicks, keyboard, messages, effects and the inline-SVG ships and flags.

## Deployment

`.github/workflows/pages.yml` runs the tests on every push to `main`, copies only the game files (`index.html`, `styles.css`, `src/`, `LICENSE`) into the site, and publishes them with GitHub Pages. Tests and dev tools are not shipped.

## Licence

MIT. See [LICENSE](LICENSE). All code, drawings and text are original to this project; the flags are simplified drawings of historical public-domain designs, and Nelson's 1805 signal is a historical quotation.

## The computer opponent

A simple hunt-and-target strategy in `src/opponent.js`, not an AI or LLM. It is given only its own earlier shots and whether each was a miss, hit or sinking; it never sees where your ships are.

- **Hunt:** fire at random untried squares in a checkerboard pattern (every ship covers at least one).
- **Target:** after a hit, fire at the squares next to it; once two hits line up, keep firing along that line until the ship sinks, then go back to hunting.

## Play locally

The game uses JavaScript modules, so browsers won't run it straight from a file. Serve the folder with any static server, for example:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

Add `?seed=123` to the URL to make "random" placement repeat exactly (useful for demos and bug reports).

## Tests

The rules are in `src/engine.js` (placement) and `src/game.js` (shots, turns, winner), which contain no page code, so they can be tested on their own. `src/battle.js` handles the computer's delay and Restart; tests give it a fake clock so timing can be checked exactly. Tests use Node's built-in test runner (Node 20 or newer, development only):

```sh
npm test        # same as: node --test
```

Development-only browser check (needs Google Chrome and the local server running). It confirms the square under the pointer shows the same placement preview colour as the rest of the preview:

```sh
node tools/check-hover-preview.mjs http://localhost:8000
```

## Files

- `index.html`, `styles.css`: the page and its styling
- `src/engine.js`: placement rules (board, fleets, placement)
- `src/game.js`: battle rules (shots, hit/miss/sunk, turns, winner)
- `src/battle.js`: turn timing (computer delay, cancelling on Restart)
- `src/opponent.js`: the computer's shot choice (hunt-and-target; the random stand-in is kept for tests)
- `src/art.js`: ship and flag drawings
- `src/rng.js`: seeded random numbers, so tests can be repeated exactly
- `src/ui.js`: connects the rules to the page
- `tests/`: automated tests
- `tools/`: development-only checks (not part of the game)

## Project records

- [SPEC.md](SPEC.md): requirements
- [PLAN.md](PLAN.md): milestones, acceptance criteria, checklist
- [DECISIONS.md](DECISIONS.md): scope choices, questions, milestone acceptance
- [BUGS.md](BUGS.md): observed defects and untested risks
