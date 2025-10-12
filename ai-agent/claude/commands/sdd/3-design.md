---
description: "Spec-Driven Development Phase 3: Design Phase を実行して技術設計を作成します"
argumen-hint: [Phase 1で作成したspecディレクトリのパス]
---

Execute **Phase 3: Design Phase** of Spec-Driven Development (SDD) to create the technical architecture and design that satisfies the requirements defined in Phase 2. Ultrathink.

## Prerequisites

Before executing this command, ensure:

1. **SDD Guide Understanding**: Review @~/Documents/ihdocs/spec-driven-development.md for:
   - Phase 3: Design Phase objectives and deliverables
   - Design document structure and key elements
   - Architecture patterns and best practices
   - Phase transition requirements

2. **Phase 2 Completion**: Verify that Phase 2 has been completed:
   - Requirements document has been approved
   - `metadata.json` shows Phase 2 as completed
   - All functional and non-functional requirements are clear

3. **Technical Context**: Have understanding of:
   - Project's existing architecture
   - Available technology stack
   - Team's technical capabilities
   - Performance and scalability requirements

## Arguments

`$ARGUMENTS` should be:
- **Spec directory path**: Path to the spec directory created in Phase 1 (e.g., `./.specdd/specs/[task-name]`)

## Execution Steps

### Step 0: SDD Methodology and Requirements Review

1. **Load SDD documentation**: Read @~/Documents/ihdocs/spec-driven-development.md
2. **Focus on Phase 3 objectives**:
   - Purpose: Create technical architecture and design
   - Key elements of design file
   - Design patterns and architectural decisions
3. **Verify Phase 2 completion**:
   - Check `metadata.json` for requirements phase status
   - Load and review approved requirements document

### Step 1: Initialize Design Phase

1. **Validate spec directory**:

   ```bash
   # Check directory and requirements file
   if [ ! -f "$SPEC_DIR/requirements.md" ]; then
     echo "Error: Requirements not found"
     exit 1
   fi
   ```

2. **Load project context**:
   - Read `$SPEC_DIR/metadata.json`
   - Update current_phase to "design"
   - Load approved requirements from `requirements.md`

3. **Analyze existing codebase**:
   - Identify current architecture patterns
   - Review similar implementations
   - Check technology constraints

### Step 2: Requirements Analysis for Design

1. **Categorize requirements**:
   - Group functional requirements by component
   - Identify cross-cutting concerns
   - Map non-functional requirements to design decisions

2. **Identify design drivers**:
   - Performance requirements → Architecture style
   - Security requirements → Security patterns
   - Scalability needs → Distribution strategy
   - Maintainability → Modular design

3. **Technology evaluation**:
   - List available technologies
   - Assess fit for requirements
   - Consider team expertise

### Step 3: Create Architecture Design

Develop high-level architecture addressing all requirements:

1. **Architecture Style Selection**:
   - Monolithic vs Microservices
   - Layered vs Event-driven
   - RESTful vs GraphQL
   - Synchronous vs Asynchronous

2. **Component Identification**:
   - Define major components/modules
   - Establish component responsibilities
   - Define component boundaries

3. **Integration Patterns**:
   - Communication protocols
   - Data flow patterns
   - Error handling strategies

### Step 4: Create Detailed Design Document

Update `$SPEC_DIR/design.md` with comprehensive design:

```markdown
# Design Specification

## Executive Summary
[Brief overview of the design approach and key decisions]

## Architecture Overview

### Architecture Style
- **Selected Pattern**: [e.g., Layered Architecture, Microservices]
- **Justification**: [Why this pattern fits the requirements]
- **Trade-offs**: [Pros and cons considered]

### System Context
```ascii
[ASCII diagram showing system boundaries and external interactions]
┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   System    │
└─────────────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │  Database   │
                    └─────────────┘
```

### High-Level Architecture

```
[Layer/Component diagram]
┌─────────────────────────────────┐
│     Presentation Layer          │
├─────────────────────────────────┤
│     Business Logic Layer        │
├─────────────────────────────────┤
│     Data Access Layer           │
├─────────────────────────────────┤
│     Database                    │
└─────────────────────────────────┘
```

## Component Design

### Component: [Component Name]
**Purpose**: [What this component does]
**Responsibilities**:
- [Responsibility 1]
- [Responsibility 2]

**Interfaces**:

```typescript
interface ComponentInterface {
  methodName(param: Type): ReturnType;
}
```

**Dependencies**:

### Component Interaction

```
[Sequence or flow diagram showing component interactions]
Component A ──req──▶ Component B
            ◀──res──
