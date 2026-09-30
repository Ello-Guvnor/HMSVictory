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
| D4 | 2026-09-30 | In milestone 2 the computer fires random legal shots as a temporary stand-in, so turn rules can be verified before the strategy exists. Replaced in milestone 3. | Proposed (Devin) |
| D5 | 2026-09-30 | Hosting: GitHub Pages on this repo (free, static, no paid services). | Proposed (Devin) |
| D6 | 2026-09-30 | ~~Board labels "Your fleet — HMS Victory" / "Enemy waters — Spanish Armada".~~ Superseded by D7. | Superseded |
| D7 | 2026-09-30 | Theme: game title "HMS Victory", subtitle "Built with Devin, captained by Alex."; Trafalgar-inspired Royal Navy vs Franco-Spanish Fleet; boards "Royal Navy Fleet" (human) and "Franco-Spanish Fleet" (computer); no "Fleet Command" or "Spanish Armada" wording. | **Approved by Alex** |
| D8 | 2026-09-30 | Human ships: Victory 5, Sovereign 4, Vanguard 3, Defiance 3, Swift 2 — thematic labels, not a claim to reproduce the historical fleet. | **Approved by Alex** |
| D9 | 2026-09-30 | Opponent ships (Alex asked Devin to choose five distinct period-appropriate names): Santísima Trinidad 5, Bucentaure 4, Redoutable 3, Santa Ana 3, Argonaute 2. Thematic labels only. | Chosen by Devin at Alex's request — awaiting Alex's review |
| D10 | 2026-09-30 | Themed messages, e.g. "Royal Navy’s turn", "Franco-Spanish Fleet is firing", "Enemy ship sunk", "Royal Navy victory", "Your fleet has been defeated". | **Approved by Alex** |
| D12 | 2026-09-30 | Development-only browser check `tools/check-hover-preview.mjs` (headless Chrome, not shipped) added as the regression test for bug B1, since the Node tests cover only the rules engine. | Proposed (Devin) |
| D13 | 2026-09-30 | Milestone 1 "Start battle" only locks the board and says firing arrives in Milestone 2. Turn-taking and the opponent are out of scope for Milestone 1, per Alex's instruction. | Per Alex's instruction |
| D14 | 2026-09-30 | Start battle is gated on a full-fleet check (`validateFleet`: every ship placed exactly once, correct length, one straight line, on the board, no overlap) rather than only "all five present", per Alex's restated Milestone 1 brief ("Validate ship lengths, boundaries, overlap, and a complete fleet before enabling Start"). | Per Alex's instruction |
| D11 | 2026-09-30 | Visual style: navy blue, parchment/cream, restrained brass accents, clear coordinates, simple ship silhouettes; no elaborate animations or new dependencies. Replaces "navy and white, restrained radar styling". This is a visual/wording change only — gameplay, acceptance, accessibility and testing requirements unchanged. | **Approved by Alex** |

## Questions raised by Alex

_None yet._

## Milestone acceptance

| Milestone | PR | Accepted by Alex? | Notes |
|-----------|----|-------------------|-------|
| 0 — Spec and plan | https://github.com/Ello-Guvnor/HMSVictory/pull/1 | Pending | Theme amendment added at Alex's request |
| 1 — Placement | https://github.com/Ello-Guvnor/HMSVictory/pull/2 | Pending | Devin Review: 1 flag (fixed, see BUGS.md B2), 0 bugs. Browser testing found B1 (fixed). |
| 2 — Game rules | | Pending | |
| 3 — Computer strategy | | Pending | |
| 4 — Release | | Pending | |
