# fight-shortcuts.test.js

Regression tests for `fight-shortcuts.js` using focused fake DOM objects for the fight overlay behavior.

The tests document the intended behavior:

- Defender armor overlay must update when armor areas arrive after an initial `No armor` render.
- Action log observer must attach once, even when started repeatedly.
- Action log overlay order should match Torn's original action log order: latest event first.
- Rebuilt action log lists should fully replace the overlay log section from current rows.
