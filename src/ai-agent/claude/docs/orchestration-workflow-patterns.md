# Workflow Patterns

Common orchestration patterns for different types of projects and effective strategies for managing complex workflows.

## Core Workflow Patterns

### 1. Linear Sequential Workflow

Best for projects where each step depends on the previous one.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Research  │ ──> │   Design    │ ──> │ Implement   │ ──> │   Deploy    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

**Example: API Development**

```markdown
1. Research and Requirements Gathering
   - Analyze existing systems
   - Define API specifications
   - Document requirements

2. Design API Architecture  
   - Create endpoint designs
   - Define data models
   - Plan authentication

3. Implement API
   - Build endpoints
   - Implement business logic
   - Add validation

4. Deploy and Document
   - Set up hosting
   - Create API documentation
   - Configure monitoring
```

### 2. Parallel Workflow

Best when multiple independent components can be developed simultaneously.

```
                    ┌─────────────┐
               ┌──> │  Frontend   │ ──┐
               │    └─────────────┘   │
┌─────────┐    │    ┌─────────────┐   │    ┌─────────────┐
│ Planning │ ──┼──> │   Backend   │ ──┼──> │ Integration │
└─────────┘    │    └─────────────┘   │    └─────────────┘
               │    ┌─────────────┐   │
               └──> │  Database   │ ──┘
                    └─────────────┘
```

**Example: Full-Stack Application**

```markdown
1. Initial Planning
   - Define requirements
   - Create specifications
   - Set up project structure

2. Parallel Development (can run simultaneously)
   a. Frontend Development
      - Build UI components
      - Implement state management
      - Create responsive layouts
   
   b. Backend Development
      - Set up server
      - Implement API endpoints
      - Add business logic
   
   c. Database Design
      - Design schema
      - Set up migrations
      - Add seed data

3. Integration Phase
   - Connect frontend to backend
   - Integration testing
   - Bug fixes and refinements
```

### 3. Iterative Workflow

Best for projects requiring continuous refinement.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Plan v1   │ ──> │ Implement v1│ ──> │  Review v1  │
└─────────────┘     └─────────────┘     └─────────────┘
       ↑                                        │
       │            ┌─────────────┐             │
       └────────────│  Plan v2    │ <───────────┘
                    └─────────────┘
```

**Example: Machine Learning Model**

```markdown
Iteration 1:
- Implement basic model
- Train on sample data
- Evaluate performance

Iteration 2:
- Improve feature engineering
- Tune hyperparameters
- Re-evaluate

Iteration 3:
- Add ensemble methods
- Optimize for production
- Final evaluation
```

### 4. Pipeline Workflow

Best for data processing or transformation tasks.

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Extract │ ──> │Transform│ ──> │Validate │ ──> │  Load   │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
```

**Example: Data Migration**

```markdown
1. Extract Data
   - Connect to source systems
   - Export data in batches
   - Handle incremental updates

2. Transform Data
   - Map old schema to new
   - Clean and normalize
   - Apply business rules

3. Validate Data
   - Check data integrity
   - Verify transformations
   - Generate reports

4. Load Data
   - Import to target system
   - Verify completeness
   - Update indexes
```

## Advanced Patterns

### Branch and Merge Pattern

For exploring multiple solutions before choosing the best one.

```
                    ┌─────────────┐
               ┌──> │ Solution A  │ ──┐
               │    └─────────────┘   │
┌─────────┐    │    ┌─────────────┐   │    ┌─────────────┐
│ Problem │ ──┼──> │ Solution B  │ ──┼──> │  Evaluate   │ ──> Choose Best
└─────────┘    │    └─────────────┘   │    └─────────────┘
               │    ┌─────────────┐   │
               └──> │ Solution C  │ ──┘
                    └─────────────┘
```

### Checkpoint Pattern

For complex projects where you need to validate progress at key stages.

```
┌───────┐     ┌───────────┐     ┌───────┐     ┌───────────┐     ┌───────┐
│ Task1 │ ──> │Checkpoint1│ ──> │ Task2 │ ──> │Checkpoint2│ ──> │ Task3 │
└───────┘     └───────────┘     └───────┘     └───────────┘     └───────┘
                    │                              │
                    └──────────────────────────────┘
                           Validation & Rollback
```

## Orchestration Strategies

### 1. Top-Down Decomposition

Start with high-level goals and break down:

```markdown
Build E-commerce Site
├── User Experience
│   ├── Design UI/UX
│   ├── Implement Frontend
│   └── Add Accessibility
├── Business Logic
│   ├── Product Management
│   ├── Order Processing
│   └── Payment Integration
└── Infrastructure
    ├── Database Design
    ├── API Development
    └── Deployment Setup
```

### 2. Bottom-Up Assembly

Start with foundational components:

```markdown
1. Core Utilities
   - Logging system
   - Error handling
   - Configuration management

2. Basic Services
   - Database connections
   - Authentication
   - API framework

3. Business Features
   - User management
   - Product catalog
   - Order system

4. User Interface
   - Component library
   - Page layouts
   - Full application
```

