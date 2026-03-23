---
name: agent-memory-systems
description: "Memory is the cornerstone of intelligent agents. Without it, every interaction starts from zero. This skill covers agent memory architecture: short-term (context window), long-term (persistent storage), and cognitive architectures that organize them. Key insight: Memory isn't just storage — it's retrieval. Use when building agent memory, designing persistent state, or implementing context management."
source: vibeship-spawner-skills (Apache 2.0)
---

# Agent Memory Systems

You are a cognitive architect who understands that memory makes agents intelligent. Memory failures look like intelligence failures — when an agent "forgets" or gives inconsistent answers, it's almost always a retrieval problem, not a storage problem.

## Memory Type Architecture

### Short-Term Memory (Context Window)
- **What**: Active conversation, current task state
- **Scope**: Single conversation session
- **For BasketBuddy agents**: Current feature being built, files already read, decisions made this session
- **Implementation**: Already handled by Claude's context window

### Working Memory (Session State)
- **What**: Task-specific context that must persist across tool calls
- **Scope**: Current work session
- **For BasketBuddy agents**: Current TypeScript errors being fixed, implementation plan for current feature
- **Implementation**: Session memory files (`/memories/session/`)

### Long-Term Memory (Persistent)
- **What**: Project facts, conventions, patterns that never change
- **Scope**: Entire project lifetime  
- **For BasketBuddy agents**: App architecture, established patterns, tech stack facts
- **Implementation**: Repo memory files (`/memories/repo/`)

### Episodic Memory (History)
- **What**: Past interactions, what worked/failed
- **Scope**: Across conversations
- **For BasketBuddy agents**: Previous bugs encountered, successful patterns used
- **Implementation**: User memory files (`/memories/`)

## Patterns

### Memory Type Selection

```
Information to store?
├── Temporary (this task only) → Session memory or working state
├── Project convention → Repo memory (/memories/repo/)
├── User preference → User memory (/memories/)
└── Disposable → Don't store
```

### Retrieval Before Action

Before starting any complex task, retrieve relevant memory:
1. Check session memory for in-progress notes
2. Check repo memory for project conventions
3. Check user memory for preferences

### Memory Formation Rules

**Store when:**
- A non-obvious pattern is discovered
- A recurring mistake source is identified
- A project convention is confirmed
- A "gotcha" will waste time if encountered again

**Don't store:**
- Information already in CLAUDE.md or agent files
- Temporary working notes that won't be useful again
- Information that will quickly become stale

### Anti-Patterns

**❌ Store Everything Forever**
Memory becomes noise. Only store information that has clear future retrieval value.

**❌ Single Memory Type for All Data**
Project conventions → repo memory. Session tasks → session memory. Don't mix.

**❌ Never Retrieve Before Acting**
Always check relevant memory before starting a new task to avoid repeating work.

## BasketBuddy-Specific Memory Strategy

### What to Remember (Repo Memory)
- Firestore collection names and their fields
- Established TypeScript type names
- Helper function names in `src/utils/helpers.ts`
- Recurring patterns that aren't in agent files
- Build commands: `npm run dev`, `npx tsc --noEmit`

### What to Remember (Session Memory)
- Current feature being implemented
- TypeScript errors encountered and their fixes
- Which files have been edited in this session
- Implementation decisions made

### Session Memory Template
```markdown
# Current Session: [Feature Name]
Date: [today]

## Goal
[What we're building]

## Progress
- [x] Step 1 done
- [ ] Step 2 in progress
- [ ] Step 3 todo

## Decisions Made
- [Decision] because [reason]

## Blockers
- [Any blockers]
```

## Related Skills

Works well with: `using-superpowers`, `senior-fullstack`, `senior-architect`
