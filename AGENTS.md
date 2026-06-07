# AGENTS.md - guide for AI coding agents

## Project context

Commlink-Directory is a static JavaScript contact directory backed by XML data.
Start with `README.md`, `index.html`, `app.js`, and `sample-directory.xml`.

## Local setup

No dependency installation is required for the basic static app.

## Smoke test

```bash
python3 -c "import xml.etree.ElementTree as ET; ET.parse('sample-directory.xml')"
test -f app.js && test -f index.html
```

## Agent notes

- Keep the static app simple; avoid adding a build system unless explicitly requested.
- Validate XML changes with the smoke test above.
- Preserve existing local user changes; stage only files you intentionally modify.

## Issue Tracking

This project uses **bd (beads)** for issue tracking. Run `bd prime` for workflow context, or install hooks with `bd hooks install` for automatic context injection.

Quick reference:

- `bd ready` - find unblocked work
- `bd create "Title" --type task --priority 2` - create an issue
- `bd close <id>` - close completed work
- `bd dolt push` - push Beads data when using a shared Beads remote

For full workflow details, run `bd prime`.