```

## Data Models

### Entity: [Entity Name]

```typescript
type EntityName = {
  id: string;
  field1: Type1;
  field2: Type2;
  // ...
}
```

**Constraints**:
- field1: Required, unique
- field2: Optional, max length 255

### Database Schema

```sql
CREATE TABLE entity_name (
  id UUID PRIMARY KEY,
  field1 VARCHAR(255) NOT NULL UNIQUE,
  field2 TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Data Flow

```
[Data flow diagram]
Input → Validation → Processing → Storage → Output
```

## Interface Definitions

### API Endpoints

#### Endpoint: [GET/POST/PUT/DELETE] /api/resource
**Purpose**: [What this endpoint does]
**Request**:

```json
{
  "field1": "value1",
  "field2": "value2"
}
```

**Response**:

```json
{
  "status": "success",
  "data": {
    "id": "123",
    "field1": "value1"
  }
}
```

**Error Responses**:
- 400: Bad Request - Invalid input
- 401: Unauthorized - Authentication required
- 404: Not Found - Resource doesn't exist
- 500: Internal Server Error

### Internal Interfaces

#### Service: [Service Name]

```typescript
class ServiceName {
  async processData(input: InputType): Promise<OutputType>;
  async validateInput(data: any): Promise<ValidationResult>;
}
```

## Technology Stack

### Core Technologies
- **Language**: [e.g., TypeScript, Python]
- **Framework**: [e.g., Express, Django]
- **Database**: [e.g., PostgreSQL, MongoDB]
- **Cache**: [e.g., Redis, Memcached]

### Libraries and Tools
- **Authentication**: [e.g., JWT, OAuth2]
- **Validation**: [e.g., Joi, Yup]
- **Testing**: [e.g., Jest, Pytest]
- **Documentation**: [e.g., Swagger, TypeDoc]

### Development Tools
- **Build Tool**: [e.g., Webpack, Vite]
- **Linter**: [e.g., ESLint, Pylint]
- **Formatter**: [e.g., Prettier, Black]

## Design Patterns

### Pattern: [Pattern Name]
**Purpose**: [Why this pattern is used]
**Implementation**:

```typescript
// Example implementation
class ConcreteImplementation implements Pattern {
  // ...
}
```

**Usage Context**: [Where/when to use this pattern]

### Cross-Cutting Concerns

#### Logging
- **Strategy**: [Centralized/Distributed]
- **Format**: [JSON/Plain text]
- **Levels**: DEBUG, INFO, WARN, ERROR

#### Error Handling
- **Strategy**: [Global error handler/Try-catch blocks]
- **Error Types**: [Business errors, System errors]
- **User Feedback**: [How errors are presented]

#### Security
- **Authentication**: [Method and implementation]
- **Authorization**: [Role-based/Attribute-based]
- **Data Protection**: [Encryption, Sanitization]

## Performance Considerations

### Optimization Strategies
- **Caching**: [What, where, and when to cache]
- **Database Optimization**: [Indexing, query optimization]
- **Async Processing**: [Background jobs, queues]

### Scalability Plan
- **Horizontal Scaling**: [How components scale out]
- **Vertical Scaling**: [Resource requirements]
- **Bottlenecks**: [Identified bottlenecks and mitigation]

## Deployment Architecture

### Environment Setup
- **Development**: [Local setup requirements]
- **Staging**: [Testing environment]
- **Production**: [Production configuration]

### Infrastructure

```
[Deployment diagram]
┌────────┐    ┌────────┐    ┌────────┐
│  CDN   │───▶│  LB    │───▶│  App   │
└────────┘    └────────┘    └────────┘
                                 │
                           ┌─────▼─────┐
                           │    DB     │
                           └───────────┘
```

## Migration Strategy
[If replacing or updating existing system]
- **Phase 1**: [Initial migration steps]
- **Phase 2**: [Data migration]
- **Rollback Plan**: [How to revert if needed]

## Risks and Mitigations

### Technical Risks
- **Risk 1**: [Description]
  - **Mitigation**: [How to address]
- **Risk 2**: [Description]
  - **Mitigation**: [How to address]

## Design Decisions Log

### Decision 1: [Decision Title]
- **Options Considered**: [Option A, Option B]
- **Decision**: [Selected option]
- **Rationale**: [Why this was chosen]
- **Trade-offs**: [What was sacrificed]

## Appendix

### Glossary
- **Term 1**: Definition
- **Term 2**: Definition

### References

```

### Step 5: Design Validation

1. **Requirements Coverage Check**:
   - Map each requirement to design element
   - Ensure all requirements are addressed
   - Document any compromises

2. **Design Review Checklist**:
   - [ ] All functional requirements covered
   - [ ] Non-functional requirements addressed
   - [ ] Interfaces clearly defined
   - [ ] Data models complete
   - [ ] Security considerations included
   - [ ] Performance optimizations planned
   - [ ] Deployment strategy defined

3. **Technical Feasibility**:
   - Verify technology choices are viable
   - Check resource requirements
   - Validate timeline estimates

### Step 6: Present to User for Review

1. **Format presentation**:
   ```

   🎨 Design Specification Ready for Review

   Task: [task name]
   Location: [spec directory path]

   Key Design Decisions:
   ✓ Architecture: [Selected pattern]
   ✓ Technology Stack: [Core technologies]
   ✓ Components: [Number of components]
   ✓ APIs: [Number of endpoints]

   Design Highlights:
   1. [Major design decision 1]
   2. [Major design decision 2]
   3. [Key pattern or approach]

   Trade-offs Considered:
   • [Trade-off 1]
   • [Trade-off 2]

   Please review the design at: [path]/design.md

   ```

2. **Request specific feedback**:
   - "Does the architecture align with your expectations?"
   - "Are the technology choices appropriate?"
   - "Do you have concerns about any design decisions?"
   - "Is the complexity level acceptable?"

### Step 7: Iteration Based on Feedback

**Repeat until approved:**

1. **Categorize feedback**:
   - Architecture changes
   - Component modifications
   - Interface adjustments
   - Technology substitutions

2. **Impact analysis**:
   - Assess change implications
   - Update affected sections
   - Maintain consistency

3. **Update design document**:
   - Implement requested changes
   - Update decision log
   - Revise diagrams if needed

4. **Present changes**:
   - Highlight modifications
   - Explain rationale
   - Request re-review

### Step 8: Finalize Design

Upon user approval:

1. **Update metadata.json**:
   ```json
   {
     "phase_status": {
       "design": "completed"
     },
     "design_approved_at": "[timestamp]",
     "design_version": "1.0",
     "architecture_type": "[selected pattern]",
     "technology_stack": ["tech1", "tech2"]
   }
   ```

2. **Create design summary**:
   - Key architectural decisions
   - Technology selections
   - Major design patterns

3. **Prepare for implementation planning**:

   ```
   ✅ Phase 3: Design Phase completed!
   
   🏗️ Design approved and documented
   📊 Design Statistics:
   - Components: [count]
   - API Endpoints: [count]
   - Data Models: [count]
   - Design Patterns: [count]
   
   Key Technologies:
   • [Technology 1]
   • [Technology 2]
   • [Technology 3]
   
   Next Step:
   → Proceed to Phase 4: Implementation Planning
   → Command: /sdd-implementation-plan [spec-directory]
   ```

## Design Quality Criteria

### Evaluation Metrics

1. **Completeness**:
   - All requirements have design elements
   - Interfaces fully specified
   - Error cases considered

2. **Coherence**:
   - Components have single responsibility
   - Clear separation of concerns
   - Consistent patterns throughout

3. **Feasibility**:
   - Technology choices are proven
   - Performance targets achievable
   - Team can implement design

4. **Maintainability**:
   - Modular structure
   - Clear documentation
   - Standard patterns used

## Error Handling

### Common Issues

1. **Requirements Gaps**:
   - Issue: Design reveals missing requirements
   - Resolution: Document and get clarification

2. **Technology Conflicts**:
   - Issue: Chosen technologies incompatible
   - Resolution: Find alternatives or adjust design

3. **Over-Engineering**:
   - Issue: Design too complex for requirements
   - Resolution: Simplify and focus on essentials

4. **Performance Concerns**:
   - Issue: Design may not meet performance needs
   - Resolution: Add optimization strategies

## Best Practices

1. **Design Principles**:
   - SOLID principles for OOP designs
   - DRY (Don't Repeat Yourself)
   - KISS (Keep It Simple, Stupid)
   - YAGNI (You Aren't Gonna Need It)

2. **Documentation**:
   - Use diagrams for complex relationships
   - Provide code examples for interfaces
   - Document all assumptions

3. **Review Process**:
   - Present incrementally if complex
   - Focus on critical decisions first
   - Be prepared to explain trade-offs

4. **Technology Selection**:
   - Prefer proven technologies
   - Consider team expertise
   - Evaluate long-term support

## Notes for Claude Code Agent

- **ALWAYS** begin by reading @~/Documents/ihdocs/spec-driven-development.md
- **ALWAYS** review the approved requirements before designing
- **NEVER** proceed to Phase 4 without explicit design approval
- Focus on solving the requirements, not showing off complexity
- Use existing project patterns where applicable
- Consider both immediate and future needs
- Document why decisions were made, not just what
- Be prepared to defend design choices with rationale
- Keep the design as simple as possible while meeting requirements
- Ensure the design is testable and maintainable
