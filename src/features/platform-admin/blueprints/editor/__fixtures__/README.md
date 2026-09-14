# Fixtures

- `reminder-buyers.json`, `reminder-savers.json`, `reminder-followers.json` — verbatim copies of
  `live-show-orchestrator/src/blueprints/fixtures/<file>.json`. Keep them in
  sync by hand whenever the orchestrator fixtures change (no build step
  copies them).
- `catalog.ts` — hand-authored, not a file copy. It mirrors the shape of
  `GET /blueprints/catalog` (`BlueprintCatalog.entries()` in the
  orchestrator), trimmed to the fields these tests exercise; see the comment
  at the top of the file.
