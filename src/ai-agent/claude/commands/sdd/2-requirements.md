---
description: "Spec-Driven Development Phase 2: Requirements Phase を実行して要件定義を作成します"
argumen-hint: [Phase 1で作成したspecディレクトリのパス]
---

Execute **Phase 2: Requirements Phase** of Spec-Driven Development (SDD) to define and validate what needs to be built based on the task initialized in Phase 1. Ultrathink.

## Prerequisites

Before executing this command, ensure:

1. **SDD Guide Understanding**: Review @~/Documents/ihdocs/spec-driven-development.md for:
   - Phase 2: Requirements Phase objectives and deliverables
   - Requirements document structure and elements
   - Validation and iteration process
   - Phase transition requirements

2. **Phase 1 Completion**: Verify that Phase 1 has been completed:
   - Spec directory exists at provided path
   - Template files have been created
   - `metadata.json` exists and shows Phase 1 as completed

3. **Task Context**: Have access to:
   - Original task description or reference
   - Any related documentation or issues
   - Technical constraints or dependencies

## Arguments

`$ARGUMENTS` should be:
- **Spec directory path**: Path to the spec directory created in Phase 1 (e.g., `./.specdd/specs/[task-name]`)

## Execution Steps

### Step 0: SDD Methodology and Context Review

1. **Load SDD documentation**: Read @~/Documents/ihdocs/spec-driven-development.md
2. **Focus on Phase 2 requirements**:
   - Purpose: Define and validate what needs to be built
   - Key elements of requirements file
   - Iteration and approval process
3. **Verify Phase 1 completion** by checking `metadata.json`

### Step 1: Initialize Requirements Phase

1. **Validate spec directory path**:

   ```bash
   # Check if directory exists
   if [ ! -d "$SPEC_DIR" ]; then
     echo "Error: Spec directory not found"
     exit 1
   fi
   ```

2. **Load project metadata**:
   - Read `$SPEC_DIR/metadata.json`
   - Verify Phase 1 status is "completed"
   - Update current_phase to "requirements"

3. **Load task context**:
   - Review task_name from metadata
   - Read any existing notes or documentation
   - Gather related information from the codebase

### Step 2: Analyze Task and Context

1. **Task Decomposition**:
   - Break down the task into components
   - Identify core functionalities
   - Determine scope boundaries

2. **Context Analysis**:
   - Search for related code in the project
   - Identify existing patterns and conventions
   - Check for similar implementations

3. **Stakeholder Considerations**:
   - Consider end-user needs
   - Identify technical stakeholders
   - Document assumptions

### Step 3: Create Requirements Document

Update `$SPEC_DIR/requirements.md` with comprehensive requirements:

```markdown
# Requirements Specification

## Task Overview
[Detailed description of the task, expanding on initial overview]

## Functional Requirements

### Core Features
- FR-001: [Primary feature requirement]
  - Description: [Detailed description]
  - Acceptance Criteria: [Measurable criteria]
  - Priority: High/Medium/Low

- FR-002: [Secondary feature requirement]
  - Description: [Detailed description]
  - Acceptance Criteria: [Measurable criteria]
  - Priority: High/Medium/Low

### User Interactions
- UI-001: [User interface requirement]
  - Description: [How users interact with the feature]
  - Expected Behavior: [What happens when users interact]

## Non-Functional Requirements

### Performance
- NFR-P001: [Response time requirement]
  - Target: [e.g., < 200ms for API calls]
  - Measurement: [How to measure]

### Security
- NFR-S001: [Security requirement]
  - Requirement: [e.g., Authentication required]
  - Implementation: [High-level approach]

### Compatibility
- NFR-C001: [Compatibility requirement]
  - Supported Environments: [List of environments]
  - Browser/Platform Support: [Specific versions]

## Constraints and Limitations

### Technical Constraints
- TC-001: [Technology limitation]
  - Constraint: [Description]
  - Impact: [How it affects implementation]

### Business Constraints
- BC-001: [Business rule or limitation]
  - Rule: [Description]
  - Rationale: [Why this constraint exists]

## Success Criteria

### Acceptance Tests
- AC-001: [Test scenario 1]
  - Given: [Initial state]
  - When: [Action taken]
  - Then: [Expected result]

- AC-002: [Test scenario 2]
  - Given: [Initial state]
  - When: [Action taken]
  - Then: [Expected result]

### Definition of Done
- [ ] All functional requirements implemented
- [ ] All acceptance tests passing
- [ ] Code review completed
- [ ] Documentation updated
- [ ] No critical bugs

## Edge Cases and Error Handling

### Edge Cases
- EC-001: [Edge case scenario]
  - Scenario: [Description]
  - Expected Behavior: [How system should handle]

### Error Scenarios
- ERR-001: [Error condition]
  - Trigger: [What causes the error]
  - Response: [How system should respond]
  - User Feedback: [What user sees]

## Dependencies

### External Dependencies
- EXT-001: [External system/library]
  - Name: [Dependency name]
  - Version: [Required version]
  - Purpose: [Why it's needed]

### Internal Dependencies
- INT-001: [Internal module/component]
  - Component: [Name]
  - Required Functionality: [What's needed]

## Assumptions
- ASM-001: [Assumption about the system/environment]
- ASM-002: [Assumption about user behavior]

## Out of Scope
- OOS-001: [Explicitly not included in this task]
- OOS-002: [Future enhancement, not current requirement]

## Open Questions
- [ ] Question 1: [Needs clarification]
- [ ] Question 2: [Requires decision]
```

