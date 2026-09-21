---
name: resolve-pr-reviews
description: >
  Fetch unresolved review comments on a GitHub pull request,
  triage each comment by validating it against the current code,
  and apply fixes only for legitimate suggestions.
  Use when asked to address PR reviews, resolve review comments,
  or handle unresolved feedback on a pull request.
  Accepts an optional PR URL, PR number, or branch name to target a PR
  other than the current branch's (e.g. when working in a git worktree).
  Note: if the reviewer is CodeRabbit, or the goal is to iterate
  until the PR is approved, use the coderabbit-review-loop skill instead.
argument-hint: "[PR URL | PR number | branch]"
---

# PR Review Comment Resolution

## Workflow

### Step 1: Identify the PR and verify the local HEAD

The checked-out branch is not always the PR's branch. In a git worktree, HEAD may be detached or on a differently named branch, so the target PR can be given explicitly.

- If the skill was invoked with an argument (appended to this skill as `ARGUMENTS:`), or the user's request names a PR URL, PR number, or branch, pass it to the script.
- Otherwise, run the script without an argument; it uses the PR associated with the current branch.

```bash
bash ~/.claude/skills/resolve-pr-reviews/scripts/identify_pr.sh [<PR URL | PR number | branch>]
```

If the script exits with an error because no PR was found, ask the user for the PR URL, number, or branch instead of guessing.

The script prints JSON containing `owner`, `repo`, `number`, `state`, `headRefName`, `headRefOid`, `localHead`, `localBranch` (null when HEAD is detached), and `relation`, which compares the local HEAD with the PR's head commit. Review comments are written against the PR's head commit, and fixes are committed on top of the local HEAD, so proceed only when the local HEAD holds the PR's code:

| `relation` | Meaning | Action |
|---|---|---|
| `match` | The local HEAD is the PR's head commit | Proceed to Step 2 |
| `ahead` | The local HEAD has `aheadBy` commits on top of the PR's head that are not in the PR (e.g. unpushed fixes from a previous run) | Show the user `git log --oneline <headRefOid>..HEAD` and ask whether to proceed. New fixes will be stacked on these commits and pushed together with them, so proceed only if the user confirms |
| `behind` | The PR has `behindBy` commits that are not in the local HEAD | Stop |
| `diverged` | Both sides have commits the other lacks | Stop |
| `missing` | The PR's head commit does not exist locally (not fetched yet, or the working directory is a different repository) | Stop |

When stopping, report `relation`, `localHead`, and `headRefOid` to the user and let them bring the working tree up to date. Do not run `git pull`, `git checkout`, `git reset`, or similar commands yourself: the working tree may be a worktree holding other work, and how to reconcile it is the user's decision.

If `state` is not `OPEN`, tell the user and confirm before continuing.

### Step 2: Fetch unresolved review threads

Use `owner`, `repo`, and `number` from Step 1:

```bash
bash ~/.claude/skills/resolve-pr-reviews/scripts/fetch_unresolved_threads.sh <owner> <repo> <number>
```

### Step 3: Triage each review thread

For each unresolved thread, perform the following **before making any changes**:

1. Read the file at the `path` indicated by the thread
2. Examine the code around the `line` referenced by the reviewer
3. Carefully read the reviewer's comment (`body`) and understand their intent
4. **Evaluate whether the feedback is valid** by considering:
   - Does the issue the reviewer describes actually exist in the current code?
   - Has the code already been updated to address the concern (check `isOutdated`)?
   - Is the suggestion technically correct and an improvement?
   - Does it align with the project's conventions and patterns?

Classify each thread into one of:

- **WILL_FIX** — The feedback is valid and actionable. Proceed with a code change.
- **ALREADY_ADDRESSED** — The code has already been changed to resolve this concern.
- **DISAGREE** — The suggestion is not an improvement, is based on a misunderstanding, or conflicts with project conventions.
- **NEEDS_CLARIFICATION** — The reviewer's intent is ambiguous and should not be guessed at.

### Step 4: Apply fixes for WILL_FIX items only

For each thread classified as WILL_FIX:

1. Make the minimal, focused code change that addresses the feedback
2. Follow the project's existing style and conventions
3. Ensure the change does not introduce regressions in surrounding logic
4. **Commit the change immediately** with a short description of the fix

Each WILL_FIX thread must result in its own separate commit. Do not batch multiple fixes into a single commit. 
This ensures that each commit maps 1:1 to a review comment for easy traceability.

Do **not** modify or commit code for threads classified as ALREADY_ADDRESSED, DISAGREE, or NEEDS_CLARIFICATION.

### Step 5: Report results

After processing all threads, present a summary table to the user:

| # | File | Reviewer | Classification | Action taken / Reason |
|---|------|----------|----------------|----------------------|

For each thread:

- **WILL_FIX**: Briefly describe the change made
- **ALREADY_ADDRESSED**: Explain what existing change already covers the feedback
- **DISAGREE**: Explain why the suggestion was not adopted
- **NEEDS_CLARIFICATION**: Quote the ambiguous part and suggest asking the reviewer

If `localBranch` from Step 1 differs from `headRefName` (including a detached HEAD, where `localBranch` is null), state in the report that the fix commits are not on the PR's branch and that pushing them needs an explicit destination, such as `git push <remote> HEAD:<headRefName>`. For a detached HEAD, also warn that the commits belong to no branch and become hard to find after switching away.

Ask the user to review the summary and the fix commits (`git log --oneline <headRefOid>..HEAD`) before pushing. The skill does not push, so unwanted commits can still be dropped or amended locally at this point.

## Guidelines

- Never silently skip a review thread. Every thread must appear in the report.
- When in doubt, classify as NEEDS_CLARIFICATION rather than guessing.
- For style-related feedback, defer to the project's existing patterns.
- If a single fix would address multiple threads, note this in the report.
- If the scope of a fix is large or risky, flag it to the user before applying.