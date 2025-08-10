---
description: "Spec-Driven Development Phase 5: Implementation Phase で単一タスクを実行します"
argumen-hint: [specディレクトリのパス] [タスクID]
---

Execute a **single task** in **Phase 5: Implementation Phase** of Spec-Driven Development (SDD) to implement a specific component according to the established specifications and implementation plan. Ultrathink.

## Prerequisites

Before executing this command, ensure:

1. **SDD Guide Understanding**: Review @~/Documents/ihdocs/spec-driven-development.md for:
   - Phase 5: Implementation objectives and principles
   - Adherence to specifications
   - Testing requirements
   - Documentation updates

2. **All Previous Phases Completed**: Verify completion of:
   - Phase 1: Preparation (spec directory created)
   - Phase 2: Requirements (requirements approved)
   - Phase 3: Design (design approved)
   - Phase 4: Implementation Plan (plan approved)

3. **Development Environment Ready**:
   - Required tools and frameworks installed
   - Testing framework configured
   - Linters and formatters setup
   - Version control initialized

4. **Task Dependencies Completed**:
   - All dependency tasks for the target task must be completed
   - Check implementation-plan.md for dependency matrix
   - Verify completion status in metadata.json

## Arguments

`$ARGUMENTS` should contain two parameters separated by space:
1. **Spec directory path**: Path to the spec directory created in Phase 1 (e.g., `./.specdd/specs/[spec-name]`)
2. **Task ID**: The specific task identifier to execute (e.g., `TASK-001`, `TASK-002`)

Example usage:

```
/sdd-implement ./.specdd/specs/user-auth TASK-003
```

## Execution Steps

### Step 0: SDD Methodology and Plan Review

1. **Load SDD documentation**: Read @~/Documents/ihdocs/spec-driven-development.md
2. **Focus on Phase 5 principles**:
   - No deviation without approval
   - Test-first when applicable
   - Continuous validation
   - Documentation synchronization
3. **Verify all phases completed**:
   - Check `metadata.json` for phase statuses
   - Load all specification documents

### Step 1: Initialize Single Task Implementation

1. **Parse arguments**:

   ```bash
   # Extract spec directory and task ID from arguments
   SPEC_DIR="$1"
   TASK_ID="$2"
   
   # Validate arguments
   if [ -z "$SPEC_DIR" ] || [ -z "$TASK_ID" ]; then
     echo "Error: Both spec directory and task ID required"
     echo "Usage: /sdd-implement [spec-dir] [task-id]"
     exit 1
   fi
   ```

2. **Validate prerequisites**:

   ```bash
   # Check all required files exist
   if [ ! -f "$SPEC_DIR/implementation-plan.md" ]; then
     echo "Error: Implementation plan not found"
     exit 1
   fi
   ```

3. **Load task context**:
   - Read `$SPEC_DIR/metadata.json`
   - Load implementation plan
   - Find and load specific task details for `$TASK_ID`
   - Verify task exists in plan
   - Check task status (not already completed)

4. **Verify dependencies**:
   - Load dependency matrix from implementation plan
   - Check all dependency tasks are marked as completed
   - If dependencies not met, block task execution

   ```
   Dependencies for TASK-003:
   - TASK-001: ✅ Completed
   - TASK-002: ✅ Completed
   All dependencies satisfied, proceeding...
   ```

5. **Setup task tracking**:

   ```json
   {
     "task_execution": {
       "task_id": "[TASK_ID]",
       "started_at": "[timestamp]",
       "status": "initializing",
       "dependencies_checked": true,
       "test_results": null,
       "completion_status": null
     }
   }
   ```

### Step 2: Single Task Execution Workflow

For the specified task `$TASK_ID`:

#### 2.1: Task Preparation

1. **Load task details**:
   - Task ID and description
   - Dependencies
   - Acceptance criteria
   - Implementation steps

2. **Verify dependencies**:

   ```
   Check: All dependency tasks completed?
   If NO → Mark as blocked, skip to next task
   If YES → Proceed with implementation
   ```

3. **Update task status**:
   - Mark task as "in_progress"
   - Log start time
   - Notify user of task start

#### 2.2: Implementation Process

1. **Follow implementation steps**:

   ```
   For each step in task.implementation_steps:
     1. Execute step
     2. Validate result
     3. Handle errors if any
     4. Document changes
   ```

2. **Apply coding standards**:
   - Follow project style guide
   - Use consistent naming
   - Add appropriate comments
   - Maintain code organization

3. **Version control**:
   - Create feature branch if needed
   - Commit with meaningful messages
   - Reference task ID in commits

#### 2.3: Testing Implementation

