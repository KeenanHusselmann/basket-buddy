---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications (examples include websites, landing pages, dashboards, React components, HTML/CSS layouts, or when styling/beautifying any web UI). Generates creative, polished code and UI design that avoids generic AI aesthetics.
license: Complete terms in LICENSE.txt
---

This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

The user provides frontend requirements: a component, page, application, or interface to build. They may include context about the purpose, audience, or technical constraints.

## Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work - the key is intentionality, not intensity.

Then implement working code (React + TypeScript + Tailwind CSS) that is:
- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

## Frontend Aesthetics Guidelines (BasketBuddy Context)

Focus on:
- **Typography**: Choose Tailwind font utilities that feel intentional. Use `font-mono` for financial numbers, `font-bold` with `tracking-tight` for headings. `tabular-nums` for all currency values.
- **Color & Theme**: Commit to the app's violet accent palette. `bg-violet-600` as primary action color. Semantic green/rose for income/expense. Full dark mode with `dark:` variants.
- **Motion**: `transition-all duration-200 ease-out` for interactions. `motion-safe:` prefix to respect user preferences. Staggered entry for lists.
- **Spatial Composition**: Generous padding `p-6`. Clear visual hierarchy. Cards with `rounded-xl shadow-sm border`.
- **Finance-Specific**: Numbers always formatted with currency symbol. Positive = emerald, negative = rose. Empty states are informative and actionable.

NEVER use:
- Solid white cards on solid white backgrounds
- Emoji as icons (use Lucide React)
- Unformatted raw numbers
- Missing dark mode classes

## Implementation Pattern (React + Tailwind)

```tsx
// Finance card example
<div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">
    Total Balance
  </p>
  <p className="mt-1 text-3xl font-bold font-mono tabular-nums text-gray-900 dark:text-white">
    R 12,450.00
  </p>
  <p className="mt-1 text-sm text-emerald-500 dark:text-emerald-400">
    +R 1,200.00 this month
  </p>
</div>
```

Remember: The goal is a finance app that feels crafted, not generated. Every number should read clearly. Every interaction should feel responsive.
