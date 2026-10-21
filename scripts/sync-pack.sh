#!/usr/bin/env bash
# Packs current project files (no node_modules/dist/.qa) for syncing to the Windows folder.
set -e
cd "$(dirname "$0")/.."
mkdir -p /mnt/user-data/outputs
OUT=/mnt/user-data/outputs/iept-sync.tgz
{ echo package.json; echo package-lock.json;
  find . -path ./node_modules -prune -o -path ./dist -prune -o -path ./.qa -prune -o -type f -newermt "2026-09-29 15:20" -print | sed 's|^\./||'; } | sort -u > /tmp/claude-0/pack-list.txt
tar -czf "$OUT" -T /tmp/claude-0/pack-list.txt
echo "$OUT $(wc -l < /tmp/claude-0/pack-list.txt) files $(du -h "$OUT" | cut -f1)"
