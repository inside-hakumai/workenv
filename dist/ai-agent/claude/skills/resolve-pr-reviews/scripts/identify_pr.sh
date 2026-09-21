#!/bin/bash
# レビュー対応の対象 PR を特定し、ローカルの HEAD と PR の head の関係を判定する
# 使い方: identify_pr.sh [PR の URL | PR 番号 | ブランチ名]
#   引数を省略すると、現在のブランチに対応する PR を対象にする
#
# relation の値:
#   match    ローカルの HEAD が PR の head と一致する
#   ahead    ローカルの HEAD が PR の head の子孫である（PR にないコミットが aheadBy 個ある）
#   behind   ローカルの HEAD が PR の head の祖先である（ローカルにないコミットが behindBy 個ある）
#   diverged 双方に相手にないコミットがある
#   missing  PR の head のコミットがローカルにない（fetch していないか、別のリポジトリにいる）

set -euo pipefail

TARGET=${1:-}

if ! PR_JSON=$(gh pr view ${TARGET:+"$TARGET"} --json number,url,state,headRefName,headRefOid); then
  echo "対象の PR を特定できません。PR の URL・番号・ブランチ名のいずれかを引数に指定してください" >&2
  exit 1
fi

PR_HEAD=$(jq -r '.headRefOid' <<<"$PR_JSON")
LOCAL_HEAD=$(git rev-parse HEAD)
LOCAL_BRANCH=$(git symbolic-ref --quiet --short HEAD || true)
AHEAD_BY=null
BEHIND_BY=null

if [ "$LOCAL_HEAD" = "$PR_HEAD" ]; then
  RELATION=match
  AHEAD_BY=0
  BEHIND_BY=0
elif ! git cat-file -e "${PR_HEAD}^{commit}" 2>/dev/null; then
  RELATION=missing
else
  # 出力は「PR の head にだけあるコミット数」「ローカルの HEAD にだけあるコミット数」の順
  read -r BEHIND_BY AHEAD_BY < <(git rev-list --left-right --count "${PR_HEAD}...HEAD")
  if [ "$BEHIND_BY" -eq 0 ]; then
    RELATION=ahead
  elif [ "$AHEAD_BY" -eq 0 ]; then
    RELATION=behind
  else
    RELATION=diverged
  fi
fi

jq --arg localHead "$LOCAL_HEAD" --arg localBranch "$LOCAL_BRANCH" --arg relation "$RELATION" \
  --argjson aheadBy "$AHEAD_BY" --argjson behindBy "$BEHIND_BY" '
  (.url | capture("^https?://[^/]+/(?<owner>[^/]+)/(?<repo>[^/]+)/pull/")) + {
    number, url, state, headRefName, headRefOid,
    localHead: $localHead,
    localBranch: (if $localBranch == "" then null else $localBranch end),
    relation: $relation,
    aheadBy: $aheadBy,
    behindBy: $behindBy
  }' <<<"$PR_JSON"
