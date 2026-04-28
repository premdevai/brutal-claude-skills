<div align="center">

# brutal-claude-skills

**13 no-mercy, adversarial-helpful skills for Claude Code.**

Code reviews, roasting, design critiques, devil's advocate, pre-mortems, and more — all designed to make your work better, not your feelings warmer.

[![npm version](https://img.shields.io/npm/v/brutal-claude-skills.svg?style=flat-square&color=cb3837)](https://www.npmjs.com/package/brutal-claude-skills)
[![license](https://img.shields.io/npm/l/brutal-claude-skills.svg?style=flat-square&color=blue)](./LICENSE)
[![node](https://img.shields.io/node/v/brutal-claude-skills.svg?style=flat-square)](./package.json)
[![downloads](https://img.shields.io/npm/dm/brutal-claude-skills.svg?style=flat-square&color=green)](https://www.npmjs.com/package/brutal-claude-skills)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](./CONTRIBUTING.md)

[Install](#install) · [Skills](#the-skills) · [Usage](#usage) · [Create Your Own](#creating-your-own-skill) · [Contributing](#contributing)

</div>

---

## Why

Claude is, by default, encouraging. That's mostly good. It's also occasionally useless when what you actually need is someone to tell you the truth about your draft, your code, your pitch, your plan, or your "Uber for X" startup idea.

This package installs skills that flip that default. Each skill puts Claude into a focused, adversarial-helpful mode for a specific task. You ask for a brutal code review, you get a brutal code review — not a pep talk.

Every skill stays on the **work**, not the **person**. Hard limits are baked in.

---

## Install

```bash
# Interactive — pick which skills you want
npx brutal-claude-skills

# Install everything
npx brutal-claude-skills --all

# Install a single skill
npx brutal-claude-skills --skill brutal-code-reviewer

# List what's available
npx brutal-claude-skills --list
```

Skills install to `~/.claude/skills/` by default (the directory Claude Code reads from).
Override with `--target <path>` if you need a different location.

> [!TIP]
> Restart Claude Code after installing so it picks up the new skills.

---

## The Skills

### 🔍 Brutal Critics — review your work product

| Skill | What it tears apart |
| :--- | :--- |
| **`brutal-code-reviewer`** | Code, PRs, diffs — no mercy engineering scrutiny |
| **`brutal-writing-editor`** | Essays, blog posts, articles, copy |
| **`brutal-design-critic`** | UI, UX, landing pages, Figma designs |
| **`brutal-resume-reviewer`** | Resumes, CVs, cover letters, LinkedIn profiles |
| **`brutal-pitch-reviewer`** | Pitch decks, investor memos, one-pagers |
| **`brutal-readme-reviewer`** | READMEs, docs, API references |
| **`brutal-commit-message-reviewer`** | Git history, PR titles, PR descriptions |
| **`brutal-email-reviewer`** | Professional emails, cold outreach |

### 🧠 Adversarial Thinking — interrogate your decisions

| Skill | What it does |
| :--- | :--- |
| **`devils-advocate`** | Argues the strongest possible case *against* any plan |
| **`pre-mortem`** | Imagines the project failed and writes the autopsy |
| **`bs-detector`** | Audits text/claims for vague language, weasel words, unsupported assertions |
| **`assumption-auditor`** | Surfaces the unspoken premises your plan rests on |

### 🎤 Pure Entertainment

| Skill | What it does |
| :--- | :--- |
| **`roast-mode`** | Savage, comedic roast of anything you willingly throw in |

---

## Usage

Once installed, you don't need to do anything special. Each skill has a description that tells Claude when to activate. Just ask naturally:

```
"Review my code"              → brutal-code-reviewer
"Roast my Twitter bio"        → roast-mode
"Play devil's advocate"       → devils-advocate
"What could go wrong?"        → pre-mortem
"Is this BS?"                 → bs-detector
"What am I assuming here?"    → assumption-auditor
"Review my README"            → brutal-readme-reviewer
```

You can also name a skill explicitly if you want a specific one.

---

## Manual Install (no npm)

```bash
# Clone the repo
git clone https://github.com/premdevai/brutal-claude-skills.git
cd brutal-claude-skills

# Copy the skills you want
cp -r skills/brutal-code-reviewer ~/.claude/skills/
cp -r skills/roast-mode ~/.claude/skills/

# Or copy everything
cp -r skills/* ~/.claude/skills/
```

---

## Uninstall

```bash
# Remove a specific skill
npx brutal-claude-skills --uninstall brutal-code-reviewer

# Remove all installed skills
npx brutal-claude-skills --uninstall --all
```

---

## Creating Your Own Skill

Each skill is one folder with one `SKILL.md` file:

```
my-skill/
└── SKILL.md
```

The `SKILL.md` uses YAML frontmatter followed by the skill body in markdown:

```yaml
---
name: my-skill
description: A one-line description. This is what Claude reads to decide when
  to trigger the skill, so include concrete trigger phrases.
---

# My Skill

## Persona
Who the skill embodies...

## Behavior Rules
What it always/never does...

## Output Format
How it structures responses...
```

See any skill in [`skills/`](./skills) for a real example, or read the full [Skill Authoring Guide](./docs/SKILL_AUTHORING.md).

---

## Design Principles

1. **Stay on the work, never the person.** Roasts target choices, not identity.
2. **Quote what you attack.** Every critique cites the actual line, bullet, or sentence.
3. **Cut before rewriting.** Most things are too long. Most fixes start with deletion.
4. **Hard limits are non-negotiable.** No punching at race, gender, sexuality, disability, mental health, body, or trauma — even in `roast-mode`.
5. **No participation trophies.** If something's bad, it's bad.

---

## Contributing

Contributions are welcome! Whether it's a new skill, a bug fix, or an improvement to an existing skill.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## License

[MIT](./LICENSE) — do whatever you want with it.

---

## A Note on Tone

If a skill ever crosses a line — punches at identity instead of choices, hands out cruelty without a joke, or refuses to drop the bit when you tap out — **that's a bug, not a feature**. [Open an issue](https://github.com/premdevai/brutal-claude-skills/issues).

The goal is to make your work better. Not to be liked.