1. **Write tests first (if TDD)**:

   ```typescript
   // Example TDD approach
   describe('Component', () => {
     test('should meet requirement X', () => {
       // Given
       const input = setupTestData();
       
       // When
       const result = component.process(input);
       
       // Then
       expect(result).toMatchExpectation();
     });
   });
   ```

2. **Implement to pass tests**:
   - Write minimal code to pass
   - Refactor for quality
   - Ensure all tests green

3. **Run test suite**:

   ```bash
   npm test
   # or
   pytest
   # or appropriate test command
   ```

#### 2.4: Validation Against Specifications

1. **Requirements check**:
   - Map implementation to requirements
   - Verify acceptance criteria met
   - Document any deviations

2. **Design compliance**:
   - Verify architecture adherence
   - Check interface implementations
   - Validate data models

3. **Quality checks**:
   - Run linters
   - Check code coverage
   - Perform security scan

### Step 3: Task Implementation Execution

Execute the specific task according to its definition:

#### Task Information Display

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Executing: TASK-003 - Business Logic
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Dependencies:
✅ TASK-001: Project Setup (completed)
✅ TASK-002: Database Setup (completed)

Implementation Steps:
1. Implement service layer
2. Add validation logic
3. Write unit tests
4. Verify all tests passing

Acceptance Criteria:
- [ ] Service layer created and functional
- [ ] Input validation working correctly
- [ ] Unit test coverage > 80%
- [ ] All tests passing
```

#### Execute Implementation Steps

For the current task, follow each implementation step:

1. **Step-by-step execution**:

   ```
   Step 1/4: Implement service layer
   ├─ Creating service directory...
   ├─ Implementing core logic...
   ├─ Adding error handling...
   └─ ✓ Service layer complete
   
   Step 2/4: Add validation logic
   ├─ Defining validation rules...
   ├─ Implementing validators...
   ├─ Adding error messages...
   └─ ✓ Validation complete
   ```

2. **Real-time progress tracking**:

   ```
   Current Progress:
   ████████████░░░░░░░░ 60% (Step 3/4)
   Elapsed Time: 45 minutes
   Estimated Remaining: 30 minutes
   ```

### Step 4: Single Task Progress Reporting

Maintain real-time status updates for the current task:

```markdown
## Task Implementation Progress Report

### Current Task Status
- **Task ID**: TASK-003
- **Task Name**: Business Logic Implementation
- **Status**: 🔄 In Progress
- **Started**: [timestamp]
- **Progress**: 60% (Step 3/4)

### Implementation Steps Progress
✅ Step 1: Implement service layer (15 min)
✅ Step 2: Add validation logic (20 min)
🔄 Step 3: Write unit tests
  - [x] Test setup complete
  - [x] Service tests written
  - [ ] Validation tests written
  - [ ] Edge case tests
⏳ Step 4: Verify all tests passing

### Test Results (Current)
- Unit Tests: 23/35 written
- Tests Passing: 23/23 ✅
- Coverage: 67% (target: 80%)

### Dependencies Status
✅ TASK-001: Project Setup
✅ TASK-002: Database Setup

### Files Modified
- src/services/businessLogic.ts (created)
- src/validators/inputValidator.ts (created)
- tests/services/businessLogic.test.ts (created)

