# Optimize RPG Studio data loading

## Summary

Reduce redundant data loading and add opt-in diagnostics for route, server operation and Prisma query timings.

## Changes

- Centralize shell and file-list reads in services.
- Parallelize independent reads and lazy-load heavy client panels.
- Add `CampaignFile` indexes for active/archive/trash lists.
- Add `Server-Timing` and structured `[perf]` logs behind environment flags.

## Performance Results

This branch does not claim a before/after benchmark. Collect measurements with `PERFORMANCE_LOGS=true` and the procedure in `docs/PERFORMANCE.md` on a representative isolated dataset.

## Database

Migration: `20261124170000_add_campaign_file_list_indexes`. It adds two non-destructive composite indexes.

## Dependencies

The branch follows the document-editor base because the historical optimization commit was made after that feature.
