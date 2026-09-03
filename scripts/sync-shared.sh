#!/usr/bin/env bash
# Refresh the vendored shared packages from the monorepo folder (../packages).
# Run after changing any @live-show/* package so the standalone deploy matches.
set -euo pipefail
cd "$(dirname "$0")/.."
for p in api-contracts design-system i18n-messages; do
  rsync -a --delete --exclude node_modules --exclude 'dist' --exclude '*.tsbuildinfo' \
    "../packages/$p/" "shared/$p/"
done
echo "synced shared/ from ../packages"
