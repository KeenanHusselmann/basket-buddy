---
name: using-superpowers
description: Use when starting any conversation - establishes how to find and use skills, requiring skill invocation before ANY response including clarifying questions
---

<EXTREMELY-IMPORTANT>
If you think there is even a 1% chance a skill might apply to what you are doing, you ABSOLUTELY MUST read the skill.

IF A SKILL APPLIES TO YOUR TASK, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT.

This is not negotiable. This is not optional. You cannot rationalize your way out of this.
</EXTREMELY-IMPORTANT>

# Using Skills — BasketBuddy Agents

## The Rule

**Check for skills BEFORE ANY RESPONSE.** This includes clarifying questions. Even 1% chance means read the skill file first.

## Skill Map for BasketBuddy

| Task | Skills to Invoke |
|------|-----------------|
| Build a new React component | `react-dev`, `senior-frontend`, `frontend-design` |
| Style a page or component | `ui-ux-pro-max`, `frontend-design` |
| Add UX review / accessibility | `ui-ux-pro-max` |
| New full feature (types → UI) | `senior-fullstack`, `react-dev`, `senior-frontend` |
| Firestore / Firebase work | `senior-backend` |
| Architecture decision | `senior-architect` |
| Design system / aesthetics | `frontend-design`, `ui-ux-pro-max` |
| Agent / memory system | `agent-memory-systems` |

## Skill Priority Order

When multiple skills apply, load in this order:

1. **Process/meta skills first** (`using-superpowers`) — determines HOW to approach
2. **Architecture skills** (`senior-architect`) — determines WHAT to build
3. **Implementation skills** (`senior-fullstack`, `senior-backend`) — determines HOW to build
4. **Frontend skills** (`react-dev`, `senior-frontend`) — code patterns
5. **Design skills** (`frontend-design`, `ui-ux-pro-max`) — look and feel

## Red Flags — You Are Rationalizing, STOP

| Thought | Reality |
|---------|---------|
| "This is just a simple question" | Check for skills first |
| "I need more context first" | Skill check BEFORE clarifying questions |
| "I remember this skill" | Skills evolve. Read current version |
| "This doesn't count as a task" | Action = task. Check skills |
| "This feels productive" | Undisciplined action wastes time |

## How to Invoke a Skill

Read the skill file BEFORE responding:
```
Read: .claude/skills/<skill-name>/SKILL.md
```

Then announce: "Using [skill-name] to [purpose]" before proceeding.

## Skill Types

**Rigid** (react-dev, senior-backend): Follow exactly. Don't adapt away.
**Flexible** (frontend-design, ui-ux-pro-max): Adapt principles to context.
**Meta** (using-superpowers): Always follow exactly.
