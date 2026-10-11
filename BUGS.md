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

### B5 — A fired-at square lost its scorch or ripple marking while the pointer was over it
- Found: 2026-10-02, Milestone 2 (cannon-fire effects, D20), browser test run by Devin's testing agent on commit `92530ac`.
- Steps to reproduce: open `/?seed=42`, press Random placement, then Start battle, fire at F1 on the Franco-Spanish board and leave the pointer on F1.
- Expected: F1 keeps its new hit marking (orange scorch with ✕) whether or not the pointer is over it.
- Actual (92530ac): while hovered, F1 showed only a plain ✕ on the hover colour; the scorch appeared once the pointer moved away and vanished again on hover. Misses lost their ripple rings the same way. The ✕ / • symbols stayed visible.
- Cause: the general button hover style (`button:hover:not(:disabled)`) sets the whole background, and it was more specific than the new hit/miss styles, so it wiped their background drawing.
- Fix (`46b8ac1`): the hit, miss and sunk styles are scoped to the board (`.board .cell.hit` etc.), which makes them more specific than the button hover style.
- Regression test: `node tools/check-hover-preview.mjs http://localhost:8000` now also starts a battle, fires at F1, points at it and checks the marking is still drawn. Actual results: `92530ac` FAIL (`background-image=none`); `46b8ac1` PASS.
- Verifying commit: `46b8ac1`.

### B6 — After the game ended, the enemy board showed a busy (spinning) cursor
- Found: 2026-10-09, Milestone 3 review, reported by Alex after winning a game in the preview ("all i got was a spinning wheel"), on commit `5f2ad91`.
- Steps to reproduce: play a game to a win (or loss), then point at the Franco-Spanish board.
- Expected: once the game is over, nothing suggests the game is still working.
- Actual (`5f2ad91`): the pointer over the enemy board became the busy cursor (spinning wheel) and stayed that way.
- Cause: the "Hold fire" check was `game.turn !== ROYAL_NAVY`. When a game ends, `turn` becomes empty, so the board looked as if it were still waiting for the computer, and kept the busy cursor.
- Fix (`9cd226e`): the busy state now applies only while the battle is still in progress.
- Regression test: `node tools/check-hover-preview.mjs http://localhost:8000` now plays a seeded game to a win and checks the enemy board is not busy and its cursor is not `wait`. Actual results: with the old check FAIL (`waiting=true cursor=wait`); `9cd226e` PASS (`waiting=false cursor=pointer`).
- Verifying commit: `9cd226e`.

### B7 — On-page instructions said Restart works "at any time" (usability / documentation)
- Found: 2026-10-09, Milestone 4 review. Devin Review flag "Restart instructions overstate availability" on https://github.com/Ello-Guvnor/HMSVictory/pull/5, raised for Alex's attention and confirmed in the browser on commit `769fadf`.
- Steps to reproduce: open the game and read the Orders ("Restart starts a new game at any time"), then look at the Restart button while placing ships.
- Expected: the instructions describe the controls as they behave.
- Actual (`769fadf`): Restart is greyed out (disabled) while placing ships; it only unlocks once the battle starts and stays available after it ends. Clear fleet works only while placing, which the Orders did not mention.
- Cause: the instruction line was written for Milestone 4 without checking the button states; the controls behave as designed (D18).
- Fix (`e6bda40`): wording only; the controls are unchanged. The Orders now say Clear fleet "works only while placing" and that Restart "unlocks once the battle begins and stays available after it ends … Before battle, use Clear fleet instead." The README's "How to play" says the same.
- Regression test: `node tools/check-hover-preview.mjs http://localhost:8000` now reads both buttons while placing, during battle and at game over, and checks the Orders wording. Actual results: with the `769fadf` page FAIL (`placing clear=on restart=off; battle clear=off restart=on; game over clear=off restart=on; orders-wording-ok=false`); `e6bda40` PASS (same states, `orders-wording-ok=true`).
- Verifying commit: `e6bda40`.

