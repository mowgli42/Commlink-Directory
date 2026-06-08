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

## Commlink integration (cross-repo)

Commlink-Directory owns **Phase 1** — the canonical XML v1.1 source format. Downstream consumers:

| Repo | Phase | Consumes |
|------|-------|----------|
| Commlink-Schedule | 2 | Import/validate/export via `app/src/lib/utils/xml.js` |
| o-my | 3 | `commlink-status-service` reading the same XML |
| o-my-sim | 4–5 | OMS platform comm subsystems + scenario readiness |

See `docs/COMMLINK-INTEGRATION-ROADMAP.md`. After XML changes, run `npm test` and keep `sample-directory.xml` aligned with Schedule fixture at `Commlink-Schedule/app/static/fixtures/commlink-directory-v1.1.xml`.

## Agent notes

- Keep the static app simple; `npm test` uses Node only for XML round-trip tests.
- Validate XML changes with `npm test` and the Python smoke test above.
- Preserve existing local user changes; stage only files you intentionally modify.

## Issue Tracking

This project uses **bd (beads)** for issue tracking. Run `bd prime` for workflow context, or install hooks with `bd hooks install` for automatic context injection.

Quick reference:

- `bd ready` - find unblocked work
- `bd create "Title" --type task --priority 2` - create an issue
- `bd close <id>` - close completed work
- `bd dolt push` - push Beads data when using a shared Beads remote

For full workflow details, run `bd prime`.
