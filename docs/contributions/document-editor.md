# Add encyclopedia document editor modes

## Summary

Add read, visual-editing and Markdown modes to the campaign file editor.

## Changes

- Add the reusable `DocumentEditor` component.
- Add Markdown-to-HTML, HTML-to-Markdown and outline helpers.
- Support focus mode, headings, lists, code blocks, entity links and safe URLs.
- Keep the existing file autosave, metadata, tags, attachments, relations and history flows.

## Testing

Markdown conversion and outline behavior are covered by Vitest. Run typecheck, lint and production build for the target base. Browser editing and accessibility still require manual validation.

## Breaking Changes

None identified. The parser intentionally supports a documented subset of Markdown.
