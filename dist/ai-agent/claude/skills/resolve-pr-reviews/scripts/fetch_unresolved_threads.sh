#!/bin/bash
# 未解決のレビューコメントを取得する
# 使い方: fetch_unresolved_threads.sh OWNER REPO PR_NUMBER

set -euo pipefail

OWNER=$1
REPO=$2
PR_NUMBER=$3

gh api graphql -f query='
query($owner: String!, $repo: String!, $pr: Int!, $cursor: String) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      reviewThreads(first: 100, after: $cursor) {
        nodes {
          isResolved
          isOutdated
          path
          line
          comments(first: 10) {
            nodes {
              author { login }
              body
              createdAt
              url
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
}' -F owner="$OWNER" -F repo="$REPO" -F pr="$PR_NUMBER" \
  | jq '[.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false)]'