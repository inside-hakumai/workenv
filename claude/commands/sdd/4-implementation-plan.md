---
description: "Spec-Driven Development Phase 4: Implementation Planning Phase を実行して実装計画を作成します"
argumen-hint: [Phase 1で作成したspecディレクトリのパス]
---

Execute **Phase 4: Implementation Planning Phase** of Spec-Driven Development (SDD) to create a detailed, executable plan for implementing the design created in Phase 3. Ultrathink.

## Prerequisites

Before executing this command, ensure:

1. **SDD Guide Understanding**: Review @~/Documents/ihdocs/spec-driven-development.md for:
   - Phase 4: Implementation Planning objectives and deliverables
   - Task breakdown and dependency management
   - Testing strategy definition
   - Implementation sequencing principles

2. **Phase 3 Completion**: Verify that Phase 3 has been completed:
   - Design document has been approved
   - `metadata.json` shows Phase 3 as completed
   - All architectural decisions and interfaces are defined

3. **Project Context**: Have understanding of:
   - Development workflow and practices
   - Testing frameworks and tools
   - CI/CD pipeline requirements
   - Team capacity and skills

## Arguments

`$ARGUMENTS` should be:
- **Spec directory path**: Path to the spec directory created in Phase 1 (e.g., `./.specdd/specs/[task-name]`)

## Execution Steps

### Step 0: SDD Methodology and Design Review

1. **Load SDD documentation**: Read @~/Documents/ihdocs/spec-driven-development.md
2. **Focus on Phase 4 objectives**:
   - Purpose: Create detailed implementation plan
   - Task decomposition strategies
   - Dependency management
   - Testing approach
3. **Verify Phase 3 completion**:
   - Check `metadata.json` for design phase status
   - Load and review approved design document
   - Review requirements for context

### Step 1: Initialize Implementation Planning Phase

1. **Validate spec directory**:

   ```bash
   # Check directory and design file
   if [ ! -f "$SPEC_DIR/design.md" ]; then
     echo "Error: Design not found"
     exit 1
   fi
   ```

2. **Load project context**:
   - Read `$SPEC_DIR/metadata.json`
   - Update current_phase to "implementation_plan"
   - Load approved design from `design.md`
   - Review requirements from `requirements.md`

3. **Analyze implementation scope**:
   - Count components to implement
   - Identify interfaces to build
   - List data models to create
   - Note integrations required

### Step 2: Task Identification and Breakdown

1. **Component-Based Task Extraction**:
   - For each component in design:
     - Create setup/scaffolding task
     - Create implementation task(s)
     - Create unit test task
     - Create integration task

2. **Infrastructure Tasks**:
   - Database schema creation
   - Configuration setup
   - Environment preparation
   - Dependency installation

3. **Cross-Cutting Tasks**:
   - Logging implementation
   - Error handling setup
   - Security implementation
   - Performance optimization

4. **Testing Tasks**:
   - Test environment setup
   - Unit test creation
   - Integration test creation
   - End-to-end test creation

### Step 3: Dependency Analysis

1. **Identify Dependencies**:
   - Technical dependencies (A needs B to exist)
   - Data dependencies (A needs data from B)
   - Interface dependencies (A implements interface B)
   - Testing dependencies (Test A needs Component B)

2. **Create Dependency Matrix**:

   ```
   Task A → depends on → [Task B, Task C]
   Task B → depends on → [Task D]
   Task C → depends on → []
   Task D → depends on → []
   ```

3. **Detect Circular Dependencies**:
   - Check for dependency cycles
   - Resolve or refactor if found

### Step 4: Implementation Sequencing

1. **Topological Sort**:
   - Order tasks based on dependencies
   - Create levels/phases of implementation

2. **Parallel Opportunities**:
   - Identify tasks that can run in parallel
   - Group independent tasks

3. **Critical Path Analysis**:
   - Identify longest dependency chain
   - Mark critical tasks

### Step 5: Create Implementation Plan Document

Update `$SPEC_DIR/implementation-plan.md` with comprehensive plan:

