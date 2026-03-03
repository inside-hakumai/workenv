# Output Format and Naming Convention

## File Location and Naming

- **Save directory**: `./local_files/pr_review/` (relative to repository root; create if it does not exist)
- **File name**: `<REPO>_<PR_NUMBER>_<DATE>_<TIME>_<AGENT>.md`
  - `<REPO>`: Repository name (e.g., `my-app`)
  - `<PR_NUMBER>`: Pull request number (e.g., `123`)
  - `<DATE>`: Review date in `YYYYMMDD` format
  - `<TIME>`: Review time in `HHMM` format (24-hour, local time)
  - `<AGENT>`: Name of the AI agent that performed the review (e.g., `claude-code`)

Example: `my-app_123_20260218_1430_claude-code.md`

## Output Template

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
