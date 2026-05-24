# AGENTS.md

## Git Conventions

- Never bypass `.gitignore`. Do not use `git add -f` or any other mechanism to force-track ignored files. Files listed in `.gitignore` (currently: `CHANGELOG.md`, `/docs`) must never appear in commits.

## Documentation Conventions

- Every script file must have a same-named markdown file as its documentation (e.g. `fight-shortcuts.js` → `fight-shortcuts.md`).
- When creating or modifying a script, create or update the corresponding `.md` file in the same directory.
- Treat same-named `.md` files as the canonical documentation for that script — read them before modifying the script, and keep them in sync after changes.

## Tampermonkey Conventions

- Version bump: when a change document status is set to Done, bump the version number in the corresponding JS script using semantic versioning (semver: MAJOR.MINOR.PATCH).
  - PATCH: bug fixes
  - MINOR: new features, backwards-compatible
  - MAJOR: breaking changes
