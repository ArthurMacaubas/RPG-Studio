# Add generic 3DeT Victory support

## Summary

Add a generic 3DeT Victory system preset, adaptive sheet fields, contextual roller and concise rule summary.

## Changes

- Add `THREEDET_VICTORY` to `SystemType`.
- Add pure calculations for resources, builds, dice, opposed tests, damage and experience.
- Add the rules page and adaptive character-sheet integration.

## Testing

The pure 3DeT and API behaviors are covered by Vitest tests. Run the full branch validation commands before publication; migration validation requires an isolated PostgreSQL database.

## Database

Migration: `20261124100000_add_3det_victory`. It only adds an enum value and does not rewrite existing rows.

## Scope

The rules summary is generic and does not include campaign content or protected book excerpts.