```markdown
# Implementation Plan

## Executive Summary
[Brief overview of implementation approach and timeline]

## Implementation Overview

### Scope Summary
- **Components to Implement**: [count]
- **APIs to Build**: [count]
- **Data Models**: [count]
- **Test Suites**: [count]
- **Estimated Total Tasks**: [count]

### Implementation Strategy
- **Approach**: [Bottom-up/Top-down/Middle-out]
- **Testing Strategy**: [TDD/BDD/Traditional]
- **Integration Method**: [Big-bang/Incremental]

## Task Breakdown

### Phase 1: Foundation
Tasks that must be completed first, with no dependencies.

#### Task 1.1: Project Setup
- **ID**: TASK-001
- **Description**: Initialize project structure and configuration
- **Type**: Infrastructure
- **Dependencies**: None
- **Estimated Effort**: [time estimate]
- **Acceptance Criteria**:
  - [ ] Project structure created
  - [ ] Configuration files in place
  - [ ] Development environment ready
- **Implementation Steps**:
  1. Create directory structure
  2. Initialize package manager
  3. Setup configuration files
  4. Configure development tools

#### Task 1.2: Database Setup
- **ID**: TASK-002
- **Description**: Create database schema and migrations
- **Type**: Infrastructure
- **Dependencies**: None
- **Estimated Effort**: [time estimate]
- **Acceptance Criteria**:
  - [ ] Database schema created
  - [ ] Migrations functional
  - [ ] Seed data available
- **Implementation Steps**:
  1. Create database
  2. Define schema
  3. Create migration scripts
  4. Setup seed data

### Phase 2: Core Components
Tasks that depend on Phase 1 completion.

#### Task 2.1: [Component Name] Implementation
- **ID**: TASK-003
- **Description**: Implement core business logic component
- **Type**: Development
- **Dependencies**: [TASK-001]
- **Estimated Effort**: [time estimate]
- **Acceptance Criteria**:
  - [ ] Component structure created
  - [ ] Core logic implemented
  - [ ] Unit tests passing
  - [ ] Documentation complete
- **Implementation Steps**:
  1. Create component structure
  2. Implement interfaces
  3. Add business logic
  4. Write unit tests
  5. Document API

#### Task 2.2: [Component Name] Testing
- **ID**: TASK-004
- **Description**: Create comprehensive test suite
- **Type**: Testing
- **Dependencies**: [TASK-003]
- **Estimated Effort**: [time estimate]
- **Test Coverage Target**: 80%
- **Test Types**:
  - Unit tests
  - Integration tests
  - Edge case tests
- **Implementation Steps**:
  1. Setup test framework
  2. Write unit tests
  3. Write integration tests
  4. Verify coverage

### Phase 3: Integration
Tasks that integrate components.

#### Task 3.1: API Implementation
- **ID**: TASK-005
- **Description**: Implement REST/GraphQL API endpoints
- **Type**: Development
- **Dependencies**: [TASK-003, TASK-002]
- **Estimated Effort**: [time estimate]
- **Endpoints to Implement**:
  - GET /resource
  - POST /resource
  - PUT /resource/:id
  - DELETE /resource/:id
- **Implementation Steps**:
  1. Setup routing
  2. Implement controllers
  3. Add validation
  4. Connect to services
  5. Add error handling

### Phase 4: Polish and Optimization
Final tasks before implementation complete.

#### Task 4.1: Performance Optimization
- **ID**: TASK-006
- **Description**: Optimize performance bottlenecks
- **Type**: Optimization
- **Dependencies**: [All development tasks]
- **Estimated Effort**: [time estimate]
- **Performance Targets**:
  - Response time < 200ms
  - Throughput > 1000 req/s
- **Implementation Steps**:
  1. Profile application
  2. Identify bottlenecks
  3. Implement caching
  4. Optimize queries
  5. Verify improvements

## Dependency Matrix

### Visual Dependency Graph
```

TASK-001 ──┬──▶ TASK-003 ──▶ TASK-004
           │                     │
           └──▶ TASK-002 ──┬────┴──▶ TASK-005 ──▶ TASK-006
                            │
                            └──▶ [Other tasks]

```

### Dependency Table
| Task ID | Depends On | Enables | Can Parallel With |
|---------|------------|---------|-------------------|
| TASK-001 | None | TASK-003, TASK-002 | - |
| TASK-002 | None | TASK-005 | TASK-003 |
| TASK-003 | TASK-001 | TASK-004, TASK-005 | TASK-002 |
| TASK-004 | TASK-003 | TASK-006 | TASK-005 |
| TASK-005 | TASK-002, TASK-003 | TASK-006 | TASK-004 |
| TASK-006 | All | None | - |

## Implementation Order

### Sequential Execution Plan
1. **Phase 1** (Parallel possible):
   - TASK-001: Project Setup
   - TASK-002: Database Setup

2. **Phase 2** (Parallel possible):
   - TASK-003: Component Implementation
   
3. **Phase 3** (Parallel possible):
   - TASK-004: Component Testing
   - TASK-005: API Implementation

4. **Phase 4** (Sequential):
   - TASK-006: Performance Optimization

### Critical Path
```

TASK-001 → TASK-003 → TASK-005 → TASK-006
Total Critical Path Duration: [sum of task estimates]

