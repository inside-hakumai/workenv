# Task Decomposition Guide

This guide provides detailed strategies for breaking down complex tasks into manageable subtasks when using the Orchestrator mode.

## Principles of Effective Decomposition

### 1. Single Responsibility Principle
Each subtask should have one clear objective. If a subtask seems to require multiple unrelated actions, it should be further decomposed.

**Good Example:**
- Subtask 1: Set up project structure and dependencies
- Subtask 2: Implement user authentication
- Subtask 3: Create database schema

**Poor Example:**
- Subtask 1: Set up project and implement all features

### 2. Dependency Management

Identify and respect dependencies between subtasks:

```
Task: Build a blog platform

Dependencies:
1. Project setup (no dependencies)
2. Database schema (depends on 1)
3. Authentication (depends on 1, 2)
4. Post CRUD operations (depends on 1, 2, 3)
5. Comment functionality (depends on 1, 2, 3, 4)
```

### 3. Granularity Guidelines

The appropriate level of granularity depends on:
- **Complexity**: More complex tasks need finer decomposition
- **Expertise Required**: Different expertise areas should be separate subtasks
- **Time Estimation**: Subtasks should be completable in a reasonable timeframe
- **Testing Requirements**: Each subtask should be independently testable

## Decomposition Patterns

### Sequential Pattern
Use when subtasks must be completed in order:

```
1. Research existing solutions
2. Design system architecture
3. Implement core functionality
4. Add enhancements
5. Write documentation
```

### Parallel Pattern
Use when subtasks can be executed simultaneously:

```
├── Frontend development
├── Backend API development
└── Database design
```

### Hierarchical Pattern
Use for complex tasks with multiple levels:

```
Build E-commerce Platform
├── User Management
│   ├── Registration
│   ├── Authentication
│   └── Profile Management
├── Product Catalog
│   ├── Product CRUD
│   ├── Categories
│   └── Search
└── Order Processing
    ├── Cart Management
    ├── Checkout
    └── Payment Integration
```

## Context Preservation

### Essential Context Elements

1. **Parent Task Context**
   - Original requirements
   - Constraints and limitations
   - Success criteria

2. **Sibling Task Results**
   - Completed work summary
   - Design decisions made
   - APIs or interfaces created

3. **Environmental Context**
   - Technology stack
   - File structure
   - Coding standards

### Context Transfer Template

```markdown
## Context for Subtask: [Name]

### Parent Task
[Brief description of the overall goal]

### Previous Subtasks Completed
1. [Subtask 1]: [Key outcomes]
2. [Subtask 2]: [Key outcomes]

### Current Subtask Requirements
- Primary objective: [What to accomplish]
- Success criteria: [How to measure completion]
- Constraints: [Any limitations]

### Technical Context
- Technology stack: [Languages, frameworks]
- Project structure: [Key directories/files]
- Standards: [Coding conventions, patterns]

### Interfaces
- APIs to use: [Existing endpoints/functions]
- APIs to create: [New endpoints/functions needed]
```

## Common Decomposition Scenarios

### Web Application Development

```
1. Project Setup
   - Initialize repository
   - Set up build tools
   - Configure development environment

2. Infrastructure
   - Database setup
   - Authentication system
   - API structure

3. Core Features
   - Feature A implementation
   - Feature B implementation
   - Feature C implementation

4. Integration
   - Connect features
   - End-to-end testing
   - Performance optimization

5. Deployment
   - Production configuration
   - CI/CD setup
   - Documentation
```

### Data Analysis Project

```
1. Data Acquisition
   - Identify data sources
   - Set up data collection
   - Initial data validation

2. Data Processing
   - Cleaning and preprocessing
   - Feature engineering
   - Exploratory analysis

3. Analysis/Modeling
   - Statistical analysis
   - Model development
   - Model validation

4. Results Communication
   - Visualization creation
   - Report writing
   - Presentation preparation
```

### Refactoring Project

```
1. Analysis Phase
   - Code audit
   - Identify problem areas
   - Plan refactoring strategy

2. Preparation Phase
   - Set up test coverage
   - Create safety nets
   - Document current behavior

3. Refactoring Phase
   - Module A refactoring
   - Module B refactoring
   - Integration updates

4. Validation Phase
   - Regression testing
   - Performance comparison
   - Documentation updates
```

## Red Flags in Task Decomposition

Watch out for these common mistakes:

1. **Too Broad**: "Implement the entire backend"
2. **Too Vague**: "Make it better"
3. **Mixed Concerns**: "Set up database and implement UI"
4. **Missing Context**: No information about dependencies
5. **Unclear Success Criteria**: No way to verify completion

## Best Practices

1. **Start High-Level**: Begin with major components, then decompose further as needed
2. **Maintain Flexibility**: Be ready to adjust decomposition based on discoveries
3. **Document Decisions**: Record why tasks were split in certain ways
4. **Consider Reusability**: Structure subtasks so their outputs can be reused
5. **Plan for Integration**: Always consider how subtasks will combine

## Checklist for Task Decomposition

Before delegating subtasks, verify:

- [ ] Each subtask has a single, clear objective
- [ ] Dependencies are identified and respected
- [ ] Context is comprehensive and relevant
- [ ] Success criteria are defined
- [ ] The scope is appropriate (not too broad or narrow)
- [ ] Integration points are considered
- [ ] The overall flow makes logical sense
