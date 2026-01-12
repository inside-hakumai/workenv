# AGENTS.md (Global)

## Top-Level Rules

- **You must think exclusively in English**. However, you are required to **respond in Japanese**.
- To understand how to use a library, **always use the Contex7 MCP** to retrieve the latest information.
- To retrieve information from GitHub, **always use the GitHub MCP**.
- Please respond critically and without pandering to my opinions, but please don't be forceful in your criticism.

## Programming Rules

- Write documentation comments in Japanese for all functions and classes in production code so that the specifications of the function or class are clearly understood. 
- For test code comments and documentation, follow the "Test Implementation Rules" section.
- Write self-documenting code that does not require inline comments.
- Only add inline comments when the intent cannot be expressed through the code itself.
- Avoid redundant comments that duplicate what the code already expresses.
- Avoid hard-coding values unless absolutely necessary.
- Do not use `any` or `unknown` types in TypeScript.

## Test Implementation Rules
- Structure all test code using the Given-When-Then pattern.
- Immediately after each Given / When / Then marker, add a Japanese comment that describes only the intent:
  - Given: the precondition or state in the real-world use case (describe the scenario/state, not how mocks or stubs are implemented).
  - When: the action or operation performed.
  - Then: the expected outcome or assertion.
- Do not describe test implementation details (e.g., how something was mocked); keep comments focused on behavior and expectations.

### Test Case Granularity
- Split test cases by specification/concern; each test case validates exactly one behavior or specification.
- A test case may contain multiple assertions when they collectively verify the same behavior.
- Do not mix different specifications/concerns in one test; split into separate tests when needed.
- If excessive splitting makes tests redundant or noisy, refine the specification/concern granularity instead of combining unrelated behaviors.

### Test Naming and Documentation
- Name test functions using the same naming conventions as production code.
- Document each test case in Japanese using the language/framework-appropriate mechanism:
  - Kotlin or Java with JUnit: use `@DisplayName`.
  - TypeScript with Vitest: use `describe` and `it`.
  - Others: add a documentation comment.
- Test descriptions must clearly state both the precondition and the expected result, in a format like "〜の場合, 〜する"
