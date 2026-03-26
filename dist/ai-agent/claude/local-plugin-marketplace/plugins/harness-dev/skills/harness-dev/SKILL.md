---
name: harness-dev
description: >-
  This skill should be used when the user invokes "/harness-dev", asks to
  "build a full application", "develop a complex project", "scaffold a new project",
  "implement a feature end-to-end", or when a development task clearly requires
  significant multi-file implementation across multiple components.
  Also consider proactively suggesting this workflow when detecting a task that would
  benefit from structured planning, implementation, and quality evaluation cycles
  (e.g. full-stack development, multi-component systems, tasks spanning 5+ files).
  Not suitable for quick fixes, single-file changes, or debugging tasks.
argument-hint: "<task description>"
allowed-tools: ["Agent", "Read", "Write", "Edit", "Bash", "Grep", "Glob", "TaskCreate", "TaskUpdate"]
version: 0.1.0
---

# Harness Development Workflow

GAN-inspired Planner/Generator/Evaluator pattern for long-running development tasks. Separate agents handle planning, implementation, and quality evaluation in isolated contexts, communicating through files in `.harness/`.

## When NOT to Use

- Single-file changes, quick fixes, or debugging tasks
- Tasks that can be completed in under 15 minutes
- Pure refactoring without new functionality

## Workflow Overview

```
Planner → [spec.md] → Generator → [code + report] → Evaluator → [evaluation]
                          ↑                                          │
                          └──── feedback loop (max 3 rounds) ────────┘
```

## Orchestration Steps

### 1. Initialize Workspace

```bash
mkdir -p .harness
```

Communication files:

| File | Writer | Purpose |
|------|--------|---------|
| `.harness/spec.md` | Planner | Detailed specification with task type |
| `.harness/generator-report.md` | Generator | Implementation status per round |
| `.harness/evaluation.md` | Evaluator | Verdict (PASS/FAIL) with details |
| `.harness/feedback.md` | Orchestrator | Accumulated feedback for next generator round |

Add `.harness/` to `.gitignore`.

### 2. Run Planner Agent

Use the **Agent tool** to launch the `planner` agent with the following prompt:

```
Task: [user's original description]
Working directory: [current project path]
Write the specification to .harness/spec.md
```

Wait for the planner to complete. Read `.harness/spec.md` and confirm the task type classification (web-app / api / cli / library / other) for later use.

### 3. Generator-Evaluator Loop

Execute up to **3 rounds** of the following cycle:

#### Generator Phase

Use the **Agent tool** to launch the `code-generator` agent:

```
Round: [N] of 3
Specification: Read .harness/spec.md
[If round > 1] Previous evaluation feedback: Read .harness/feedback.md
Write your implementation report to .harness/generator-report.md
```

#### Evaluator Phase

Before launching the evaluator, read the evaluation patterns reference file at `${CLAUDE_PLUGIN_ROOT}/skills/harness-dev/references/evaluation-patterns.md` and extract the section relevant to the task type identified in the spec.

Use the **Agent tool** to launch the `evaluator` agent:

```
Round: [N] of 3
Task type: [type from spec.md]
Specification: Read .harness/spec.md
Generator report: Read .harness/generator-report.md
Additional evaluation criteria for this task type:
[paste relevant section from evaluation-patterns.md]
Write your evaluation to .harness/evaluation.md
```

#### Loop Control

After each evaluator round:

- **PASS**: Exit loop, proceed to completion report.
- **FAIL with rounds remaining**: Read `.harness/evaluation.md`, copy the issues and recommendations to `.harness/feedback.md`, start next generator round.
- **FAIL after round 3**: Exit loop, report remaining issues to user.

### 4. Round Summary

After each round, display to the user:

```
## Round [N]/3 結果

**判定**: PASS / FAIL
**実装状況**: [summary of what was implemented]
**検出された問題**: [issues found, if any]
**次のアクション**: [continuing to round N+1 / completed / remaining issues]
```

### 5. Final Report

After completion or loop exhaustion, provide a comprehensive summary:
- What was built (files created/modified)
- What works correctly
- Any remaining issues (if loop exhausted with FAIL)
- Suggested next steps

## Important Notes

- Run each agent in an **isolated context** — communicate between agents only through files in `.harness/`
- Grant the generator full tool access for implementation
- Ensure the evaluator **never modifies source code** — it only validates and reports
- If the project already has tests, run them during evaluation; if not, include basic test creation in the generator's scope
- Aim for a spec ambitious enough to deliver real value, but realistic for a single implementation pass

## Evaluation Patterns

For detailed per-task-type evaluation criteria, consult:

- **`references/evaluation-patterns.md`** — Common and task-specific evaluation strategies (web-app, API, CLI, library)

This reference file is designed to be extensible. To add a new task type, append a new section following the existing format.
