# harness-dev

GAN-inspired Planner/Generator/Evaluator harness for long-running development tasks in Claude Code.

## Overview

This plugin provides a structured workflow for complex development tasks. Instead of a single agent trying to plan, implement, and evaluate in one context, three specialized agents work in sequence with file-based communication:

- **Planner** — Expands a brief description into a detailed specification
- **Generator** — Implements code based on the spec (and feedback from prior rounds)
- **Evaluator** — Validates the implementation through tests, code review, and task-specific checks

The Generator and Evaluator run in a feedback loop (up to 3 rounds) until the implementation passes quality checks.

## Usage

### Explicit invocation

```
/harness-dev Build a todo app with React and FastAPI
```

### Automatic suggestion

The skill also activates proactively when it detects a task that would benefit from structured planning (e.g., full-stack development, multi-component systems).

## Workflow

```
User prompt → Planner → [spec.md] → Generator → [code] → Evaluator → [verdict]
                                        ↑                                  │
                                        └──── feedback (max 3 rounds) ─────┘
```

Communication between agents happens through files in `.harness/`:

| File | Writer | Purpose |
|------|--------|---------|
| `.harness/spec.md` | Planner | Detailed specification |
| `.harness/generator-report.md` | Generator | Implementation status |
| `.harness/evaluation.md` | Evaluator | PASS/FAIL verdict |
| `.harness/feedback.md` | Orchestrator | Feedback for next round |

## Evaluation Patterns

The evaluator applies common checks (build, tests, code review) to all tasks, plus task-type-specific checks:

- **web-app**: Playwright-based UI testing
- **api**: Endpoint verification via curl
- **cli**: Command execution and output validation
- **library**: API surface and import testing

New task types can be added by extending `skills/harness-dev/references/evaluation-patterns.md`.

## Requirements

- Claude Code with plugin support
- Playwright MCP (optional, for web-app evaluation)

## Installation

```bash
# Test locally
claude --plugin-dir /path/to/harness-dev
```
