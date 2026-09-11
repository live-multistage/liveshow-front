#!/usr/bin/env bash
# Refresh the vendored shared packages from the monorepo folder (../packages).
# Run after changing any @live-show/* package so the standalone deploy matches.
set -euo pipefail
cd "$(dirname "$0")/.."

FORCE=0
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
  esac
done

# Guard: i18n-messages/<loc>.json in shared/ may have leaf keys that were never
# added to ../packages/i18n-messages/<loc>.json (e.g. an implementer forgot to
# propagate a key upstream). rsync --delete would silently drop them. Abort
# unless --force is passed.
check_i18n_no_key_loss() {
  python3 - "$@" <<'PY'
import json, sys

def leaf_paths(obj, prefix=""):
    if not isinstance(obj, dict):
        yield prefix
        return
    for k, v in obj.items():
        yield from leaf_paths(v, f"{prefix}.{k}" if prefix else k)

locales = ["pt", "en", "es"]
lost = {}
for loc in locales:
    with open(f"shared/i18n-messages/{loc}.json", encoding="utf-8") as f:
        shared = json.load(f)
    with open(f"../packages/i18n-messages/{loc}.json", encoding="utf-8") as f:
        source = json.load(f)
    missing = sorted(set(leaf_paths(shared)) - set(leaf_paths(source)))
    if missing:
        lost[loc] = missing

if lost:
    print("sync-shared: shared/i18n-messages has keys missing from ../packages/i18n-messages", file=sys.stderr)
    for loc, missing in lost.items():
        print(f"  {loc}:", file=sys.stderr)
        for key in missing[:20]:
            print(f"    - {key}", file=sys.stderr)
        if len(missing) > 20:
            print(f"    ... and {len(missing) - 20} more", file=sys.stderr)
    sys.exit(1)
PY
}

if [ "$FORCE" -eq 0 ]; then
  check_i18n_no_key_loss
fi

for p in api-contracts design-system i18n-messages; do
  rsync -a --delete --exclude node_modules --exclude 'dist' --exclude '*.tsbuildinfo' \
    "../packages/$p/" "shared/$p/"
done
echo "synced shared/ from ../packages"
