# Review Guidelines

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