```

## Testing Strategy

### Test Levels

#### Unit Testing
- **Coverage Target**: 80%
- **Framework**: [Jest/Pytest/etc.]
- **Approach**: Test each component in isolation
- **Execution**: During each component task

#### Integration Testing
- **Coverage Target**: Key workflows
- **Framework**: [Testing framework]
- **Approach**: Test component interactions
- **Execution**: After component completion

#### End-to-End Testing
- **Coverage Target**: Critical user journeys
- **Framework**: [E2E framework]
- **Approach**: Test complete workflows
- **Execution**: After integration complete

### Test Data Management
- **Strategy**: [Fixtures/Factories/Builders]
- **Data Sources**: [Mock/Test DB/Staging]
- **Cleanup**: [After each test/test suite]

## Risk Mitigation

### Technical Risks

#### Risk 1: [Dependency Version Conflicts]
- **Probability**: Medium
- **Impact**: High
- **Mitigation**: Lock dependency versions
- **Contingency**: Rollback plan ready

#### Risk 2: [Performance Issues]
- **Probability**: Low
- **Impact**: High
- **Mitigation**: Early performance testing
- **Contingency**: Optimization phase allocated

### Implementation Risks

#### Risk 1: [Scope Creep]
- **Probability**: Medium
- **Impact**: Medium
- **Mitigation**: Strict change control
- **Contingency**: Buffer time allocated

## Rollback Plan

### Rollback Strategy
1. **Version Control**: Tag each completed phase
2. **Database**: Migration rollback scripts ready
3. **Configuration**: Previous configs backed up
4. **Dependencies**: Lock files preserved

### Rollback Triggers
- Critical bug in production
- Performance degradation > 50%
- Security vulnerability discovered
- Data corruption detected

## Verification Steps

### Phase Completion Criteria

#### Phase 1 Complete When:
- [ ] All infrastructure tasks done
- [ ] Development environment functional
- [ ] Team can start development

#### Phase 2 Complete When:
- [ ] All components implemented
- [ ] Unit tests passing
- [ ] Code review completed

#### Phase 3 Complete When:
- [ ] All integrations working
- [ ] Integration tests passing
- [ ] API documentation complete

#### Phase 4 Complete When:
- [ ] Performance targets met
- [ ] All tests passing
- [ ] Documentation complete

### Definition of Done
- [ ] Code implemented and reviewed
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Performance validated
- [ ] Security checked
- [ ] Accessibility verified

## Resource Allocation

### Team Assignment
- **Task Group 1**: [Team member/role]
- **Task Group 2**: [Team member/role]
- **Testing**: [Team member/role]
- **Review**: [Team member/role]

### Time Estimates

#### Summary
- **Total Estimated Effort**: [sum of all tasks]
- **Calendar Time (Sequential)**: [critical path duration]
- **Calendar Time (Parallel)**: [optimized duration]
- **Buffer Time**: 20% of total

#### Breakdown by Phase
- Phase 1: [time]
- Phase 2: [time]
- Phase 3: [time]
- Phase 4: [time]

## Implementation Notes

### Coding Standards
- Follow project style guide
- Use linting and formatting tools
- Maintain consistent naming

### Documentation Requirements
- Inline code comments for complex logic
- API documentation for all endpoints
- README updates for new features

### Version Control
- Branch naming: feature/TASK-XXX-description
- Commit message format: "TASK-XXX: Description"
- PR required for merge

## Appendix

### Task Template
```

#### Task X.X: [Task Name]
- **ID**: TASK-XXX
- **Description**: [What needs to be done]
- **Type**: [Infrastructure/Development/Testing/Documentation]
- **Dependencies**: [List of task IDs]
- **Estimated Effort**: [time estimate]
- **Acceptance Criteria**:
  - [ ] Criterion 1
  - [ ] Criterion 2
- **Implementation Steps**:
  1. Step 1
  2. Step 2

```

### Estimation Guidelines
- Small Task: 1-2 hours
- Medium Task: 2-4 hours
- Large Task: 4-8 hours
- Epic Task: > 8 hours (should be broken down)
```

### Step 6: Validation and Optimization

1. **Validate Plan Completeness**:
   - All design components have tasks
   - All requirements are addressed
   - Testing coverage is adequate
   - Dependencies are logical

2. **Optimize Execution Path**:
   - Identify parallelization opportunities
   - Minimize critical path
   - Balance workload
   - Consider resource constraints

3. **Risk Assessment**:
   - Review technical risks
   - Check dependency risks
   - Validate time estimates
   - Consider team availability

### Step 7: Present to User for Review

1. **Format presentation**:

   ```
   📋 Implementation Plan Ready for Review
   
   Task: [task name]
   Location: [spec directory path]
   
   Plan Summary:
   ✓ Total Tasks: [count]
   ✓ Implementation Phases: [count]
   ✓ Estimated Duration: [time]
   ✓ Critical Path: [duration]
   
   Phase Breakdown:
   • Phase 1: Foundation ([X] tasks)
   • Phase 2: Core Components ([Y] tasks)
   • Phase 3: Integration ([Z] tasks)
   • Phase 4: Polish ([W] tasks)
   
   Key Highlights:
   1. [Major implementation approach]
   2. [Testing strategy]
   3. [Risk mitigation approach]
   
   Parallelization Opportunities:
   • [Opportunity 1]
   • [Opportunity 2]
   
   Please review the plan at: [path]/implementation-plan.md
   ```

