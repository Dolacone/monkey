# AGENTS.md

## Git Conventions

- Never bypass `.gitignore`. Do not use `git add -f` or any other mechanism to force-track ignored files. Files listed in `.gitignore` (currently: `CHANGELOG.md`, `/docs`) must never appear in commits.

## Documentation Conventions

- Every script file must have a same-named markdown file as its documentation (e.g. `fight-shortcuts.js` → `fight-shortcuts.md`).
- When creating or modifying a script, create or update the corresponding `.md` file in the same directory.
- Treat same-named `.md` files as the canonical documentation for that script — read them before modifying the script, and keep them in sync after changes.

### Folders using acdd

- A folder that contains `requirements/` has adopted acdd for that folder only. Adoption is per folder — it does not extend to sibling or parent folders.
- In such a folder, `requirements/*.md` is the sole source of truth for behavior. The same-named `.md` (e.g. `fight-shortcuts.md`) narrows to how the script runs: page scope, entry points, DOM hooks, and selector stability notes — not a behavior list.
- The same narrowing applies to a test file's same-named `.md` (e.g. `fight-shortcuts.test.md`): it states what is tested and why, not the behavior itself.
- `DESIGN.md` holds implementation trade-offs and test-coverage notes, cross-referenced by REQ number.
- A folder without `requirements/` keeps the original rule: the same-named `.md` is the full behavior documentation.

## Tampermonkey Conventions

- Version bump: when a change document status is set to Done, bump the version number in the corresponding JS script using semantic versioning (semver: MAJOR.MINOR.PATCH).
  - PATCH: bug fixes
  - MINOR: new features, backwards-compatible
  - MAJOR: breaking changes