### Blockers/Issues
- None currently
```

### Step 5: Error Handling and Recovery

#### Error Detection
1. **Build failures**:

   ```bash
   # If build fails
   - Review error messages
   - Check dependencies
   - Verify configuration
   - Fix and retry
   ```

2. **Test failures**:

   ```bash
   # If tests fail
   - Identify failing tests
   - Debug implementation
   - Fix issues
   - Re-run test suite
   ```

3. **Specification violations**:

   ```
   # If deviates from spec
   - Document deviation
   - Assess impact
   - Get user approval
   - Update specifications
   ```

#### Recovery Procedures
1. **Rollback if needed**:

   ```bash
   git checkout -- .
   git clean -fd
   # or
   git reset --hard [last-good-commit]
   ```

2. **Fix forward**:
   - Identify root cause
   - Implement fix
   - Add regression test
   - Verify solution

### Step 6: Task Completion Workflow

Upon completing the specified task:

1. **Verify acceptance criteria**:

   ```
   For each criterion in task.acceptance_criteria:
     ✓ Criterion met?
     ✓ Evidence documented?
     ✓ Tests passing?
   ```

2. **Update tracking**:

   ```json
   {
     "task_id": "TASK-XXX",
     "status": "completed",
     "completed_at": "[timestamp]",
     "actual_duration": "[time]",
     "test_coverage": "XX%",
     "notes": "Any deviations or issues"
   }
   ```

3. **Commit changes**:

   ```bash
   git add .
   git commit -m "TASK-XXX: Complete [task description]
   
   - Implemented [feature]
   - Added tests with XX% coverage
   - Updated documentation
   
   Closes #XXX"
   ```

### Step 7: Task Completion Verification

After completing the task:

1. **Task validation**:
   - All acceptance criteria met?
   - All tests passing?
   - Code reviewed?
   - Documentation updated?

2. **Run task-specific tests**:

   ```bash
   # Run tests related to this task
   npm test -- --testPathPattern="businessLogic"
   
   # Check coverage for new code
   npm run coverage -- --collectCoverageFrom="src/services/**"
   
   # Run linters on modified files
   npm run lint -- src/services/ src/validators/
   ```

3. **Task completion report**:

   ```
   ✅ Task TASK-003 Completed Successfully!
   
   Summary:
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Task: Business Logic Implementation
   Duration: 1 hour 15 minutes
   
   Deliverables:
   • Service layer implemented
   • Validation logic added
   • Unit tests written (35 tests)
   
   Test Results:
   • Unit Tests: 35/35 passing ✅
   • Coverage: 85% (target: 80%) ✅
   
   Next Possible Tasks:
   → TASK-004: Data Access Layer (dependencies met)
   → TASK-005: API Implementation (requires TASK-004)
   ```

### Step 8: Special Implementation Patterns

#### Test-Driven Development (TDD)
When TDD is specified:

```typescript
// 1. RED: Write failing test
test('計算機能が正しく動作する', () => {
  // Given
  // テスト条件の設定
  const calculator = new Calculator();
  
  // When
  // 操作の実行
  const result = calculator.add(2, 3);
  
  // Then
  // 期待結果の検証
  expect(result).toBe(5);
});

// 2. GREEN: Minimal implementation
class Calculator {
  add(a: number, b: number): number {
    return 5; // Fake it!
  }
}

