---
description: チェックアウトしているローカルブランチに対するプルリクエストのレビューを実施する
---

# Review Pull Request on Local Branch

## Context

Review the pull request for the currently checked out local branch comprehensively.
Use the Task tool to conduct a multi-faceted review from multiple perspectives.

## Severity Classification

- **🚨 重大(Critical)**: Could cause production failures, data loss, or security vulnerabilities. Blocks merge.
- **⚠️ 改善提案(Suggestion)**: Affects quality, maintainability, or performance but won't cause immediate failures. Further classified as:
  - **修正必須 (Must Fix)**: Logic flaws, data integrity issues, or correctness problems that will cause bugs under realistic conditions.
  - **次回対応可 (Can Address Later)**: Improves code quality but has no immediate functional impact.
- **💡 軽微(Nit)**: Code style, naming, comments. Does not block merge.

## Approval Decision Criteria

- **APPROVE**: Zero Critical findings AND zero "修正必須" Suggestions.
- **REQUEST_CHANGES**: One or more Critical findings, OR one or more "修正必須" Suggestions.
- **COMMENT**: No Critical or "修正必須" findings, but design decisions or architecture require discussion with the PR author.

## Review Principles

- **Report only high-confidence findings**: If unsure whether something is a problem, explicitly state the uncertainty and frame it as an observation. Prefer missing a real issue over reporting a false positive.
- **Respect intentional design decisions**: If a pattern is consistent across the codebase, treat it as intentional even if it looks unusual. Note as observation, not a problem.
- **Provide actionable feedback**: Every finding must include a concrete "how to fix" suggestion.
- **Avoid common false positive patterns**:
  - Framework-provided validation (e.g., Django/Rails model validators, Pydantic type coercion) flagged as "missing manual validation"
  - ORM query optimizations (e.g., Django `select_related`, SQLAlchemy lazy loading) flagged as "N+1 queries" when the ORM handles it
  - Hardcoded values in test code flagged as "security issues" or "magic numbers"
  - Intentionally broad exception handlers in top-level error boundaries flagged as "swallowing exceptions"
  - Optional parameters with `None` defaults flagged as "missing null checks" when the function explicitly handles `None`

## Procedure

### Step 1: PR Information Collection

1. Check current branch and retrieve PR metadata:
   ```bash
   git branch --show-current
   gh pr view --json number,title,body,baseRefName,url,labels,reviewRequests
   ```
2. Retrieve CI status and existing review comments:
   ```bash
   gh pr checks
   gh pr view --json reviews,comments
   ```
3. Get the diff, changed file list, and stats:
   ```bash
   BASE=$(gh pr view --json baseRefName -q .baseRefName)
   git diff "$BASE"...HEAD
   git diff --stat "$BASE"...HEAD
   git diff --name-only "$BASE"...HEAD
   ```
4. Read full content of changed files for surrounding context:
   ```bash
   for f in $(git diff --name-only "$BASE"...HEAD); do
     echo "=== $f ==="
     cat "$f" 2>/dev/null || echo "(file deleted)"
   done
   ```
   For large PRs (>30 files), limit full reads to files with substantial changes and read others on demand during subtasks.
5. Investigate callers and references of changed functions/classes using grep, ripgrep, or language-appropriate tools.
6. Find related test files for changed code.
7. Retrieve and collect information from URLs linked in the PR description and related issues/documents.

### Step 2: Understanding Pull Request Purpose

Based on collected information, produce the following summary for use by subtasks:

- **PR Purpose**: One-paragraph summary of intent and background
- **Changed Files**: Grouped by logical area
- **Full Diff**: Output from Step 1 (for large PRs, split by logical grouping)
- **Surrounding Context**: Key information from full file reads and caller analysis
- **Existing Test Coverage**: Summary of related test files found
- **CI Status**: Any failures or warnings
- **Existing Reviews**: Summary of prior review comments (subtasks must not duplicate these)
- **Related Context**: Key points from linked documents

### Step 3: Code Analysis and Review

Launch **6 concurrent subtasks** using the Task tool, one for each perspective below (A through F).

Each subtask receives the summary from Step 2, including the full diff (or relevant portions) and surrounding context.

**Common instructions for all subtasks**:
- Read the entire diff carefully and build a mental model of the change before analyzing.
- Consider not only what IS in the diff, but what SHOULD be there but is MISSING.
- For each finding, explain the **concrete failure scenario** (what input/condition triggers it, what happens).
- Classify each finding by severity using the Severity Classification defined above.
- Follow the Review Principles — especially avoiding false positive patterns listed above.
- Return a detailed report with file paths, line numbers, and specific issues or positive observations.

#### Subtask A — Logic Correctness & State Transitions
- Does the implementation meet the PR's purpose and requirements?
- Are algorithms and data flows correct?
- Is error handling sufficient across all error paths?
- Are there off-by-one errors, race conditions, or infinite loops?
- **State transitions**: If the code involves entities with state (e.g., status fields, workflow stages), are all valid transitions enforced? Are invalid transitions prevented?
- **What is missing?** Are there requirements from the PR description that are not implemented?

