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
| D6 | 2026-09-30 | Board labels: "Your fleet — HMS Victory" and "Enemy waters — Spanish Armada". | Proposed (Devin) |

## Questions raised by Alex

_None yet._

## Milestone acceptance

| Milestone | PR | Accepted by Alex? | Notes |
|-----------|----|-------------------|-------|
| 0 — Spec and plan | _this PR_ | Pending | |
| 1 — Placement | | Pending | |
| 2 — Game rules | | Pending | |
| 3 — Computer strategy | | Pending | |
| 4 — Release | | Pending | |
