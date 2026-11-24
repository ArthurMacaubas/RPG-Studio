# Improve responsive campaign layouts

## Summary

Contain the campaign shell, file grids, document editor and shared controls across narrow viewports.

## Changes

- Adjust responsive CSS Modules for campaign, player and file views.
- Preserve navigation, editor actions, focus states and existing API behavior.
- Keep the editor-specific containment in the same contribution because it depends on the editor markup.

## Testing

Run typecheck, lint, tests and production build. Manually verify narrow and wide viewports, keyboard focus, disabled/loading controls and document editing.

## Dependencies

The branch follows the server-rendered explorer branch because the responsive changes were authored after that chain. No screenshots are claimed by this branch.
