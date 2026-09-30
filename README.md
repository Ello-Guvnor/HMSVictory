# HMS Victory

*Built with Devin, captained by Alex.*

A browser Battleship game with a Trafalgar-inspired theme: the Royal Navy Fleet against the Franco-Spanish Fleet. The opponent is a computer strategy, not an AI or LLM. Ship names are thematic labels, not a historical record.

Plain HTML, CSS and JavaScript. No runtime libraries, no backend, no login.

## Status

Milestone 1 (placement) is built. You can place ships but can't fire yet; turn-taking and the computer opponent come in later milestones. See [PLAN.md](PLAN.md).

## Play locally

The game uses JavaScript modules, so browsers won't run it straight from a file. Serve the folder with any static server, for example:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

Add `?seed=123` to the URL to make "random" placement repeat exactly (useful for demos and bug reports).

## Tests

The rules are in `src/engine.js`, which contains no page code, so they can be tested on their own. Tests use Node's built-in test runner (Node 20 or newer, development only):

```sh
npm test        # same as: node --test
```

Development-only browser check (needs Google Chrome and the local server running). It confirms the square under the pointer shows the same placement preview colour as the rest of the preview:

```sh
node tools/check-hover-preview.mjs http://localhost:8000
```

## Files

- `index.html`, `styles.css`: the page and its styling
- `src/engine.js`: game rules (board, fleets, placement)
- `src/rng.js`: seeded random numbers, so tests can be repeated exactly
- `src/ui.js`: connects the rules to the page
- `tests/`: automated tests
- `tools/`: development-only checks (not part of the game)

## Project records

- [SPEC.md](SPEC.md): requirements
- [PLAN.md](PLAN.md): milestones, acceptance criteria, checklist
- [DECISIONS.md](DECISIONS.md): scope choices, questions, milestone acceptance
- [BUGS.md](BUGS.md): observed defects and untested risks