### B8 — On an iPhone there was no visible way to turn ships (usability)
- Found: 2026-10-10, by Alex playing the live site (https://ello-guvnor.github.io/HMSVictory/) on his iPhone after the release: "I could place them but I couldn't make them go vertical or horizontal."
- Steps to reproduce (`587f8dd`): open the game on a phone, scroll to the Royal Navy Fleet board and tap squares to place ships; try to make a ship vertical.
- Expected: a phone player can choose each ship's direction, and fix one already placed.
- Actual (`587f8dd`): ships could be placed but not turned from the board. Tapping a placed ship only showed "would overlap". Not reproduced on a real iPhone by Devin; confirmed by reading the code and in Chrome phone emulation.
- Cause (likely): the only touch control for direction was the Rotate button in the Orders panel, well above the board on a phone screen; R and the arrow keys need a keyboard; phones have no hover preview, so changing direction gave no visible sign at the board; and a placed ship could not be turned at all.
- Fix (`25c26b3`): a "↻ Turn next ship: Horizontal →/Vertical ↓" button directly above your board while ships remain, and tapping (or clicking, or Enter on) a placed ship turns it about its first square if the turn is legal; otherwise the status explains why and the ship stays put. New engine function `rotateShip` keeps the rule out of the page code.
- Regression test: 4 new `npm test` cases for `rotateShip` (turn and turn back, off-board and overlap refusals, missing ship, rotated fleet still valid); `node tools/check-hover-preview.mjs` gains a "phone taps" check (390px, touch emulation) that taps the Turn button, places Victory vertically, taps it to turn it horizontal, and confirms a turn off the board is refused. Actual result on `25c26b3`: PASS.
- Verifying commit: `25c26b3`. Confirmed working by Alex on his iPhone on the live site (2026-10-10).

### B9 — On a phone, taps on the enemy board seemed to be ignored (usability)
- Found: 2026-10-10, by Alex playing the live site on his iPhone: "sometimes when i tried to fire a shot on the mobile it didn't catch it and then i had to tap the square that i wanted to fire at again. happened a few times."
- Steps to reproduce (`3e1ea1a`): Chrome phone emulation, 390×844 with touch. Start a battle, scroll so the Franco-Spanish board fills the screen, and tap a square, then another one less than about a second later.
- Expected: it is clear whether a tap fired, and when you can fire again.
- Actual (`3e1ea1a`): the second tap was refused with "Hold fire — the Franco-Spanish Fleet is firing." But that message, the turn banner and your own board were all off screen, so the tap simply looked ignored. Measured: 7 of 16 taps spaced 0.3–0.9 s apart were refused; 0 of 12 taps spaced 1.1 s or more were refused. Not reproduced on a real iPhone by Devin.
- Cause (likely): by design (SPEC, D17), taps during the computer's 0.8 s turn are refused. On a phone the only signs of that turn were above or below the enemy board, out of view, and the busy cursor does not exist on touch screens.
- Fix (`11b3ea5`): a strip directly above the enemy board shows "▶ Your turn — tap a square to fire" or "… Enemy firing — hold fire", plus the last shot ("They fired at C1: miss"). During the enemy's turn the board's squares dim. A refused tap makes the strip shake with a red outline (a static outline with reduced motion). Follow-up (`e820beb`, from Devin Review): the strip stays pinned to the top of the screen while the board is scrolled, which matters on short or landscape screens; at game over it shows the final shot; and the reduced-motion outline clears on the next update. Turn rules and the 0.8 s delay are unchanged. `touch-action: manipulation` was also added to the boards so quick taps cannot be taken as a double-tap zoom. That is a precaution for iPhone Safari; it was not observed in Chrome.
- Regression test: `node tools/check-hover-preview.mjs` gains a "phone firing" check (390px, touch emulation). It taps twice quickly and confirms that only one shot fires, that the strip is on screen, says "hold fire" and flashes, and that the board is dimmed. After the delay the strip says "Your turn", the next tap fires, and the strip height does not change. A "landscape phone" check (844×390) keeps the strip on screen with row J at the bottom, and the win check confirms the strip names the winning shot. Actual result on `e820beb`: PASS.
- Verifying commit: `11b3ea5`. Confirmed working by Alex on his iPhone on the live site (2026-10-10, release `cf28da9`).

### B10 — On a wide screen the enemy board sat lower than yours (usability / layout)
- Found: 2026-10-10, by Alex in Safari on his Mac, live site (`cf28da9`): "It looks a bit lop sided now. The left is higher than the right."
- Steps to reproduce (`cf28da9`): at desktop width (boards side by side), place your fleet and start a battle.
- Expected: the two boards start at the same height.
- Actual (`cf28da9`): the turn strip added for B9 sits above the enemy board only, so the enemy board started 58 px lower than yours once your fleet was placed and throughout the battle (6 px lower while placing, where the ↻ Turn next ship button partly balanced it). Measured in Chrome and in WebKit (Safari's engine).
- Cause: B9 added a strip on one side only, with nothing matching on your side.
- Fix: your board gets a matching strip of the same height when the ↻ Turn next ship button is not shown: "⚓ Fleet ready — press Start battle" once all ships are placed, then "⚓ Your fleet: 5 of 5 afloat" with the enemy's last shot at you during and after the battle. The button and both strips have the same fixed height. On phones the boards are stacked, so this only adds a status line above your board there.
- Regression test: `node tools/check-hover-preview.mjs` gains a "side-by-side boards start level" check at 1280 px. On `cf28da9` it fails (offsets -6 / -58 / -58 px); with the fix it passes (0 / 0 / 0 px). The same 0 px result was measured in WebKit desktop.
- Verifying commit: this PR.

### B11 — After sinking a ship, the computer could forget a hit on a touching ship (computer strategy)
- Found: 2026-10-09, Milestone 3. Seen in simulated games and flagged by Devin Review on https://github.com/Ello-Guvnor/HMSVictory/pull/4; recorded then as the D21 tradeoff, not as a bug. Reproduced with a deterministic test on 2026-10-10 at Alex's request.
- Steps to reproduce (`232e382`): Swift on A1–A2 touches Vanguard on A3–A5. The computer's shots: A3 hit (Vanguard), A2 hit (Swift), A1 sinks Swift. Ask it for its next shot.
- Expected: it fires next to A3 (A4 or B3) to finish Vanguard.
- Actual (`232e382`): it goes back to hunting elsewhere (G5 in the test). It comes back to A3 only once the checkerboard is used up. Over 1,000 simulated random fleets, 165 games had at least one hunting shot while a hit ship was still afloat (2,677 such shots in total).
- Cause: the computer was told only that a shot sank a ship, not which one. It guessed that the sunk ship was the whole straight run of hits through the sinking shot. When ships touch end to end, that run also contains the other ship's hits, so those were written off as sunk.
- Fix (`60951b2`): when a ship sinks, the computer is also told the sunk ship's length. The game already announces which ship sank, and every ship's length is public. It writes off only the hits that belong to every possible position of a ship of that length through the sinking shot. If two positions are possible, the extra hits stay open and are chased, which can cost a few shots but never loses a hit. It is still never shown where any unsunk ship is (D28).
- Regression test: 4 new `npm test` cases: the A1–A3 reproduction above; a sinking that could be either of two lines; a full-game check on three touching layouts (end to end in rows, end to end in columns, side by side; 200 seeds each); and the same check on 500 random fleets. The full-game checks fail if the computer ever hunts while a hit ship is afloat, or repeats a square. A battle test confirms the computer receives exactly `{ row, col, result }`, plus `sunkLength` on a sinking that matches the announced ship. With the tests added to `232e382` (commit `4cfed0e`), 4 of 73 fail; with the fix, 73 of 73 pass. Over 1,000 simulated random fleets: 0 hunting shots while a hit ship was afloat, 0 repeats, an average of 50.9 shots to win (was 52.6), median 52 (was 53), range 21–68 (was 28–75). `node tools/check-hover-preview.mjs` passes 10 of 10, and a full browser game the computer won (62 shots) had no page errors.
- Verifying commit: `60951b2`.

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

- Tested by Alex: the live site on his iPhone (he confirmed that turning ships (B8) and firing (B9) work) and on his Mac in Chrome and Safari. Devin's own checks use Chrome on Linux, including phone-size emulation (390×844, touch). Firefox and other phones have not been tested.
- Spoken screen-reader output (e.g. VoiceOver, NVDA) has not been tested. Only the labels in the accessibility tree were checked.
- On touch screens there is no hover preview: a tap places the ship at once. Clear fleet is the only way to undo.
