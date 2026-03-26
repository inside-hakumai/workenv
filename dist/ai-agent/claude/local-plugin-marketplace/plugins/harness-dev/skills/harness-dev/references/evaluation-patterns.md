# Evaluation Patterns

This file defines evaluation criteria for the evaluator agent. Each task type has common checks plus type-specific checks.

## Common Checks (All Task Types)

These checks apply to every task regardless of type:

### Build Verification
- Project builds without errors
- No missing dependencies or import errors
- No compilation/transpilation failures

### Test Execution
- Existing tests pass (run the project's test command)
- If tests were created by the generator, verify they are meaningful (not just trivially passing)
- Check for test coverage of core functionality

### Code Review
- No obvious bugs or logic errors
- No hardcoded secrets, credentials, or sensitive data
- No security vulnerabilities (SQL injection, XSS, command injection, etc.)
- Error handling exists for external calls and user input
- Code follows the project's existing conventions and style

### Functional Verification
- Core requirements from the spec are implemented
- Features described in the spec actually work (not just stub implementations)
- No dead code or unused imports introduced

---

## Task Type: web-app

Web application with browser-based UI (React, Vue, HTML/CSS/JS, etc.)

### UI Verification (Playwright MCP)
- Application starts and loads in browser without console errors
- Navigation between pages/routes works correctly
- Key user flows can be completed end-to-end (e.g., create, read, update, delete)
- Forms accept input and submit correctly
- Visual layout is reasonable (no overlapping elements, no broken styles)

### Accessibility Basics
- Interactive elements are clickable/focusable
- Page has reasonable heading structure

### Server/API Integration
- Frontend communicates with backend correctly (if applicable)
- Loading states and error states are handled

---

## Task Type: api

REST API, GraphQL API, or other server-side API service.

### Endpoint Verification
- All documented endpoints respond with correct status codes
- Request/response formats match the spec
- Error responses return appropriate status codes and messages
- Authentication/authorization works if specified

### Data Integrity
- CRUD operations persist correctly to database/storage
- Invalid input is rejected with meaningful error messages
- No data corruption on edge cases (empty strings, null values, large payloads)

### Verification Method
- Use `curl` or `httpie` via Bash to test endpoints
- Start the server, run tests, then stop the server

---

## Task Type: cli

Command-line tool or script.

### Command Verification
- Main command runs without errors
- All subcommands/flags described in the spec work
- Help text (`--help`) is accurate and complete
- Exit codes are correct (0 for success, non-zero for errors)

### Input/Output
- Accepts expected input formats (stdin, files, arguments)
- Output format matches spec (JSON, table, plain text, etc.)
- Handles missing/invalid input gracefully with helpful error messages

### Verification Method
- Execute commands via Bash and check stdout/stderr/exit code

---

## Task Type: library

Reusable library, package, or module.

### API Surface
- Public API matches the spec (exported functions, classes, types)
- API is consistent in naming and conventions
- Types/interfaces are correctly defined (if applicable)

### Documentation
- Public functions have docstrings or JSDoc
- Usage examples in README or docs are correct and runnable

### Verification Method
- Import the library and call key functions in a test script
- Run the project's test suite

---

## Task Type: other

General development task that doesn't fit above categories.

### Apply Common Checks Only
- Focus on build verification, test execution, and code review
- Adapt checks based on what the spec describes
- Use best judgment for functional verification

---

## Extending This File

To add a new task type, append a section with this format:

```markdown
## Task Type: [type-name]

[Brief description of what this type covers]

### [Check Category 1]
- [Check item]
- [Check item]

### [Check Category 2]
- [Check item]

### Verification Method
- [How to verify]
```

Then update the planner agent's task type classification list to include the new type.