### 3. Risk-First Approach

Tackle highest-risk items first:

```markdown
1. Technical Risks
   - Performance requirements
   - Third-party integrations
   - Scaling challenges

2. Business Risks
   - Core functionality
   - Regulatory compliance
   - Security requirements

3. Standard Features
   - CRUD operations
   - Basic UI
   - Documentation
```

## Workflow Optimization Techniques

### Dependency Analysis

Before starting, map all dependencies:

```yaml
tasks:
  setup_project:
    dependencies: []
    
  create_database:
    dependencies: [setup_project]
    
  implement_auth:
    dependencies: [setup_project, create_database]
    
  implement_api:
    dependencies: [implement_auth]
    
  build_frontend:
    dependencies: [setup_project]
    can_parallel_with: [implement_api]
    
  integration_testing:
    dependencies: [implement_api, build_frontend]
```

### Resource Allocation

Consider which tasks can run in parallel:

```markdown
## Parallel Execution Plan

Time Slot 1:
- Agent 1: Set up backend structure
- Agent 2: Set up frontend structure
- Agent 3: Design database schema

Time Slot 2:
- Agent 1: Implement authentication
- Agent 2: Build UI components
- Agent 3: Create API documentation

Time Slot 3:
- All agents: Integration and testing
```

### Milestone-Based Progress

Define clear milestones:

```markdown
## Project Milestones

### Milestone 1: Foundation (Day 1-3)
- [ ] Project structure created
- [ ] Development environment configured
- [ ] Basic CI/CD pipeline running
- [ ] Database schema designed

### Milestone 2: Core Features (Day 4-7)
- [ ] User authentication working
- [ ] Basic CRUD operations implemented
- [ ] Frontend connected to backend
- [ ] Core business logic complete

### Milestone 3: Polish (Day 8-10)
- [ ] Full test coverage
- [ ] Performance optimized
- [ ] Documentation complete
- [ ] Deployment ready
```

## Common Workflow Scenarios

### New Project From Scratch

```markdown
1. Environment Setup
   - Initialize repository
   - Set up development tools
   - Configure linting/formatting

2. Architecture Design
   - Plan folder structure
   - Choose technology stack
   - Design data models

3. Core Implementation
   - Build foundation
   - Implement features
   - Add tests

4. Refinement
   - Optimize performance
   - Improve UX
   - Fix bugs

5. Deployment
   - Set up hosting
   - Configure CI/CD
   - Monitor and maintain
```

### Legacy Code Refactoring

```markdown
1. Analysis Phase
   - Understand current code
   - Identify problem areas
   - Create test coverage

2. Incremental Refactoring
   - Extract modules
   - Improve structure
   - Maintain functionality

3. Modernization
   - Update dependencies
   - Implement new patterns
   - Improve performance

4. Documentation
   - Document changes
   - Update guides
   - Train team
```

### Feature Addition

```markdown
1. Requirement Analysis
   - Understand feature needs
   - Analyze impact on existing code
   - Plan integration points

2. Design Phase
   - Create technical design
   - Update data models
   - Plan API changes

3. Implementation
   - Build backend logic
   - Create frontend UI
   - Add tests

4. Integration
   - Connect to existing features
   - Update documentation
   - Deploy changes
```

## Best Practices

### 1. Clear Task Boundaries
- Each subtask should have well-defined inputs and outputs
- Avoid overlapping responsibilities
- Specify integration points clearly

### 2. Progress Tracking
- Regular status updates
- Clear completion criteria
- Measurable deliverables

### 3. Error Handling
- Plan for failures
- Include rollback strategies
- Document known issues

### 4. Communication Patterns
- Standardize status reports
- Use consistent terminology
- Maintain central documentation

### 5. Quality Gates
- Define acceptance criteria
- Include testing requirements
- Specify performance targets

## Workflow Anti-Patterns

### 1. The Big Bang
❌ Trying to do everything in one massive task
✅ Break into manageable, testable pieces

### 2. The Infinite Loop
❌ Circular dependencies between tasks
✅ Clear dependency hierarchy

### 3. The Black Box
❌ No visibility into subtask progress
✅ Regular status updates and checkpoints

### 4. The Moving Target
❌ Changing requirements mid-workflow
✅ Lock requirements before starting

### 5. The Hero Task
❌ One critical task that everything depends on
✅ Distribute critical functionality

## Workflow Templates

### Web Application Template

```
1. Project Setup → 2. Backend Core → 3. Frontend Core
                                  ↘
4. Feature Development ← 5. Integration ← 6. Testing → 7. Deployment
```

### Data Pipeline Template

```
1. Data Source Setup → 2. Extraction Logic → 3. Transformation Rules
                                          ↘
4. Validation Framework ← 5. Loading Logic ← 6. Monitoring → 7. Optimization
```

### API Development Template

```
1. Specification → 2. Schema Design → 3. Endpoint Implementation
                                   ↘
4. Authentication ← 5. Testing ← 6. Documentation → 7. Client Libraries
```
