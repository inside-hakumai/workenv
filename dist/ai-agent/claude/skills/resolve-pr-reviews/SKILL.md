---
name: resolve-pr-reviews
description: >
  Fetch unresolved review comments on a GitHub pull request,
  triage each comment by validating it against the current code,
  and apply fixes only for legitimate suggestions.
  Use when asked to address PR reviews, resolve review comments,
  or handle unresolved feedback on a pull request.
---

# PR Review Comment Resolution

## Workflow

### Step 1: Identify the PR

Determine the PR number and repository info for the current branch:

```bash
PR_NUMBER=$(gh pr view --json number -q '.number')
REPO_INFO=$(gh repo view --json owner,name -q '"\(.owner.login) \(.name)"')
OWNER=$(echo "$REPO_INFO" | cut -d' ' -f1)
REPO=$(echo "$REPO_INFO" | cut -d' ' -f2)
```

### Step 2: Fetch unresolved review threads

```bash
bash ~/.claude/skills/resolve-pr-reviews/scripts/fetch_unresolved_threads.sh "$OWNER" "$REPO" "$PR_NUMBER"
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

Ask the user to review the summary before committing.

## Guidelines

- Never silently skip a review thread. Every thread must appear in the report.
- When in doubt, classify as NEEDS_CLARIFICATION rather than guessing.
- For style-related feedback, defer to the project's existing patterns.
- If a single fix would address multiple threads, note this in the report.
- If the scope of a fix is large or risky, flag it to the user before applying.