#### Subtask B — Input Validation & Data Integrity
- Data type/format validation (dates, string lengths, numeric ranges, enums)
- Domain-specific business rule validation and cross-field consistency
- Data integrity (duplicate prevention, foreign key validity, permission checks)
- Edge cases: NULL/empty string/zero handling, boundary values, error messages

#### Subtask C — Maintainability and Readability
- Code structure clarity and naming consistency
- Function/class responsibility (Single Responsibility)
- Comment appropriateness
- Code duplication and abstraction level

#### Subtask D — Security
- Authentication/authorization correctness
- Injection vulnerabilities (SQL, command, template, etc.)
- Sensitive information leakage (logs, error messages, responses)
- Secrets/credentials handling
- CSRF/XSS prevention (if applicable)
- Note: Business-logic input validation is covered by Subtask B. Focus here on security-specific attack vectors.

#### Subtask E — Performance and Scalability
- N+1 query problems or unnecessary database calls (verify the ORM does not already optimize before flagging)
- Inefficient loops or redundant computations
- Memory usage (large data loading, unbounded collections)
- Missing indexes or inefficient queries
- Scalability with expected data growth
- Concurrency issues (race conditions, deadlocks)

#### Subtask F — Test Quality
- Are normal case tests sufficient for the changed code?
- **Cross-check with changed code**: For each validation rule or business logic branch in the changed code, is there a corresponding test for invalid input, boundary values, and edge cases?
- Are error paths and failure modes tested?
- Is test data appropriate and realistic?
- Are there missing test cases? If no tests were added, do existing tests adequately cover the changes?

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
   - Match the common false positive patterns listed in Review Principles
4. **Check coherence**: Ensure findings do not contradict each other.
5. **Filter existing feedback**: Remove findings that duplicate prior review comments.
6. Sort findings by severity (Critical → Suggestion → Nit).
7. Determine approval status based on the Approval Decision Criteria.

### Step 5: Output Review Results

Save the review result as a Markdown file with the following naming convention and location:

- **Save directory**: `./local_files/pr_review/` (relative to repository root; create if it does not exist)
- **File name**: `<REPO>_<PR_NUMBER>_<DATE>_<TIME>_<AGENT>.md`
  - `<REPO>`: Repository name (e.g., `my-app`)
  - `<PR_NUMBER>`: Pull request number (e.g., `123`)
  - `<DATE>`: Review date in `YYYYMMDD` format
  - `<TIME>`: Review time in `HHMM` format (24-hour, local time)
  - `<AGENT>`: Name of the AI agent that performed the review (e.g., `claude-code`)

Example: `my-app_123_20260218_1430_claude-code.md`

Generate the file in the following format **in Japanese**:

```markdown
# プルリクエストレビュー結果

## 基本情報
- **ブランチ**: [branch name]
- **プルリクエスト**: [PR number, title and URL]
- **目的**: [summary of PR purpose]

## 変更概要
[変更ファイル数、行数などの統計を含む変更の概要]

## レビュー結果

### ✅ 良い点
[特筆すべき良い実装を2〜3点に絞って記載。ファイルパスを含める。]

### 🚨 重大な問題
[番号付きで記載。該当なしの場合は「なし」と記載。]

1. **ファイル**: `path/to/file.py:行番号`
   - **問題**: [問題の説明]
   - **影響**: [具体的な障害シナリオ: どのような入力・条件で発生し、何が起こるか]
   - **提案**: [具体的な修正方法]
   - **diff例**:
     ```diff
     - [修正前コード]
     + [修正後コード]
     ```

### ⚠️ 改善提案
[番号付きで記載。各項目に「修正必須」または「次回対応可」を明示。該当なしの場合は「なし」と記載。]

1. **ファイル**: `path/to/file.py:行番号` — 修正必須 / 次回対応可
   - **問題**: [問題の説明]
   - **影響**: [影響の説明]
   - **提案**: [具体的な修正方法]
   - **diff例**:
     ```diff
     - [修正前コード]
     + [修正後コード]
     ```

### 💡 軽微な指摘
[該当なしの場合は「なし」と記載。]

- **ファイル**: `path/to/file.py:行番号`
  - **内容**: [指摘内容]

## 総合評価
- **承認可否**: [APPROVE / REQUEST_CHANGES / COMMENT]
- **理由**: [承認判定基準に基づく判定理由]
- **重大な問題**: [N]件 / **改善提案**: [N]件（修正必須: [N]件, 次回対応可: [N]件） / **軽微な指摘**: [N]件
```

## Output Requirements
- All findings must include file paths and line numbers.
- All Critical and Suggestion findings must include concrete code examples in diff format.
- All Critical and Suggestion findings must describe a concrete failure scenario.
- Every Suggestion must be classified as "修正必須" or "次回対応可".
- Limit "良い点" to 2-3 noteworthy items.
- Approval status must be justified with explicit reference to the Approval Decision Criteria.
- Do not duplicate feedback already provided by other reviewers.