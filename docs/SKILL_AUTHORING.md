# Skill Authoring Guide

How to create a new skill for `brutal-claude-skills`.

---

## Overview

A skill is a single `SKILL.md` file inside a named directory under `skills/`. When installed, Claude Code reads the file and uses it to modify its behavior when triggered by matching user requests.

```
skills/
└── my-skill-name/
    └── SKILL.md
```

That's it. No code, no config, no dependencies. Just a markdown file with structure.

---

## File Format

Every `SKILL.md` follows this structure:

```markdown
---
name: my-skill-name
description: A detailed description that tells Claude WHEN to activate this
  skill. Include concrete trigger phrases like "review my X", "be harsh about Y",
  "critique Z". Also specify what this skill should NOT be used for, pointing
  to other skills where appropriate.
---

# Skill Title

## Persona
Who this skill embodies. What kind of expert, critic, or character.

## Behavior Rules
- What the skill always does
- What the skill never does
- Specific constraints on output

## Tone
How the skill sounds. Reference points help (e.g., "like a tired editor
who has read too many bad drafts").

## Review Priorities / Focus Areas
What the skill looks at, in priority order.

## Output Format
How responses are structured (bullets, quotes, sections, etc).

## Example
At least one concrete example showing input → output style.

## Hard Rules
Non-negotiable constraints. Always include identity-protection limits.

## Goal
One line: what this skill exists to do.
```

---

## Frontmatter

### `name`

The skill identifier. Must match the directory name. Use `kebab-case`:
- ✅ `brutal-api-reviewer`
- ❌ `Brutal API Reviewer`
- ❌ `brutal_api_reviewer`

### `description`

This is the most important field. Claude reads this to decide whether to activate the skill. Your description must include:

1. **What the skill does** — one sentence
2. **Trigger phrases** — concrete phrases the user might say
3. **Exclusions** — when NOT to use this skill, pointing to alternatives

Example:
```yaml
description: A merciless API design reviewer that tears apart REST, GraphQL,
  and gRPC API designs. Use when the user asks to "review my API", "critique
  my endpoints", "is this API design good", or shares API specs asking for
  feedback. Do not use for code implementation reviews (use brutal-code-reviewer)
  or documentation reviews (use brutal-readme-reviewer).
```

---

## Required Sections

### Persona

Define the character. Be specific about their expertise and attitude:

```markdown
## Persona

You are a senior API architect who has reviewed hundreds of public APIs and
is deeply annoyed by every anti-pattern you've seen repeated. You value
consistency, predictability, and developer ergonomics above all.
```

### Behavior Rules

Explicit do's and don'ts. These constrain Claude's behavior:

```markdown
## Behavior Rules

- Never say an API is "fine" — there's always something wrong
- Quote the actual endpoint, field name, or status code you're criticizing
- Prioritize breaking issues over style preferences
- If the API has no versioning strategy, lead with that
```

### Hard Rules

Every skill must include identity-protection limits:

```markdown
## Hard Rules

- Stay on the API design, never on the designer
- No assumptions about the author's experience level or background
- If asked to review a competitor's API, review the design, not the company
```

---

## Style Tips

1. **Be specific over generic.** "This variable name is meaningless" beats "naming could be improved."
2. **Show, don't tell.** Include example outputs so the tone is unmistakable.
3. **Front-load the harshest feedback.** Skills should lead with the biggest problem.
4. **One skill, one job.** Don't create a skill that reviews code AND docs AND design. Split them.
5. **Test with Claude.** Install your skill and run it against real inputs before submitting.

---

## Testing Your Skill

```bash
# Install just your skill
npx brutal-claude-skills --skill my-new-skill --target ~/.claude/skills

# Restart Claude Code, then test with various prompts:
# - Direct trigger: "review my API design"
# - Indirect trigger: "what do you think of these endpoints?"
# - Edge case: something that should NOT trigger your skill
```

---

## Submitting

1. Add your skill directory under `skills/`
2. Run `npm test` to verify the install script recognizes it
3. Open a PR with:
   - The new `skills/my-skill-name/SKILL.md` file
   - A brief description of what the skill does and why it's useful
4. See [CONTRIBUTING.md](../CONTRIBUTING.md) for PR guidelines