### Step 4: Initial Validation

1. **Self-review requirements**:
   - Check completeness of all sections
   - Verify requirements are SMART (Specific, Measurable, Achievable, Relevant, Time-bound)
   - Ensure no contradictions
   - Validate testability of requirements

2. **Cross-reference with task**:
   - Confirm all aspects of original task are covered
   - Check nothing is over-specified
   - Verify scope alignment

### Step 5: Present to User for Review

1. **Format presentation**:

   ```
   📋 Requirements Specification Ready for Review
   
   Task: [task name]
   Location: [spec directory path]
   
   Summary:
   - [X] Functional Requirements defined
   - [X] Non-functional Requirements specified
   - [X] Success Criteria established
   - [X] Edge Cases identified
   
   Key Points:
   1. [Major requirement 1]
   2. [Major requirement 2]
   3. [Major constraint or consideration]
   
   ⚠️ Open Questions:
   - [Any questions needing user input]
   
   Please review the requirements at: [path]/requirements.md
   ```

2. **Request explicit feedback**:
   - "Are the functional requirements complete and accurate?"
   - "Do the success criteria align with your expectations?"
   - "Are there any missing requirements or constraints?"
   - "Do you approve these requirements, or would you like changes?"

### Step 6: Iteration Based on Feedback

**Repeat until approved:**

1. **Receive user feedback**
2. **Categorize feedback**:
   - Additions: New requirements to add
   - Modifications: Existing requirements to change
   - Deletions: Requirements to remove
   - Clarifications: Ambiguities to resolve

3. **Update requirements document**:
   - Make requested changes
   - Document change rationale
   - Mark resolved questions

4. **Present updated version**:
   - Highlight changes made
   - Confirm understanding
   - Request re-review

### Step 7: Finalize Requirements

Upon user approval:

1. **Update metadata.json**:

   ```json
   {
     "phase_status": {
       "requirements": "completed"
     },
     "requirements_approved_at": "[timestamp]",
     "requirements_version": "1.0"
   }
   ```

2. **Create requirements summary**:
   - Document key decisions
   - Note any deferred items
   - Record approval confirmation

3. **Prepare for next phase**:

   ```
   ✅ Phase 2: Requirements Phase completed!
   
   📄 Requirements document approved
   📊 Statistics:
   - Functional Requirements: [count]
   - Non-functional Requirements: [count]
   - Success Criteria: [count]
   - Edge Cases: [count]
   
   Next Step:
   → Proceed to Phase 3: Design Phase
   → Command: /sdd-design [spec-directory]
   ```

## Validation Rules

### Requirements Quality Checks

1. **Completeness**:
   - All sections have content
   - No TBD items remain (unless explicitly accepted)
   - All questions answered

2. **Clarity**:
   - Requirements use clear, unambiguous language
   - Technical terms are defined
   - Acceptance criteria are measurable

3. **Consistency**:
   - No contradicting requirements
   - Naming conventions are uniform
   - Priorities align with task importance

4. **Feasibility**:
   - Requirements are technically achievable
   - Time/resource constraints considered
   - Dependencies are available

## Error Handling

### Common Issues and Resolutions

1. **Missing Phase 1**:
   - Error: "Spec directory not found or Phase 1 incomplete"
   - Resolution: Run `/sdd-prepare` first

2. **Unclear Requirements**:
   - Issue: User feedback indicates confusion
   - Resolution: Add examples, diagrams, or more detail

3. **Scope Creep**:
   - Issue: Requirements growing beyond original task
   - Resolution: Document out-of-scope items for future phases

4. **Conflicting Requirements**:
   - Issue: Two requirements contradict each other
   - Resolution: Seek user clarification on priority

## Best Practices

1. **Requirements Writing**:
   - Use active voice ("The system shall...")
   - Be specific about quantities and thresholds
   - Include rationale for non-obvious requirements

2. **User Interaction**:
   - Present information progressively (summary → details)
   - Ask specific questions for clarification
   - Confirm understanding before proceeding

3. **Documentation**:
   - Keep requirements traceable to original task
   - Version significant changes
   - Document decision rationale

4. **Iteration**:
   - Expect 2-3 iteration cycles
   - Focus on high-priority items first
   - Defer nice-to-have features if needed

## Notes for Claude Code Agent

- **ALWAYS** begin by reading @~/Documents/ihdocs/spec-driven-development.md
- **NEVER** proceed to Phase 3 without explicit user approval
- Maintain professional, structured documentation
- Be thorough but avoid over-engineering requirements
- Focus on what, not how (save "how" for design phase)
- Keep requirements testable and measurable
- Document all assumptions explicitly
- Use the existing codebase patterns as reference
- Prioritize user needs and business value
