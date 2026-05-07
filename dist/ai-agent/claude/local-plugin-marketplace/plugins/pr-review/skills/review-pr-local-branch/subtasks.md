# Subtask Definitions

## Common Instructions for All Subtasks

- Read the entire diff carefully and build a mental model of the change before analyzing.
- Consider not only what IS in the diff, but what SHOULD be there but is MISSING.
- For each finding, explain the **concrete failure scenario** (what input/condition triggers it, what happens).
- Classify each finding by severity using the Severity Classification defined in [guidelines.md](guidelines.md).
- Follow the Review Principles — especially avoiding false positive patterns listed in [guidelines.md](guidelines.md).
- Return a detailed report with file paths, line numbers, and specific issues or positive observations.

## Subtask A — Logic Correctness & State Transitions

- Does the implementation meet the PR's purpose and requirements?
- Are algorithms and data flows correct?
- Is error handling sufficient across all error paths?
- Are there off-by-one errors, race conditions, or infinite loops?
- **State transitions**: If the code involves entities with state (e.g., status fields, workflow stages), are all valid transitions enforced? Are invalid transitions prevented?
- **What is missing?** Are there requirements from the PR description that are not implemented?

## Subtask B — Input Validation & Data Integrity

- Data type/format validation (dates, string lengths, numeric ranges, enums)
- Domain-specific business rule validation and cross-field consistency
- Data integrity (duplicate prevention, foreign key validity, permission checks)
- Edge cases: NULL/empty string/zero handling, boundary values, error messages

## Subtask C — Maintainability and Readability

- Code structure clarity and naming consistency
- Function/class responsibility (Single Responsibility)
- Comment appropriateness
- Code duplication and abstraction level

## Subtask D — Security

- Authentication/authorization correctness
- Injection vulnerabilities (SQL, command, template, etc.)
- Sensitive information leakage (logs, error messages, responses)
- Secrets/credentials handling
- CSRF/XSS prevention (if applicable)
- Note: Business-logic input validation is covered by Subtask B. Focus here on security-specific attack vectors.

## Subtask E — Performance and Scalability

- N+1 query problems or unnecessary database calls (verify the ORM does not already optimize before flagging)
- Inefficient loops or redundant computations
- Memory usage (large data loading, unbounded collections)
- Missing indexes or inefficient queries
- Scalability with expected data growth
- Concurrency issues (race conditions, deadlocks)

## Subtask F — Test Quality

- Are normal case tests sufficient for the changed code?
- **Cross-check with changed code**: For each validation rule or business logic branch in the changed code, is there a corresponding test for invalid input, boundary values, and edge cases?
- Are error paths and failure modes tested?
- Is test data appropriate and realistic?
- Are there missing test cases? If no tests were added, do existing tests adequately cover the changes?
