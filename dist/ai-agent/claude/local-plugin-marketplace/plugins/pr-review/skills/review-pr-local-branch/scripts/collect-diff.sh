#!/usr/bin/env bash
# Collect diff information for PR review.
# Usage:
#   bash collect-diff.sh <base-branch>                 # diff stats, changed files, full diff
#   bash collect-diff.sh <base-branch> --with-contents # above + full content of each changed file
set -euo pipefail

BASE="${1:?Usage: collect-diff.sh <base-branch> [--with-contents]}"
shift

INCLUDE_CONTENTS=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --with-contents) INCLUDE_CONTENTS=true; shift ;;
    *) shift ;;
  esac
done

echo "===== BASE BRANCH ====="
echo "$BASE"
echo ""

echo "===== DIFF STATS ====="
git diff --stat "$BASE"...HEAD
echo ""

echo "===== CHANGED FILES ====="
git diff --name-only "$BASE"...HEAD
echo ""

echo "===== FULL DIFF ====="
git diff "$BASE"...HEAD

if "$INCLUDE_CONTENTS"; then
  echo ""
  echo "===== FILE CONTENTS ====="
  while IFS= read -r f; do
    echo ""
    echo "--- $f ---"
    if [ -f "$f" ]; then
      cat "$f"
    else
      echo "(file deleted)"
    fi
  done < <(git diff --name-only "$BASE"...HEAD)
fi
