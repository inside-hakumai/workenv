---
description: "Spec-Driven Development Phase 1: Preparation Phase を実行してプロジェクト構造を初期化します"
argumen-hint: [タスクの概要もしくは概要を記載したファイルのパス]
---

Execute **Phase 1: Preparation Phase** of Spec-Driven Development (SDD) to initialize the project structure for a new task. Ultrathink.

## Prerequisites

Before executing this command, ensure you have:
1. **Read the SDD Guide**: Review @~/Documents/ihdocs/spec-driven-development.md to understand:
   - The five phases of Spec-Driven Development
   - Core principles and best practices
   - Phase transitions and approval requirements
   - File structure and naming conventions

2. **Clear Task Definition**: Have a well-defined task description or reference document

## Overview

This command initializes the Spec-Driven Development workflow by:
1. Creating the necessary directory structure
2. Generating an appropriate spec name from the task description
3. Setting up the working directory for all subsequent SDD phases
4. Creating initial placeholder files for the upcoming phases

## Arguments

`$ARGUMENTS` can be either:
- **Direct task description**: A string describing the task to be implemented
- **File path**: Path to a file containing the task description (e.g., Issue file, task document)

## Execution Steps

### Step 0: SDD Methodology Review

1. **Load SDD documentation**: Read @~/Documents/ihdocs/spec-driven-development.md
2. **Confirm understanding of**:
   - Phase 1: Preparation Phase requirements and outputs
   - Directory structure conventions (`.specdd/specs/[task-name]/`)
   - Required files for subsequent phases
   - Phase transition protocols

### Step 1: Task Analysis

1. **Parse the arguments** to determine if it's a direct description or file path
   - If it's a file path (contains `/` or ends with `.md`, `.txt`, etc.), read the file content
   - If it's a direct description, use it as-is
2. **Extract the task overview** from the provided information
3. **Identify key components** of the task for naming purposes

### Step 2: Directory Structure Creation

1. **Create base SDD directory**:
   ```bash
   mkdir -p ./.specdd/specs
   ```
   
2. **Generate spec directory name** based on the task:
   - Convert task description to kebab-case
   - Remove special characters and spaces
   - Keep it concise but descriptive
   - Examples:
     - "Create user authentication system" → `create-user-authentication`
     - "Fix payment processing bug" → `fix-payment-processing`
     - "Add dark mode feature" → `add-dark-mode-feature`

3. **Create task-specific directory**:
   ```bash
   mkdir -p ./.specdd/specs/[generated-spec-name]
   ```

### Step 3: Initialize Phase Files

Create placeholder files for all SDD phases with initial templates:

1. **Create requirements.md** with template:
   ```markdown
   # Requirements Specification
   
   ## Task Overview
   [Insert task description]
   
   ## Functional Requirements
   - [ ] TBD
   
   ## Non-Functional Requirements
   - [ ] TBD
   
   ## Constraints
   - TBD
   
   ## Success Criteria
   - TBD
   
   ## Edge Cases
   - TBD
   ```

2. **Create design.md** with template:
   ```markdown
   # Design Specification
   
   ## Architecture Overview
   TBD
   
   ## Component Structure
   TBD
   
   ## Data Models
   TBD
   
   ## Interface Definitions
   TBD
   
   ## Technology Stack
   TBD
   
   ## Design Patterns
   TBD
   ```

3. **Create implementation-plan.md** with template:
   ```markdown
   # Implementation Plan
   
   ## Task Breakdown
   1. TBD
   
   ## Dependencies
   TBD
   
   ## Implementation Order
   1. TBD
   
   ## Testing Strategy
   TBD
   
   ## Verification Steps
   TBD
   ```

4. **Create metadata.json** with project information:
   ```json
   {
     "task_name": "[task description]",
     "spec_name": "[generated-spec-name]",
     "created_at": "[timestamp]",
     "current_phase": "preparation",
     "phase_status": {
       "preparation": "completed",
       "requirements": "pending",
       "design": "pending",
       "implementation_plan": "pending",
       "implementation": "pending"
     }
   }
   ```

### Step 4: Confirmation and Next Steps

1. **Display created structure** to the user:
   - Show the directory tree of created files
   - Display the spec name and location

2. **Provide phase status**:
   - Confirm Phase 1 completion
   - Indicate readiness for Phase 2 (Requirements)

3. **Suggest next command**:
   - Recommend proceeding with requirements gathering
   - Provide the path to the requirements template

## Output Format

After successful execution, display:

```
✅ SDD Phase 1: Preparation Phase completed successfully!

📁 Created structure:
.specdd/specs/[spec-name]/
├── requirements.md (template created)
├── design.md (template created)
├── implementation-plan.md (template created)
└── metadata.json (project metadata)

📝 Task: [task description]
🏷️ Spec Name: [spec-name]
📍 Location: ./.specdd/specs/[spec-name]/

Next Step:
→ Proceed to Phase 2: Requirements Phase
→ Edit: ./.specdd/specs/[spec-name]/requirements.md
```

## Error Handling

Handle these potential issues:

1. **Directory already exists**:
   - Ask user if they want to:
     - Use existing directory
     - Create with different name
     - Override existing files

2. **Invalid task description**:
   - Request clarification if task is unclear
   - Suggest improvements to task description

3. **File read errors**:
   - Check if file path exists
   - Verify file permissions
   - Provide helpful error messages

## Best Practices

1. **Naming Conventions**:
   - Use lowercase kebab-case for directory names
   - Keep names under 50 characters
   - Make names descriptive but concise

2. **Task Description**:
   - Ensure task description is clear and actionable
   - Include context if available
   - Reference related issues or documents

3. **Directory Organization**:
   - Keep all SDD specs in `.specdd/specs/`
   - One directory per task/feature
   - Maintain consistent structure across projects

## Example Usage

```bash
# Direct task description
/sdd-prepare "Create user authentication system with OAuth2 support"

# File path reference
/sdd-prepare ./issues/issue-123.md

# GitHub issue reference
/sdd-prepare "#123: Add payment processing feature"
```

## Notes for Claude Code Agent

- **ALWAYS** begin by reading @~/Documents/ihdocs/spec-driven-development.md to understand the complete SDD workflow
- Always verify the `.specdd` directory doesn't conflict with existing project structures
- Ensure generated spec names are unique within the project
- Maintain the metadata.json file for tracking phase progress
- Use this preparation phase as foundation for all subsequent SDD phases
- Consider the project's existing conventions when generating names