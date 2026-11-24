# Render file explorers with initial data

## Summary

Pass server-loaded file explorer data into the client to avoid a redundant first fetch.

## Changes

- Add `fileExplorerService` for shared initial list data.
- Update campaign file-list pages and `FileExplorer` to accept initial data.
- Preserve filters, sorting, archive/trash scopes and existing API contracts.

## Testing

Run the full typecheck, lint, test and build validation on top of the data-loading contribution. Browser verification should confirm empty, loading, filter and pagination-like states where applicable.

## Dependencies

Requires `perf/rpg-studio-data-loading`.