// 3. REFACTOR: Improve
class Calculator {
  add(a: number, b: number): number {
    return a + b; // Generalized
  }
}
```

#### Incremental Integration
When specified in plan:

1. **Component by component**:
   - Implement component A
   - Test component A
   - Implement component B
   - Test component B
   - Integrate A + B
   - Test integration

2. **Continuous validation**:
   - After each integration
   - Run integration tests
   - Verify system stability

### Step 9: Documentation Updates

Maintain documentation throughout:

1. **Code documentation**:

   ```typescript
   /**
    * 指定された要件を処理します
    * @param input - 処理対象のデータ
    * @returns 処理結果
    * @throws ValidationError - 入力が無効な場合
    */
   function processRequirement(input: Data): Result {
     // Implementation
   }
   ```

2. **README updates**:
   - New features added
   - Setup instructions
   - Usage examples
   - API changes

3. **Specification updates**:
   - Document any approved changes
   - Update design if modified
   - Note implementation decisions

### Step 10: Final Implementation Validation

Before marking implementation complete:

1. **Comprehensive testing**:

   ```bash
   # Run all test suites
   npm run test:unit
   npm run test:integration
   npm run test:e2e
   
   # Performance testing
   npm run test:performance
   
   # Security scanning
   npm run security:scan
   ```

2. **Requirements verification**:

   ```
   Requirements Coverage Check:
   ━━━━━━━━━━━━━━━━━━━━━━━━━━
   FR-001: ✅ Implemented
   FR-002: ✅ Implemented
   NFR-001: ✅ Validated
   NFR-002: ✅ Validated
   
   All requirements satisfied: ✅
   ```

3. **Quality metrics**:

   ```
   Code Quality Report:
   ━━━━━━━━━━━━━━━━━━━
   • Test Coverage: 85%
   • Code Complexity: Low
   • Duplication: < 3%
   • Security Issues: 0
   • Lint Warnings: 0
   ```

### Step 11: Single Task Completion

Upon successful task implementation:

1. **Update metadata.json**:

   ```json
   {
     "task_status": {
       "TASK-003": {
         "status": "completed",
         "completed_at": "[timestamp]",
         "actual_duration": "1h 15m",
         "test_coverage": "85%",
         "files_modified": 3,
         "lines_added": 450
       }
     },
     "completed_tasks": ["TASK-001", "TASK-002", "TASK-003"],
     "next_available_tasks": ["TASK-004"]
   }
   ```

2. **Generate completion report**:

   ```markdown
   # Implementation Completion Report
   
   ## Summary
   - Task: [Task name]
   - Duration: [Actual time]
   - Completion: 100%
   
   ## Deliverables
   - Source Code: [paths]
   - Tests: [paths]
   - Documentation: [paths]
   
   ## Metrics
   - LOC Added: XXXX
   - Test Coverage: XX%
   - Performance: [metrics]
   
   ## Deviations from Plan
   - [Any changes made]
   
   ## Lessons Learned
   - [What worked well]
   - [What could improve]
   ```

3. **Final task presentation**:

   ```
   ✅ Task Implementation Completed Successfully!
   
   📊 Task Statistics:
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Task: TASK-003 - Business Logic
   Duration: 1h 15m
   Test Coverage: 85% ✅
   Tests: 35/35 passing ✅
   
   📁 Files Created/Modified:
   • ➕ src/services/businessLogic.ts (250 lines)
   • ➕ src/validators/inputValidator.ts (100 lines)
   • ➕ tests/services/businessLogic.test.ts (100 lines)
   
   🎯 Acceptance Criteria:
   ✅ Service layer created and functional
   ✅ Input validation working correctly
   ✅ Unit test coverage > 80%
   ✅ All tests passing
   
   🔗 Unblocked Tasks:
   → TASK-004: Data Access Layer
   
   📦 Ready to commit:
   git add .
   git commit -m "TASK-003: Implement business logic layer"
   
   To implement next task, run:
   /sdd-implement ./.specdd/specs/[spec-name] TASK-004
   ```

## Implementation Best Practices

### Code Quality

1. **Follow standards**:
   - Project style guide
   - Language conventions
   - Framework best practices

2. **Write clean code**:
   - Clear naming
   - Single responsibility
   - DRY principle
   - SOLID principles

3. **Comment wisely**:
   - Document "why" not "what"
   - Complex algorithms
   - Business logic rationale

### Testing Discipline

1. **Test coverage**:
   - Aim for 80%+ coverage
   - Test edge cases
   - Test error conditions

2. **Test types**:
   - Unit tests for logic
   - Integration for interactions
   - E2E for workflows

3. **Test maintenance**:
   - Keep tests simple
   - Update with code changes
   - Remove obsolete tests

### Version Control

1. **Commit practices**:
   - Small, focused commits
   - Meaningful messages
   - Reference task IDs

2. **Branch strategy**:
   - Feature branches
   - Regular merges
   - Clean history

### Documentation

1. **Keep current**:
   - Update with changes
   - Remove outdated info
   - Version appropriately

2. **Be comprehensive**:
   - Setup instructions
   - Usage examples
   - Troubleshooting

## Error Recovery Strategies

### Common Issues and Solutions

1. **Dependency conflicts**:
   - Issue: Package version conflicts
   - Solution: Use lock files, update carefully

2. **Test failures**:
   - Issue: Tests fail after changes
   - Solution: Debug systematically, fix root cause

3. **Performance degradation**:
   - Issue: Implementation slower than expected
   - Solution: Profile, optimize, cache

4. **Integration issues**:
   - Issue: Components don't work together
   - Solution: Review interfaces, add adapters

### Rollback Procedures

1. **Git rollback**:

   ```bash
   # Rollback single file
   git checkout -- path/to/file
   
   # Rollback to commit
   git reset --hard [commit-hash]
   
   # Rollback merge
   git revert -m 1 [merge-commit]
   ```

2. **Database rollback**:

   ```bash
   # Run down migration
   npm run migrate:down
   
   # Restore backup
   pg_restore -d dbname backup.sql
   ```

## Continuous Improvement

### During Implementation

1. **Regular reviews**:
   - Daily progress check
   - Weekly milestone review
   - Phase completion review

2. **Feedback loops**:
   - User feedback
   - Team feedback
   - Automated metrics

3. **Adaptation**:
   - Adjust estimates
   - Refine approach
   - Update documentation

### Post-Implementation

1. **Retrospective**:
   - What went well?
   - What was challenging?
   - What to improve?

2. **Knowledge sharing**:
   - Document learnings
   - Share with team
   - Update templates

## Notes for Claude Code Agent

- **ALWAYS** begin by reading @~/Documents/ihdocs/spec-driven-development.md
- **ALWAYS** follow the implementation plan strictly
- **NEVER** skip testing requirements
- **NEVER** deviate from specifications without approval
- Implement incrementally and validate continuously
- Maintain high code quality standards
- Keep documentation synchronized with code
- Report progress regularly and clearly
- Handle errors gracefully and recover properly
- Focus on meeting requirements, not perfection
- Be prepared to rollback if needed
- Ask for clarification when specifications are ambiguous
- Celebrate small wins and completed phases
