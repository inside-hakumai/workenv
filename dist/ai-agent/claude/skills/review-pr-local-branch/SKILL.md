---
name: review-pr-local-branch
description: チェックアウトしているローカルブランチに対するプルリクエストのレビューを実施する
disable-model-invocation: true
allowed-tools: Bash(git *), Bash(gh *), Bash(bash *), Bash(mkdir *), Read, Grep, Glob, Agent, Write
---

# Review Pull Request on Local Branch

## Pre-fetched PR Context

- **Current branch**: !`git branch --show-current`
- **PR metadata**:
!`gh pr view --json number,title,body,baseRefName,url,labels,reviewRequests 2>/dev/null || echo "No PR found for current branch"`
- **CI status**:
!`gh pr checks 2>/dev/null || echo "No CI checks found"`
- **Existing reviews and comments**:
!`gh pr view --json reviews,comments 2>/dev/null || echo "No reviews found"`

## Supporting Files

Before proceeding, read the following supporting files at the appropriate steps:

- [guidelines.md](guidelines.md) — Severity classification, approval criteria, and review principles. **Read before Step 3.**
- [subtasks.md](subtasks.md) — Subtask A–F definitions and common instructions. **Read at Step 3.**
- [output-template.md](output-template.md) — Output format and file naming convention. **Read at Step 5.**

## Procedure

### Step 1: Collect Diff and Contextual Information

1. Run the diff collection script to get the full diff, stats, and changed file list:
   ```bash
   bash ~/.claude/skills/review-pr-local-branch/scripts/collect-diff.sh
   ```
   For large PRs (>30 files), add `--with-contents` to also output full file contents inline:
   ```bash
   bash ~/.claude/skills/review-pr-local-branch/scripts/collect-diff.sh --with-contents
   ```
   For smaller PRs, use the Read tool to read important changed files individually.

2. Investigate callers and references of changed functions/classes using Grep and Glob.
3. Find related test files for changed code.
4. Retrieve and collect information from URLs linked in the PR description and related issues/documents.

### Step 2: Summarize PR for Subtask Input

Based on the pre-fetched context above and the information collected in Step 1, produce the following summary for use by subtasks:

- **PR Purpose**: One-paragraph summary of intent and background
- **Changed Files**: Grouped by logical area
- **Full Diff**: Output from Step 1 (for large PRs, split by logical grouping)
- **Surrounding Context**: Key information from full file reads and caller analysis
- **Existing Test Coverage**: Summary of related test files found
- **CI Status**: Any failures or warnings
- **Existing Reviews**: Summary of prior review comments (subtasks must not duplicate these)
- **Related Context**: Key points from linked documents

### Step 3: Code Analysis and Review

Read [guidelines.md](guidelines.md) and [subtasks.md](subtasks.md), then launch **6 concurrent subtasks** using the General-purpose SubAgent tool, one for each perspective (A through F).

Each subtask receives the summary from Step 2, including the full diff and surrounding context.

**Wait for all 6 subtasks to complete before proceeding.**

### Step 4: Aggregate and Determine Approval

1. **Merge findings** from all subtasks, deduplicating overlapping issues.
2. **Cross-check subtask findings**:
   - For each validation issue from Subtask B, verify whether Subtask F found corresponding test coverage.
   - If subtasks disagree on a finding, investigate the actual code context and make a final determination.
3. **Eliminate false positives**: Re-examine each Critical and "修正必須" Suggestion against actual code and surrounding context. Downgrade or remove findings that:
   - Are based on misunderstanding of the code's intent
   - Are inconsistent with established codebase patterns
   - Cannot be triggered under realistic conditions
   - Match the common false positive patterns listed in [guidelines.md](guidelines.md)
4. **Check coherence**: Ensure findings do not contradict each other.
5. **Filter existing feedback**: Remove findings that duplicate prior review comments.
6. Sort findings by severity (Critical → Suggestion → Nit).
7. Determine approval status based on the Approval Decision Criteria in [guidelines.md](guidelines.md).

### Step 5: Output Review Results

Read [output-template.md](output-template.md), then save the review result as a Markdown file following the template and naming convention defined there.
