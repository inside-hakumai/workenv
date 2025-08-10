# Spec-Driven Development (SDD) Guide for Claude Code Agents

## Overview

Spec-Driven Development (SDD) is a structured software development methodology where **specifications drive the entire engineering process**. Unlike traditional implementation-first approaches, SDD emphasizes creating clear, comprehensive specifications before writing any code. This methodology ensures consistency, maintainability, and alignment throughout the development lifecycle.

### Core Principles

1. **Specification-First Approach**: All implementation decisions are based on well-defined specifications
2. **Progressive Refinement**: Each phase builds upon and refines the previous phase
3. **Traceability**: Clear linkage from requirements through design to implementation
4. **Living Documentation**: Specifications remain synchronized with the evolving codebase
5. **Single Source of Truth**: The specification serves as the authoritative reference for all development activities

## Development Phases

Spec-Driven Development consists of **five distinct phases** that must be executed sequentially:

### Phase 1: Preparation Phase (事前準備フェーズ)

**Purpose**: Initialize the project structure and establish the working environment.

**Actions**:
1. Receive task overview from the user
2. Create directory structure: `mkdir -p ./.specdd/specs`
3. Generate appropriate spec name based on task
   - Example: For "create article component" → `./specdd/specs/create-article-component`
4. Create task-specific directory within `./specdd/specs/`
5. All subsequent phase artifacts will be stored in this directory

**Output**: Initialized project structure with dedicated spec directory

### Phase 2: Requirements Phase (要件フェーズ)

**Purpose**: Define and validate what needs to be built.

**Actions**:
1. Analyze the task overview provided by the user
2. Create a "Requirements File" (`requirements.md`) containing:
   - Functional requirements
   - Non-functional requirements
   - Constraints and limitations
   - Success criteria
   - Edge cases and error handling requirements
3. Present requirements to user for validation
4. Iterate based on user feedback until approved

**Key Elements of Requirements File**:
- **User Stories**: What the user wants to achieve
- **Acceptance Criteria**: Measurable conditions for success
- **Dependencies**: External systems or components required
- **Performance Requirements**: Response times, throughput, etc.
- **Security Requirements**: Authentication, authorization, data protection

**Output**: Approved requirements document

### Phase 3: Design Phase (設計フェーズ)

**Purpose**: Create the technical architecture and design that satisfies the requirements.

**Actions**:
1. Based on approved requirements, create a "Design File" (`design.md`)
2. Include architectural decisions and patterns
3. Define component structure and interfaces
4. Specify data models and schemas
5. Document API contracts if applicable
6. Present design to user for validation
7. Iterate based on feedback until approved

**Key Elements of Design File**:
- **Architecture Overview**: High-level system structure
- **Component Diagrams**: Visual or textual representation of components
- **Data Flow**: How information moves through the system
- **Interface Definitions**: APIs, method signatures, contracts
- **Technology Stack**: Frameworks, libraries, tools to be used
- **Design Patterns**: Specific patterns to be implemented

**Output**: Approved design document

### Phase 4: Implementation Planning Phase (実装計画フェーズ)

**Purpose**: Create a detailed, executable plan for implementing the design.

**Actions**:
1. Based on approved design, create an "Implementation Plan File" (`implementation-plan.md`)
2. Break down implementation into ordered tasks
3. Identify task dependencies
4. Define testing strategy for each component
5. Establish implementation sequence
6. Present plan to user for validation
7. Iterate based on feedback until approved

**Key Elements of Implementation Plan**:
- **Task Breakdown**: Granular, actionable tasks
- **Dependencies Matrix**: Task interdependencies
- **Implementation Order**: Sequence of tasks based on dependencies
- **Testing Strategy**: Unit tests, integration tests, acceptance tests
- **Rollback Plan**: How to handle implementation failures
- **Verification Steps**: How to confirm each task is complete

**Output**: Approved implementation plan with ordered task list

### Phase 5: Implementation Phase (実装フェーズ)

**Purpose**: Execute the implementation according to the established specifications.

**Actions**:
1. Follow the implementation plan strictly
2. Implement each task in the specified order
3. Ensure adherence to requirements and design specifications
4. Write tests as specified in the plan
5. Validate each component against acceptance criteria
6. Update specifications if changes are necessary (with user approval)
7. Maintain traceability between code and specifications

**Key Principles During Implementation**:
- **No Deviation Without Approval**: Changes to specs require user consent
- **Test-First When Applicable**: Write tests before implementation where specified
- **Continuous Validation**: Check implementation against specs regularly
- **Documentation Updates**: Keep specs synchronized with code changes

**Output**: Fully implemented solution matching specifications

## Implementation Guidelines for Claude Code Agents

### File Structure

All SDD artifacts should be organized as follows:

```
.specdd/
└── specs/
    └── [task-name]/
        ├── requirements.md
        ├── design.md
        ├── implementation-plan.md
        └── implementation-log.md (optional)
```

### Phase Transitions

**IMPORTANT**: Never proceed to the next phase without explicit user approval of the current phase's deliverables.

### Communication Protocol

1. **Always present phase outputs clearly** with section headers
2. **Ask for explicit confirmation** before proceeding
3. **Document all changes** made based on feedback
4. **Maintain version history** if significant changes occur

### Quality Checks

At each phase, verify:
- **Completeness**: All necessary information is included
- **Consistency**: No contradictions within or between documents
- **Clarity**: Specifications are unambiguous and testable
- **Feasibility**: Proposed solutions are technically achievable

### Error Handling

If issues arise during any phase:
1. **Stop immediately** and inform the user
2. **Identify the root cause** of the issue
3. **Propose solutions** with trade-offs
4. **Update relevant specifications** once resolution is agreed

## Benefits of SDD

1. **Reduced Rework**: Clear specifications minimize implementation errors
2. **Better Collaboration**: Shared understanding through documented specs
3. **Maintainability**: Living documentation aids future development
4. **Quality Assurance**: Specifications provide clear testing criteria
5. **Project Visibility**: Progress can be tracked against defined milestones

## Best Practices

1. **Start Small**: Begin with simple tasks to establish the workflow
2. **Iterate Frequently**: Regular feedback loops improve outcomes
3. **Keep Specs Current**: Update documentation as implementation evolves
4. **Version Control**: Track all specification changes
5. **Review Regularly**: Periodically validate specs against implementation

## Common Pitfalls to Avoid

1. **Skipping Phases**: Each phase provides critical foundation for the next
2. **Vague Requirements**: Ambiguous specs lead to implementation issues
3. **Over-Engineering**: Design should match requirement complexity
4. **Ignoring Feedback**: User input is crucial for success
5. **Rigid Adherence**: Some flexibility may be needed during implementation

## Conclusion

Spec-Driven Development transforms software development from ad-hoc "vibe coding" into a structured, predictable process. By following these five phases systematically, Claude Code agents can deliver high-quality, well-documented solutions that precisely meet user requirements.