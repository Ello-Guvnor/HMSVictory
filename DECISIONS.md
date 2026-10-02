# DECISIONS

Only Alex's actual statements are attributed to Alex. Anything proposed by Devin is marked **Proposed (Devin)** until Alex accepts or changes it.

## Requirements from Alex

Recorded verbatim in SPEC.md (game spec and opening-brief working rules).

## Scope choices and tradeoffs

| # | Date | Decision | Status |
|---|------|----------|--------|
| D1 | 2026-09-30 | Repository: `Ello-Guvnor/HMSVictory`, created by Alex. Flight simulator repo (`Ello-Guvnor/Skyward`) is not touched. | Alex created the repo |
| D2 | 2026-09-30 | Plain HTML/CSS/JavaScript modules, no runtime libraries, no backend. | Required by Alex (SPEC) |
| D3 | 2026-09-30 | Tests use Node's built-in test runner (`node --test`), a development-only tool with no extra packages. | Proposed (Devin) |
| D4 | 2026-09-30 | In milestone 2 the computer fires random legal shots as a temporary stand-in, so turn rules can be verified before the strategy exists. Replaced in milestone 3. | **Approved by Alex** (Milestone 2 brief: "Use a random computer opponent for now.") |
| D5 | 2026-09-30 | Hosting: GitHub Pages on this repo (free, static, no paid services). | Proposed (Devin) |
| D6 | 2026-09-30 | ~~Board labels "Your fleet — HMS Victory" / "Enemy waters — Spanish Armada".~~ Superseded by D7. | Superseded |
| D7 | 2026-09-30 | Theme: game title "HMS Victory", subtitle "Built with Devin, captained by Alex."; Trafalgar-inspired Royal Navy vs Franco-Spanish Fleet; boards "Royal Navy Fleet" (human) and "Franco-Spanish Fleet" (computer); no "Fleet Command" or "Spanish Armada" wording. | **Approved by Alex** |
| D8 | 2026-09-30 | Human ships: Victory 5, Sovereign 4, Vanguard 3, Defiance 3, Swift 2 — thematic labels, not a claim to reproduce the historical fleet. | **Approved by Alex** |
| D9 | 2026-09-30 | Opponent ships (Alex asked Devin to choose five distinct period-appropriate names): Santísima Trinidad 5, Bucentaure 4, Redoutable 3, Santa Ana 3, Argonaute 2. Thematic labels only. | **Approved by Alex** ("I like the names of the ships.") |
| D10 | 2026-09-30 | Themed messages, e.g. "Royal Navy’s turn", "Franco-Spanish Fleet is firing", "Enemy ship sunk", "Royal Navy victory", "Your fleet has been defeated". | **Approved by Alex** |
| D11 | 2026-09-30 | Visual style: navy blue, parchment/cream, restrained brass accents, clear coordinates, simple ship silhouettes; no elaborate animations or new dependencies. Replaces "navy and white, restrained radar styling". This is a visual/wording change only — gameplay, acceptance, accessibility and testing requirements unchanged. | **Approved by Alex** |
| D12 | 2026-09-30 | Development-only browser check `tools/check-hover-preview.mjs` (headless Chrome, not shipped) added as the regression test for bug B1, since the Node tests cover only the rules engine. | Proposed (Devin) |
| D13 | 2026-09-30 | Milestone 1 "Start battle" only locks the board and says firing arrives in Milestone 2. Turn-taking and the opponent are out of scope for Milestone 1, per Alex's instruction. | Per Alex's instruction |
| D14 | 2026-09-30 | Start battle is gated on a full-fleet check (`validateFleet`: every ship placed exactly once, correct length, one straight line, on the board, no overlap) rather than only "all five present", per Alex's restated Milestone 1 brief ("Validate ship lengths, boundaries, overlap, and a complete fleet before enabling Start"). | Per Alex's instruction |
| D15 | 2026-09-30 | Alex asked: "the arrow keys should rotate the ships", ships that "look like real Royal Navy ships from that era (and the opposing fleet)", and "the flags of the countries that are fighting next to their headlines". Implementation (Devin's interpretation, awaiting Alex's review): while pointing at the Royal Navy board with the mouse, ←/→ set horizontal and ↑/↓ set vertical; when the board is reached by keyboard (Tab), arrows still move the cursor so keyboard-only play keeps working, and R still rotates. Ships are drawn as simplified period sailing warships (side view in the fleet lists, top-down deck view on the board): hulls, gunport rows, masts and sails; the 5-ship has three gun decks, the 2-ship has two masts. Royal Navy ships use black hulls with yellow gunport bands (the "Nelson chequer"); French and Spanish ships use red bands, each flying its own ensign. Flags: 1801 White Ensign beside "Royal Navy Fleet"; French tricolour and 1785 Spanish naval ensign beside "Franco-Spanish Fleet". All drawn as inline SVG in `src/art.js` — no images, no dependencies, no animation. Stylised, not historically exact. | Requested by Alex; interpretation proposed (Devin) |
| D16 | 2026-10-02 | Game rules live in `src/game.js` (shots, turns, sunk, winner; no page code). The turn timing (computer delay, cancelling on Restart) lives in `src/battle.js`, which takes its timer functions as inputs so tests can control time exactly. The random opponent (`src/opponent.js`) is handed only its own earlier shots and their results. | Proposed (Devin) |
| D17 | 2026-10-02 | The computer waits 0.8 seconds before firing, so you can see whose turn it is. During that time the enemy board refuses shots with "Hold fire — the Franco-Spanish Fleet is firing." | Proposed (Devin) |
| D18 | 2026-10-02 | Restart is a full reset: the pending computer shot is cancelled, the shot log, marks and messages are cleared, the Royal Navy board is emptied for fresh placement, and the Franco-Spanish Fleet is placed again at random. | Proposed (Devin) |
| D19 | 2026-10-02 | A hit on an enemy ship does not reveal which ship it was; the name and drawing are revealed only when that ship is sunk. Enemy ships that were never sunk stay hidden after a defeat. | Proposed (Devin) |

## Questions raised by Alex

_None yet._

## Milestone acceptance

| Milestone | PR | Accepted by Alex? | Notes |
|-----------|----|-------------------|-------|
| 0 — Spec and plan | https://github.com/Ello-Guvnor/HMSVictory/pull/1 | Pending | Theme amendment added at Alex's request |
| 1 — Placement | https://github.com/Ello-Guvnor/HMSVictory/pull/2 | **Accepted** (2026-10-02: "Accept Mile Stone 1 - Moving to Mile Stone 2") | Devin Review: 1 flag (fixed, see BUGS.md B2), 0 bugs. Browser testing found B1 (fixed). |
| 2 — Game rules | PR to follow (branch `devin/1790943284-m2-game-rules`) | Pending | |
| 3 — Computer strategy | | Pending | |
| 4 — Release | | Pending | |
