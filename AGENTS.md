# AGENTS.md

## Git Conventions

- Never bypass `.gitignore`. Do not use `git add -f` or any other mechanism to force-track ignored files. Files listed in `.gitignore` (currently: `CHANGELOG.md`, `/docs`) must never appear in commits.

## Tampermonkey Conventions

- Version bump: when a change document status is set to Done, bump the version number in the corresponding JS script using semantic versioning (semver: MAJOR.MINOR.PATCH).
  - PATCH: bug fixes
  - MINOR: new features, backwards-compatible
  - MAJOR: breaking changes
