# BUGS

Only defects actually observed are logged here. Each entry has: reproduction steps, expected vs actual, cause, fix, regression test, verifying commit.

## Confirmed bugs

### B1 — Hovered square ignores the placement preview colour
- Found: 2026-09-30, Milestone 1, browser test run by Devin's testing agent on commit `01f1dbb`.
- Steps to reproduce: open `/?seed=42` with Victory as the next ship; hover A1 (legal) and then A8 (runs off the board).
- Expected: every preview square, including the one under the pointer, is green when legal and red with × when illegal.
- Actual (01f1dbb): the square under the pointer stayed **blue**; the rest of the preview was coloured correctly. The × and the rejection message still worked.
- Cause: the CSS hover rule `.cell:hover:not(:disabled)` was more specific than `.cell.preview-ok` / `.cell.preview-bad`, so it won on the hovered square.
- First fix attempt (`74f9dec`) was **incomplete**: it stopped that hover rule applying to preview squares, but then the general `button:hover` rule (parchment) won instead. The testing agent's re-check observed a **parchment** hovered square.
- Fix (`728540c`): preview colours now also apply in the hover state (`.cell.preview-ok:hover`, `.cell.preview-bad:hover`).
- Regression test: `node tools/check-hover-preview.mjs http://localhost:8000` (development-only, headless Chrome). It hovers A1 and A8 and compares the hovered square's colour with its neighbour's. Actual results:
  - `01f1dbb`: FAIL on both (hovered `rgb(36, 71, 122)` vs neighbour `rgb(44, 90, 58)` / `rgb(90, 44, 44)`)
  - `74f9dec`: FAIL on both (hovered `rgb(243, 234, 211)`, parchment)
  - `728540c`: PASS on both (hovered colour matches neighbour)
- Visual confirmation: the testing agent's browser re-check on `728540c` saw a green hovered A1 and a red hovered A8 with ×.
- Verifying commit: `728540c`.

### B2 — Screen readers were not told whether a placement position is legal
- Found: 2026-09-30, Milestone 1, flagged by Devin Review on PR #2 (commit `01f1dbb`) and confirmed by reading the code: a cell's accessible label named the ship and orientation but not whether it could go there. Sighted users could tell from colour and the × marker.
- Steps to reproduce: with a screen reader or the accessibility tree, focus A8 on the Royal Navy board with Victory next.
- Expected: the label says the position is not allowed, and why.
- Actual (01f1dbb): the label read "A8, open water. Place Victory here, horizontal", with no validity.
- Cause: the label was built without calling the placement validator.
- Fix (`b51dd5e`): during placement, every cell's label ends with ": allowed" or ": not allowed, <reason>" (off board / overlaps <ship>).
- Regression test: no automated test. The label is built in the page code (`src/ui.js`), and the automated tests cover only the rules engine. The testing agent verified it in the browser's accessibility tree: A1 allowed; A8 not allowed (off board); A3 after placing Victory not allowed (overlaps Victory); all 100 cells labelled (60 allowed, 40 not allowed on an empty board).
- Verifying commit: `b51dd5e`.

### B3 — Browser check left temporary Chrome profiles on disk (development tool only)
- Found: 2026-09-30, Milestone 1. Devin Review flagged it on PR #2 (commit `5ad9315`). Confirmed on the machine: 5 leftover `hms-check-*` profile folders in the temp directory after earlier runs.
- Steps to reproduce: run `node tools/check-hover-preview.mjs` several times, then list `hms-check-*` folders in the temp directory.
- Expected: no folders left behind.
- Actual: one new folder per run.
- Cause: the script created a Chrome profile folder but never deleted it.
- Fix (`cd1611b`): after Chrome exits, the script deletes its profile folder.
- Regression test: manual only. After the fix, one run left 0 `hms-check-*` folders. Affects only the development tool, not the game.
- Verifying commit: `cd1611b`.

### B4 — Placing a ship shifted the board squares away from their coordinates
- Found: 2026-09-30, Milestone 1, browser test run by Devin's testing agent on commit `11c4b74` (the commit that added the warship drawings).
- Steps to reproduce: open `/?seed=42`, place Victory at A1 horizontally (or press Random placement).
- Expected: every square stays under its coordinate labels; the ship drawing sits exactly on the ship's squares.
- Actual (11c4b74): the Victory drawing sat on A1–A5, but the clickable A1–A5 squares moved to columns 6–10 and every later square and row label shifted along. Clicks and the red overlap preview therefore landed away from the drawing.
- Cause: the board is a CSS grid. The ship drawings were given fixed grid positions while squares and labels were placed automatically, so the browser flowed the squares around the drawings.
- Fix (`4b9b7c8`): every square and label is given its own fixed row and column.
- Regression test: `node tools/check-hover-preview.mjs http://localhost:8000` now also presses Random placement and checks that all 100 squares sit under their row and column labels. Actual results: `11c4b74` FAIL (99 squares misplaced); `4b9b7c8` PASS (0 misplaced).
- Verifying commit: `4b9b7c8`.

<!-- Template
### B<n> — short title
- Found: date, milestone, how (test / manual check / review)
- Steps to reproduce:
- Expected:
- Actual:
- Cause:
- Fix:
- Regression test:
- Verifying commit:
-->

## Untested risks (not bugs)

Things that have not been verified yet. Moved or removed once checked.

- Physical phones and non-Chrome browsers (Safari, Firefox) have not been tested. Mobile was checked only with Chrome's phone-size emulation (390×844, touch).
- Spoken screen-reader output (e.g. VoiceOver, NVDA) has not been tested. Only the labels in the accessibility tree were checked.
- On touch screens there is no hover preview: a tap places the ship at once. Clear fleet is the only way to undo.
