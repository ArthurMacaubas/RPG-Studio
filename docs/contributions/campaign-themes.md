# Add generic campaign themes

## Summary

Add campaign-scoped themes with reusable generic presets and a draft/published lifecycle.

## Changes

- Add `CampaignTheme` and `ThemePreset` persistence.
- Add validated editor actions for create, import, update, publish, apply, restore, duplicate and preset creation.
- Add RPG Studio, Medieval Fantasy and Cyberpunk generic presets.
- Keep unpublished drafts out of the campaign/player runtime.

## Testing

Run `npm run prisma:validate`, `npm run prisma:format`, `npx tsc --noEmit`, `npm run lint`, `npm run test:run` and `npm run build` on the target base. PostgreSQL migration testing requires an isolated database.

## Database

Migration: `20261124150000_campaign_themes`. It is additive and creates theme tables, indexes, foreign keys and the active-theme relation.

## Scope

This branch contains no campaign-specific preset, narrative, private asset or environment credential.
