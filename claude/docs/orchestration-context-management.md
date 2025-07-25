# Context Management Strategies

Effective context management is crucial for successful task orchestration. This guide covers strategies for maintaining, transferring, and utilizing context across subtasks.

## Understanding Context Types

### 1. Static Context
Information that remains constant throughout the workflow:
- Project requirements
- Technology stack
- Coding standards
- File structure conventions

### 2. Dynamic Context
Information that evolves as subtasks complete:
- Created files and their purposes
- Implemented APIs and their signatures
- Design decisions and rationale
- Discovered constraints or issues

### 3. Transitional Context
Information specific to handoffs between subtasks:
- Current state of the codebase
- Pending decisions or questions
- Temporary workarounds that need addressing
- Integration points requiring attention

## Context Transfer Strategies

### Comprehensive Initial Briefing

Provide each subtask with a complete picture from the start:

```markdown
## Subtask: Implement User Authentication

### Project Overview
Building a task management application with React frontend and Node.js backend.

### Current State
- Project structure created (see file tree below)
- Database schema designed (users, tasks, projects tables)
- Basic Express server running on port 3000

### Your Specific Task
Implement JWT-based authentication with the following endpoints:
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh
- GET /api/auth/profile (protected)

### Constraints
- Use bcrypt for password hashing
- JWT tokens should expire in 1 hour
- Refresh tokens should expire in 7 days
- Follow existing error handling patterns (see src/middleware/errorHandler.js)

### File Structure
```

src/
├── controllers/
├── models/
│   └── User.js (already created with schema)
├── routes/
├── middleware/
│   └── errorHandler.js
└── utils/

```

### Integration Notes
- The User model is already created in src/models/User.js
- Error handling middleware expects errors in format: { status, message, data }
- Frontend will expect tokens in response body as { accessToken, refreshToken }
```

### Progressive Context Building

Build context incrementally as the project progresses:

```markdown
## Subtask 3: Implement Task CRUD Operations

### Previous Subtasks Summary

#### Subtask 1: Project Setup
- Initialized Node.js project with Express
- Set up PostgreSQL database connection
- Created basic folder structure
- Installed core dependencies

#### Subtask 2: User Authentication
- Implemented JWT authentication
- Created auth endpoints (register, login, refresh)
- Added auth middleware at src/middleware/auth.js
- Key function: `requireAuth(req, res, next)` - adds req.user

### Current Task Context
Now implement CRUD operations for tasks, building on the authentication system.

### Key Interfaces to Use
```javascript
// From auth middleware
req.user = {
  id: 123,
  email: "user@example.com",
  role: "user"
}

// Database connection available at
const db = require('../config/database');
```

```

## Context Preservation Techniques

### 1. Summary Documents

Create running summary documents that accumulate knowledge:

```markdown
# Project Status Summary

## Completed Components

### Authentication System
- Location: src/auth/
- Key files: authController.js, authRoutes.js, authMiddleware.js
- Endpoints: /api/auth/login, /api/auth/register, /api/auth/refresh
- Uses: JWT tokens with 1hr access, 7day refresh

### User Management
- Location: src/users/
- Database: users table with id, email, password_hash, created_at
- Key methods: User.create(), User.findByEmail(), User.updateProfile()

## Design Decisions

1. **Token Storage**: Decided to use httpOnly cookies for security
2. **Database**: PostgreSQL chosen for relational data needs
3. **Password Policy**: Minimum 8 chars, 1 uppercase, 1 number

## Pending Items

- [ ] Email verification system
- [ ] Password reset functionality
- [ ] Rate limiting on auth endpoints
```

### 2. Interface Documentation

Maintain clear documentation of created interfaces:

```markdown
# API Interface Documentation

## Authentication Endpoints

### POST /api/auth/register
Request:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "John Doe"
}
```

Response (201):

```json
{
  "user": {
    "id": 123,
    "email": "user@example.com",
    "name": "John Doe"
  },
  "tokens": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

### GET /api/tasks (Protected)
Headers:
- Authorization: Bearer <accessToken>

Response (200):

```json
{
  "tasks": [
    {
      "id": 1,
      "title": "Complete project",
      "status": "pending",
      "userId": 123
    }
  ],
  "pagination": {
    "page": 1,
    "totalPages": 5,
    "totalItems": 47
  }
}
```

```