2. **Request specific feedback**:
   - "Is the task breakdown granular enough?"
   - "Are the time estimates realistic?"
   - "Do the dependencies make sense?"
   - "Is the testing strategy adequate?"
   - "Are there missing tasks or considerations?"

### Step 8: Iteration Based on Feedback

**Repeat until approved:**

1. **Process feedback**:
   - Task additions/removals
   - Dependency adjustments
   - Time estimate changes
   - Sequencing modifications

2. **Update plan**:
   - Revise task list
   - Adjust dependencies
   - Recalculate critical path
   - Update time estimates

3. **Re-validate**:
   - Check dependency consistency
   - Verify completeness
   - Confirm feasibility

4. **Present updates**:
   - Highlight changes
   - Explain impact
   - Request re-review

### Step 9: Finalize Implementation Plan

Upon user approval:

1. **Update metadata.json**:

   ```json
   {
     "phase_status": {
       "implementation_plan": "completed"
     },
     "plan_approved_at": "[timestamp]",
     "plan_version": "1.0",
     "total_tasks": [count],
     "estimated_duration": "[time]",
     "critical_path_duration": "[time]"
   }
   ```

2. **Create execution checklist**:
   - Export task list as checklist
   - Create tracking spreadsheet
   - Setup project board

3. **Prepare for implementation**:

   ```
   ✅ Phase 4: Implementation Planning completed!
   
   📊 Plan Statistics:
   - Total Tasks: [count]
   - Phases: [count]
   - Critical Path: [duration]
   - Parallel Paths: [count]
   
   Implementation Approach:
   • Strategy: [TDD/BDD/Traditional]
   • Integration: [Incremental/Big-bang]
   • Testing: [Coverage target]%
   
   Ready to Start:
   ✓ Task breakdown complete
   ✓ Dependencies mapped
   ✓ Testing strategy defined
   ✓ Risks identified and mitigated
   
   Next Step:
   → Proceed to Phase 5: Implementation
   → Command: /sdd-implement [spec-directory]
   → First Task: TASK-001 - [Description]
   ```

## Plan Quality Criteria

### Evaluation Metrics

1. **Completeness**:
   - All design elements have tasks
   - Dependencies fully mapped
   - Testing tasks included
   - Documentation tasks included

2. **Feasibility**:
   - Time estimates realistic
   - Dependencies logical
   - Resources available
   - Skills match requirements

3. **Clarity**:
   - Tasks clearly defined
   - Acceptance criteria specific
   - Steps actionable
   - Dependencies explicit

4. **Efficiency**:
   - Parallelization maximized
   - Critical path minimized
   - Resources optimized
   - Redundancy eliminated

## Error Handling

### Common Issues

1. **Circular Dependencies**:
   - Issue: Task A depends on B, B depends on A
   - Resolution: Refactor tasks or combine

2. **Unrealistic Estimates**:
   - Issue: Tasks estimated too optimistically
   - Resolution: Add buffer time, break down large tasks

3. **Missing Dependencies**:
   - Issue: Hidden dependencies discovered
   - Resolution: Update dependency matrix

4. **Resource Conflicts**:
   - Issue: Same resource needed simultaneously
   - Resolution: Adjust sequencing

## Best Practices

1. **Task Definition**:
   - Keep tasks small (< 8 hours)
   - Make acceptance criteria measurable
   - Include testing in each task
   - Document assumptions

2. **Dependency Management**:
   - Minimize dependencies where possible
   - Document why dependencies exist
   - Consider soft vs hard dependencies
   - Plan for dependency failures

3. **Time Estimation**:
   - Use historical data if available
   - Include buffer time (20-30%)
   - Consider learning curve
   - Account for reviews and rework

4. **Risk Planning**:
   - Identify risks early
   - Have contingency plans
   - Allocate risk buffer
   - Monitor continuously

## Notes for Claude Code Agent

- **ALWAYS** begin by reading @~/Documents/ihdocs/spec-driven-development.md
- **ALWAYS** review both requirements and design before planning
- **NEVER** proceed to Phase 5 without explicit plan approval
- Break down tasks to manageable sizes (max 8 hours)
- Include testing tasks for every component
- Consider both technical and non-technical tasks
- Map dependencies completely and accurately
- Be realistic with time estimates
- Include buffer time for unknowns
- Think about parallelization opportunities
- Document the rationale for sequencing decisions
- Ensure the plan is executable by the team
