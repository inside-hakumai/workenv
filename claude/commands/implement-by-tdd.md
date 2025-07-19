---
description: "引数で指定したタスクファイルやIssueを参照してTDDで実装します。"
---

Reference the task file or Issue specified by `$ARGUMENTS` to understand the task content. Then, work on that task.
Ultrathink.

**Implementation should follow the principles described in the `Test-Driven Development (TDD) Guidelines` section.**

## Steps

### Step 1: Understanding and Analyzing Task Content

1. Read the specified task file and understand the task content.
2. Gather information by retrieving URLs linked in the task file, as well as other Issues, Pull Requests, or documents related to this pull request
3. Search for additional documents using relevant keywords to gather more information
4. Verify file existence and read necessary files
5. Confirm relationships with existing code

### Step 2: Creating Implementation Plan

1. Use TodoWrite tool to list implementation tasks
2. Clarify priorities and dependencies for each task
3. Determine units for implementation in TDD cycles

### Step 3: Implementation with TDD Cycle

Repeat the following cycle for each functional unit:

1. Identify the specifications and requirements for that functional unit
2. Implement test code and production code for that functional unit following the principles described in the `Test-Driven Development (TDD) Guidelines` section

**Test code should be implemented to ensure the identified specifications and requirements.**

### Step 4: Implementation Verification

1. Confirm all tests pass
2. Verify impact on existing tests

### Step 5: Implementation Completion Report

1. List of implemented files and methods
2. Test results summary
3. Future recommendations (if any)

## Test-Driven Development (TDD) Guidelines

### TDD Process (Following t_wada's methodology)

All code implementation in this repository must follow TDD principles as advocated by t_wada (Takuto Wada):

#### RED-GREEN-REFACTOR Cycle

1. **RED**: Write a failing test first
   - Write the smallest possible test that fails
   - Run the test and confirm it fails
   - The test should fail for the right reason

2. **GREEN**: Make the test pass with minimal code
   - Write the minimum code necessary to pass the test
   - Use "Fake it" (仮実装) if needed - return hardcoded values initially
   - Focus only on making the test green, not on perfect implementation

3. **REFACTOR**: Improve the code while keeping tests green
   - Remove duplication
   - Improve naming and structure
   - Apply design patterns if appropriate
   - Run tests after each change to ensure they still pass

#### Implementation Strategy

1. **Triangulation (三角測量)**
   - Start with specific hardcoded values (Fake it)
   - Add more tests with different cases
   - Generalize the implementation only when patterns emerge
   - Move from specific to general through multiple examples

2. **Small Steps**
   - Each cycle should take only a few minutes
   - Commit frequently after each GREEN state
   - Never write more test code than necessary
   - Never write more production code than necessary to pass tests

#### Test Writing Rules

- **Test names and comments must be written in Japanese.**
- Test code should follow the Given-When-Then pattern.
- Place `// Given`, `// When`, `// Then` comments immediately before each respective section to clearly delineate the Given, When, and Then parts.
- Immediately after the `// Given`, `// When`, `// Then` comments, add Japanese comments describing the preconditions, the operation being performed, and the expected results respectively.
- In the comment immediately after `// Given`, explain what state the mock represents in actual business logic. Do not explain the test code implementation details (such as how to create mocks).
- Test names should clearly describe what is being tested using a format like "〜の場合、〜する" that clearly shows both the precondition and expected result
- One assertion per test (as much as possible)
- Tests should be independent and isolated
- Use descriptive variable names in tests

#### Example Flow

```typescript
// Step 1: RED - Write failing test
test('正の数を2つ足した場合、その合計値を返す', () => {
  // Given
  // 2つの正の数値が与えられた状態
  const firstNumber = 1;
  const secondNumber = 2;
  
  // When
  // add関数を実行したとき
  const result = add(firstNumber, secondNumber);
  
  // Then
  // 2つの数値の合計値が返される
  expect(result).toBe(3);
});

// Step 2: GREEN - Minimal implementation
function add(a: number, b: number): number {
  return 3; // Fake it!
}

// Step 3: Add another test case (Triangulation)
test('異なる正の数を2つ足した場合、その合計値を返す', () => {
  // Given
  // 最初のテストとは異なる2つの正の数値が与えられた状態
  const firstNumber = 2;
  const secondNumber = 3;
  
  // When
  // add関数を実行したとき
  const result = add(firstNumber, secondNumber);
  
  // Then
  // 2つの数値の合計値が返される
  expect(result).toBe(5);
});

// Step 4: Generalize implementation
function add(a: number, b: number): number {
  return a + b; // Now generalized
}

// Step 5: REFACTOR if needed
// Example: Extract constants, improve naming, etc.
```

## Other Programming Rules

- Write documentation comments in Japanese for all functions and classes. Write them so that the specifications of the function or class are clearly understood.
- Write self-documenting code that does not require inline comments.
- Only add inline comments when the intent cannot be expressed through the code itself.
- Avoid redundant comments that duplicate what the code already expresses.
- Avoid hard-coding values unless absolutely necessary.
- Do not use `any` or `unknown` types in TypeScript.
- You must not use a TypeScript `class` unless it is absolutely necessary (e.g., extending the `Error` class for custom error handling that requires `instanceof` checks).
