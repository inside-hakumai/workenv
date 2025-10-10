---
description: チェックアウトしているローカルブランチに対するプルリクエストのレビューを実施する
---

# Review Pull Request on Local Branch

## Context

Review the pull request for the currently checked out local branch comprehensively.
Use the Task tool to conduct a multi-faceted review from multiple perspectives.
Ultrathink.

## Procedure

### Step 1: PR Information Collection and Analysis
1. Check current branch information
2. Retrieve pull request information from GitHub
3. Collect pull request description
4. Retrieve and collect information from URLs linked in the description, and other Issues, pull requests, or documents related to this pull request
5. Search for additional documents using related keywords and collect information

### Step 2: Understanding Pull Request Purpose
1. Understand PR purpose and requirements based on collected information
2. Analyze the intent and background of changes
3. Identify expected behavior and constraints

### Step 3: Test Execution
1. Run existing test suite
2. Run newly added or modified tests
3. Record test results (success/failure)
4. Analyze causes if there are any failed tests

### Step 4: Code Analysis and Review
Execute parallel review subtasks for comprehensive analysis.

**IMPORTANT**: Use the Task tool to launch 6 concurrent subtasks, one for each review perspective below. Each subtask should:
- Focus exclusively on its assigned review perspective
- Analyze all code changes in the pull request from that specific angle
- Return a detailed report of findings including file paths, line numbers, and specific issues or positive observations

Launch the following 6 subtasks in parallel:

1. **Subtask A - Logic Correctness Review**: Analyze implementation logic, algorithms, data flows, error handling, and handling of unexpected inputs. Return detailed findings about logical correctness issues.

2. **Subtask B - Input Validation Review**: Examine all input validation mechanisms including data types, formats, domain-specific rules, data integrity, and edge cases. Return comprehensive validation findings.

3. **Subtask C - Maintainability and Readability Review**: Evaluate code structure, naming conventions, function/class responsibilities, and documentation. Return detailed maintainability assessment.

4. **Subtask D - Security Review**: Identify security vulnerabilities including input validation issues, authentication/authorization problems, injection risks, and information leakage. Return security audit results.

5. **Subtask E - Test Quality Review**: Assess test coverage, test case quality, edge case testing, and test code maintainability. Return test quality evaluation.

6. **Subtask F - Test Execution Results Review**: Analyze test execution outcomes, failed tests, execution time, and coverage metrics. Return test execution analysis.

**After launching all subtasks**: Wait for all 6 subtasks to complete and collect their detailed reports. Aggregate all findings into a comprehensive review summary that will be used in Step 5.

#### A. Logic Correctness
- Does the implementation meet the PR's purpose and requirements?
- Are algorithms and data flows appropriate?
- Is error handling sufficient?
- Is handling of unexpected input appropriate?

#### B. Input Validation
- **Data Type and Format Verification**
  - Consistency of date/time formats
  - String length limits (minimum/maximum)
  - Numeric range checks (minimum/maximum/precision)
  - Consideration of enum types (Enum/Literal)
- **Domain-Specific Validation**
  - Validity based on business logic
  - Consistency between correlated fields
  - Appropriateness of required/optional fields
- **Data Integrity**
  - Duplicate data prevention mechanisms
  - Foreign key reference validation
  - Permission checks (whether the user can update the data)
- **Edge Case Considerations**
  - Handling of NULL/empty strings/0
  - Behavior at boundary values
  - Error messages for invalid format data

#### C. Maintainability and Readability
- Is the code structure easy to understand?
- Are naming conventions appropriate?
- Are function and class responsibilities clear?
- Are comments appropriate?

#### D. Security
- Is input validation appropriate?
- Is authentication/authorization processing correct?
- Are there no vulnerabilities such as SQL injection?
- Is there no risk of sensitive information leakage?

#### E. Test Quality
- Are normal case tests sufficient?
- **Input Validation Tests**
  - Invalid type tests
  - Boundary value tests
  - Abnormal value and edge case tests
- Is test data appropriate?
- Is test code readable and maintainable?

#### F. Test Execution Results
- Are all tests passing?
- If there are failed tests, are the causes clear?
- Is test execution time appropriate?
- Is coverage sufficient?

### Step 5: Output Review Results

Generate a Markdown file in the following format **in Japanese**:

```markdown
# プルリクエストレビュー結果

## 基本情報
- **ブランチ**: [branch name]
- **プルリクエスト**: [PR number and title]
- **目的**: [summary of PR purpose]

## 変更概要
[summary of changes]

## テスト実行結果
- **テスト実行コマンド**: [executed test command]
- **実行結果**: [PASS/FAIL]
- **失敗したテスト**: [details if there are failed tests]
- **カバレッジ**: [test coverage information]

## レビュー結果

### ✅ 良い点
- [list specific good implementations]

### ⚠️ 改善提案
- **ファイル**: `path/to/file.py:行番号`
  - **問題**: [description of the issue]
  - **提案**: [specific improvement suggestion]
  - **diff例**:
    ```diff
    - [previous code]
    + [modified code]
    ```

### 🚨 重大な問題
- [list critical security or logic issues if any]

## 総合評価
- **承認可否**: [APPROVE/REQUEST_CHANGES/COMMENT]
- **理由**: [reason for decision]
```

## Output Requirements
- Specify file paths and line numbers for all findings
- Present improvement suggestions with concrete code examples
- Classify by importance (Good points/Improvement suggestions/Critical issues)
- Clearly determine final approval status
