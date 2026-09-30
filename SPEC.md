# SPEC — HMS Victory Battleship

This file records Alex Price's requirements word for word. It is the source of truth for scope.
Clarifications and tradeoffs live in DECISIONS.md, not here.

## 1. Game specification (Alex, verbatim)

> I am Alex Price, an enterprise salesperson preparing for a Cognition interview. Help me build a polished browser Battleship game as the HMS Victory (England) against a the Spanish Armada.  I am not a developer. Explain decisions in plain English and give me one concrete action at a time whenever you need account setup from me.
>
> Save these requirements as SPEC.md. Propose a short plan and acceptance criteria for each of the four milestones in my opening brief, then wait for me to start milestone 1. Use HTML, CSS, and JavaScript with no runtime libraries, login, paid services, external AI API, or backend. A development-only test tool is acceptable if it makes verification easier. Keep game rules separate from the interface so they can be tested.
>
> Use a 10 by 10 board and five ships of lengths 5, 4, 3, 3, and 2. Allow random placement and click-based manual placement with a rotate control. Ships cannot overlap or extend off the board. Touching ships are allowed. Enable play only after placement is complete. The human shoots first; turns alternate after each valid shot, including hits. Reject repeated shots without consuming a turn. Show hit, miss, sunk, whose turn it is, and a clear win or loss. Stop all moves after the game ends. Restart must cancel any pending computer move and reset all state.
>
> The computer opponent should use a simple hunt-and-target strategy. It may use only its own prior shots and hit or sunk feedback when choosing a move. It must not inspect unshot player ship locations. The game engine may check a chosen shot against ship locations to resolve the result. Label this as a computer strategy, not an LLM. Use deterministic seeds or injected randomness for reproducible tests.
>
> Design it as “The Royal Navy — Built with Devin, captained by Alex.” Make it clean and easy to demonstrate: navy and white, restrained radar styling, readable grid coordinates, two clearly labeled boards, short instructions, and no sound by default. Desktop and mobile must be usable. Use text or symbols as well as color. Essential keyboard and focus behavior should work. Functionality comes before effects.
>
> Create a README, automated tests for core rules, BUGS.md, and DECISIONS.md. In DECISIONS.md record meaningful scope choices, questions I raise, and how I accept each milestone. Log only defects actually observed, with reproduction steps, expected versus actual behavior, cause, fix, regression test, and verifying commit. Keep untested risks separate from confirmed bugs. Do not invent bugs or claim tests passed unless they ran. Record actual commands and results.
>
> Work only in my own repository. Never include credentials, customer data, or my interview email. Prepare the production build and a stable public deployment using an available host; tell me if setup or access is missing. Report the live URL, source URL, bug document URL, test results, and remaining limitations when complete.

## 2. Working rules from Alex's opening brief (verbatim excerpts, Battleship workstream only)

> build a browser Battleship game against a computer opponent and produce a public playable URL, public GitHub repository, and an honest bug-and-fix document.

> Save it as SPEC.md, maintain a checklist, and work through four milestones: placement, game rules, computer strategy, and release. Finish and verify each milestone before starting the next. Use the same session unless a fresh session is useful; preserve all context in the repo if we switch.

> Maintain BUGS.md for observed defects and DECISIONS.md for my requirements, tradeoffs, questions, and acceptance decisions. Do not invent defects, performance gains, test results, or decisions attributed to me. At every checkpoint, give me: what changed, actual test results, a preview I can inspect, the PR or diff, and one recommended next action. Pause there for my review.

> Capture useful screenshots and test recordings as we go. Do not turn on recurring automation or paid cloud infrastructure just to satisfy a screenshot checklist.

> Keep the game static, simple, and reliable. Use my own new repository and preserve my existing flight simulator. Tell me exactly which account setup steps I need to perform, one at a time. Do not send any email or submit my interview