### 3. Decision Log

Track important decisions and their rationale:

```markdown
# Architecture Decision Log

## ADL-001: Authentication Strategy
**Date**: 2024-01-15
**Decision**: Use JWT tokens instead of session-based auth
**Rationale**: 
- Stateless authentication scales better
- Easier to implement with mobile apps later
- Simplifies load balancing

## ADL-002: Database Choice
**Date**: 2024-01-16
**Decision**: PostgreSQL over MongoDB
**Rationale**:
- Strong relational data (users -> projects -> tasks)
- ACID compliance important for task management
- Team expertise with SQL

## ADL-003: API Versioning
**Date**: 2024-01-17
**Decision**: URL-based versioning (/api/v1/)
**Rationale**:
- Clear and explicit
- Easy to route different versions
- Simple for clients to understand
```

## Context Handoff Patterns

### The Baton Pass

Each subtask explicitly states what it's passing to the next:

```markdown
## Subtask Completion Summary

### What I Accomplished
- Set up Express server with middleware
- Configured PostgreSQL connection
- Created User model and auth endpoints
- Implemented JWT token generation and validation

### What You Need to Know
1. **Auth Middleware**: Use `requireAuth` from src/middleware/auth.js
2. **User Object**: Available as `req.user` in protected routes
3. **Database**: Connection pool available via `require('./config/db')`
4. **Error Format**: Use `ApiError` class from src/utils/ApiError.js

### Ready for Next Steps
The authentication system is complete and tested. You can now:
- Create protected endpoints using requireAuth middleware
- Access user info via req.user in any protected route
- Use the existing error handling patterns

### Example Usage
```javascript
router.get('/api/tasks', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id; // Authenticated user's ID
    // Your task logic here
  } catch (error) {
    next(error); // Error middleware will handle
  }
});
```

```

### The State Snapshot

Capture the exact state at handoff time:

```markdown
## Current System State

### Running Services
- Node.js server: http://localhost:3000
- PostgreSQL: localhost:5432/taskman_dev
- Redis (for sessions): localhost:6379

### Environment Variables Set
- NODE_ENV=development
- DATABASE_URL=postgresql://user:pass@localhost:5432/taskman_dev
- JWT_SECRET=dev_secret_change_in_prod
- REDIS_URL=redis://localhost:6379

### Database State
Tables created:
- users (5 test users seeded)
- projects (empty)
- tasks (empty)

Run `npm run db:reset` to restore this state.

### Test Coverage
- Auth endpoints: 95% coverage
- User model: 100% coverage
- Run `npm test` to verify

### Branch Status
- Working on: feature/authentication
- 12 commits ahead of main
- All tests passing
```

## Anti-Patterns to Avoid

### 1. Context Overload
Don't dump unnecessary information:

```
❌ "Here's every file in the project and what each line does..."
✅ "Here are the key files you'll need to work with..."
```

### 2. Assumption-Based Context
Don't assume knowledge:

```
❌ "Use the standard error handling..."
✅ "Use the error handling middleware at src/middleware/errorHandler.js, which expects..."
```

### 3. Stale Context
Keep context updated:

```
❌ "The API uses the /api/v1/ prefix (Note: written for subtask 1)"
✅ "The API now uses /api/v2/ prefix (changed in subtask 4 for breaking changes)"
```

### 4. Missing Integration Context
Always explain how pieces fit together:

```
❌ "Implement the payment service"
✅ "Implement the payment service that will be called by OrderController.checkout() method..."
```

## Context Validation Checklist

Before passing context to a subtask:

- [ ] Includes all necessary background information
- [ ] Specifies exact file locations and names
- [ ] Documents any interfaces or contracts to follow
- [ ] Explains integration points with existing code
- [ ] Lists constraints and requirements clearly
- [ ] Provides examples where helpful
- [ ] Avoids unnecessary details
- [ ] Uses consistent terminology
- [ ] Includes current state/status
- [ ] Mentions any pending decisions or blockers
