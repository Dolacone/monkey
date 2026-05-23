# Changelog

## 2026-05-23 (2)

### fight-shortcuts.js — Fix Armor Overlay Position

Armor info text is now rendered as an absolute-positioned transparent overlay on top of the enemy model instead of a DOM-flow element before it, preventing the model from being displaced.

## 2026-05-23

### fight-shortcuts.js — Armor Overlay & Weapon Highlight

After "Start fight" is clicked (via space or mouse), automatically detect the defender's armor set and:
- Display each armor piece as text above the defender's model window
- Highlight the attacker's recommended weapon slots in blue (assault→1&2, riot→3, vanguard→4)

Uses MutationObserver to detect fight start; retries up to 5× (500ms intervals) if armor data is not yet in the DOM.
