# PLAN — milestones, acceptance criteria, checklist

Status key: `[ ]` not started · `[x]` done and verified (with evidence linked in the milestone's PR).
A milestone is only marked done after Alex accepts it (recorded in DECISIONS.md).

## Proposed structure (plain English)

- `index.html`, `styles.css` — the page and its look.
- `src/engine.js` — the game rules only (board, ships, shots, turns, win/loss). No page code, so it can be tested on its own.
- `src/strategy.js` — the computer's shot-picking logic. It is handed only its own past shots and their results.
- `src/rng.js` — a seeded random number generator, so tests can replay the exact same "random" game.
- `src/ui.js` — connects the rules to the page (clicks, keyboard, messages).
- `tests/` — automated tests for the rules and strategy, run with Node's built-in test runner (`node --test`). Node is a development-only tool; the game itself needs nothing but a browser.

## Milestone 1 — Placement

Plan: build the board model and placement rules, the two labelled boards with coordinates, random placement, and click-to-place with a rotate control.

Acceptance criteria (built and verified in PR #2; milestone done only once Alex accepts):
- [x] Two boards labelled "Royal Navy Fleet" (human) and "Franco-Spanish Fleet" (computer), each 10×10 with A–J / 1–10 coordinates.
- [x] Each fleet is five ships of lengths 5, 4, 3, 3, 2. Royal Navy: Victory 5, Sovereign 4, Vanguard 3, Defiance 3, Swift 2. Franco-Spanish: Santísima Trinidad 5, Bucentaure 4, Redoutable 3, Santa Ana 3, Argonaute 2.
- [x] Engine rejects any placement that overlaps another ship or runs off the board; touching ships are allowed. (Automated tests.)
- [x] "Random placement" always produces a legal fleet (automated test across many seeds).
- [x] Manual placement: click a cell to place the next ship; a Rotate button (and `R` key) switches horizontal/vertical, and while pointing with the mouse the arrow keys set orientation (←/→ horizontal, ↑/↓ vertical); a preview shows where the ship will go and whether it is legal; illegal clicks are refused with a message.
- [x] A way to clear placement and start again.
- [x] "Start battle" is disabled until all five ships are placed.
- [x] Title "HMS Victory" with subtitle "Built with Devin, captained by Alex."; navy blue, parchment/cream, restrained brass accents; period sailing-warship drawings and national flags beside the fleet headings (D15); no elaborate animations, no sound, no dependencies.
- [x] `node --test` passes; results recorded in the PR.

## Milestone 2 — Game rules

Plan: turn logic, shots, and end-of-game handling. The computer fires random legal shots here as a stand-in; the real strategy comes in milestone 3.

Acceptance criteria:
- [ ] Human shoots first; turns alternate after every valid shot, including hits.
- [ ] Shooting an already-shot cell is rejected with a message and does not use up the turn.
- [ ] Each shot shows hit / miss / sunk using symbols and text as well as colour (e.g. ✕ hit, • miss, sunk ships outlined and named).
- [ ] A status line always shows whose turn it is ("Royal Navy’s turn" / "Franco-Spanish Fleet is firing").
- [ ] A clear "Royal Navy victory" or "Your fleet has been defeated" message when all of one side's ships are sunk; "Enemy ship sunk" (with the ship name) when an enemy ship goes down.
- [ ] After the game ends, no further shots are accepted from either side.
- [ ] Restart cancels any pending computer move and resets all state (boards, ships, turn, messages).
- [ ] Enemy board is usable by keyboard (arrow keys to move, Enter/Space to fire) with a visible focus outline.
- [ ] Automated tests cover turn order, repeat-shot rejection, sunk detection, win/loss, no moves after game over, and restart cancelling a pending computer move.

## Milestone 3 — Computer strategy

Plan: replace the stand-in with hunt-and-target. "Hunt" = fire at unexplored cells (checkerboard pattern); after a hit, "target" = try neighbouring cells until the ship is sunk, then go back to hunting.

Acceptance criteria:
- [ ] Strategy receives only its own previous shots and their results (miss / hit / sunk). It is never given the player's ship positions; a test checks the data it receives.
- [ ] After a hit, next shots go to neighbouring cells; after a sink, it returns to hunting.
- [ ] Never fires at the same cell twice; always finishes a game within 100 shots (tested across many seeds).
- [ ] Same seed ⇒ same sequence of shots (reproducibility test).
- [ ] UI labels the opponent as "Computer strategy (hunt-and-target) — not an AI/LLM".

## Milestone 4 — Release

Plan: polish, accessibility and mobile checks, documentation, and a free public deployment.

Acceptance criteria:
- [ ] Usable on desktop and a phone-sized screen (checked in the browser at both sizes; screenshots in the PR).
- [ ] Keyboard-only play works end to end.
- [ ] README explains how to play, how to run tests, and how it is deployed.
- [ ] BUGS.md lists only observed defects, each with repro, expected vs actual, cause, fix, regression test, commit; untested risks listed separately.
- [ ] Production build = the static files only (no tests or dev tools shipped).
- [ ] Public deployment on a free static host (proposed: GitHub Pages on this repo). This needs one repo setting from Alex — I will give that step when we get there.
- [ ] Final report: live URL, source URL, BUGS.md URL, actual test results, remaining limitations.
