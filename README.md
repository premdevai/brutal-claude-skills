<div align="center">

<img src="./assets/banner-gpt.png" alt="Brutal Claude Skills — Thirteen skills. Zero sugar. All impact." width="100%" />

<br />

# brutal-claude-skills

**15 no-mercy, adversarial-helpful skills for Claude Code.**

Code reviews, roasting, design critiques, devil's advocate, pre-mortems, and more — all designed to make your work better, not your feelings warmer.

[![npm version](https://img.shields.io/npm/v/brutal-claude-skills?style=flat-square&color=cb3837)](https://www.npmjs.com/package/brutal-claude-skills)
[![npm downloads](https://img.shields.io/npm/dt/brutal-claude-skills?style=flat-square&color=blue)](https://www.npmjs.com/package/brutal-claude-skills)
[![node](https://img.shields.io/badge/node-%3E%3D18-339933?style=flat-square&logo=node.js&logoColor=white)](./package.json)
[![skills](https://img.shields.io/badge/skills-15-f59e0b?style=flat-square)](./skills)
[![zero deps](https://img.shields.io/badge/dependencies-0-22c55e?style=flat-square)](./package.json)
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

Get started instantly with the interactive CLI:

```bash
# Initialize your environment and install recommended skills
npx brutal-claude-skills init

# See all available commands
npx brutal-claude-skills help
```

Skills install to `~/.claude/skills/` by default (the directory Claude Code reads from).

---

## ⚡ Quick Usage

Once installed, use the killer feature to pipe or paste code directly into a brutal review:

```bash
# Pipe git diff straight to the reviewer
git diff | npx brutal-claude-skills use code-reviewer

# Or run interactively (paste your code)
npx brutal-claude-skills use architecture-reviewer --level 10
```

*This will automatically launch Claude Code with the correct prompt and your input.*

---

## Command Reference

The CLI uses a clean, one-command mental model: `brutal <action>`. 
*(Note: If installing globally via `npm i -g brutal-claude-skills`, you can just type `brutal` instead of `npx brutal-claude-skills`)*

```bash
brutal init               # First-time setup (installs engineering pack)
brutal install <skill>    # Install specific skills (alias: i)
brutal use <skill>        # Interactive prompt or piped input
brutal list               # List all skills (alias: ls)
brutal status             # Check installed skills (alias: st)
brutal remove <skill>     # Remove skills (alias: rm)
brutal doctor             # Run diagnostics
brutal export cursor      # Export to Cursor (.cursorrules)
brutal upgrade            # Check for updates
```

---

## Skill Packs

Don't want everything? Install curated bundles:

```bash
brutal install pack <name>
```

| Pack | Skills | What it covers |
| :--- | :---: | :--- |
| **`engineering`** | 4 | Code reviewer, commit reviewer, design critic, architecture reviewer |
| **`writing`** | 3 | Writing editor, README reviewer, email reviewer |
| **`strategy`** | 4 | Devil's advocate, pre-mortem, assumption auditor, BS detector |
| **`career`** | 2 | Resume reviewer, interview prep destroyer |
| **`founder`** | 4 | Pitch reviews, writing, architecture, BS detector |
| **`fun`** | 1 | Roast mode |

---

## Team Install (Project Level)

Install skills at the project level so your whole team gets them via git:

```bash
# Install to .claude/skills/ in your current project
brutal install all --project

# Commit to share with your team
git add .claude/skills/ && git commit -m "chore: add brutal claude skills for the team"
```

Check what's installed globally vs. in the current project:

```bash
brutal status
```

---

## The Skills

### <img src="https://img.shields.io/badge/CRITICS-9_skills-dc2626?style=flat-square&labelColor=1c1917" alt="Critics" /> — review your work product

| Skill | What it tears apart |
| :--- | :--- |
| **`brutal-code-reviewer`** | Code, PRs, diffs — no mercy engineering scrutiny |
| **`brutal-architecture-reviewer`** | System design, service boundaries, infra decisions |
| **`brutal-writing-editor`** | Essays, blog posts, articles, copy |
| **`brutal-design-critic`** | UI, UX, landing pages, Figma designs |
| **`brutal-resume-reviewer`** | Resumes, CVs, cover letters, LinkedIn profiles |
| **`brutal-pitch-reviewer`** | Pitch decks, investor memos, one-pagers |
| **`brutal-readme-reviewer`** | READMEs, docs, API references |
| **`brutal-commit-message-reviewer`** | Git history, PR titles, PR descriptions |
| **`brutal-email-reviewer`** | Professional emails, cold outreach |

### <img src="https://img.shields.io/badge/ADVERSARIAL_THINKING-4_skills-f59e0b?style=flat-square&labelColor=1c1917" alt="Adversarial Thinking" /> — interrogate your decisions

| Skill | What it does |
| :--- | :--- |
| **`devils-advocate`** | Argues the strongest possible case *against* any plan |
| **`pre-mortem`** | Imagines the project failed and writes the autopsy |
| **`bs-detector`** | Audits text/claims for vague language, weasel words, unsupported assertions |
| **`assumption-auditor`** | Surfaces the unspoken premises your plan rests on |

### <img src="https://img.shields.io/badge/CAREER_&_PREP-1_skill-8b5cf6?style=flat-square&labelColor=1c1917" alt="Career & Prep" /> — survive the real thing

| Skill | What it does |
| :--- | :--- |
| **`interview-prep-destroyer`** | Tears apart practice interview answers, STAR stories, and technical explanations |

### <img src="https://img.shields.io/badge/ENTERTAINMENT-1_skill-22c55e?style=flat-square&labelColor=1c1917" alt="Entertainment" /> — pure chaos

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

### Brutality Scale (0–10)

Every skill supports a **brutality level** from 0 to 10. Default is **7**. Just tell Claude how hard to go:

```
"Review my code, level 3"           → professional, no sarcasm
"Review my code"                    → default (7), savage
"Review my code, go nuclear"        → level 10, profanity unlocked
"Be gentle with this one"           → level 1–2
"Maximum brutality"                 → level 10
"Turn it down"                      → drops 3 levels mid-conversation
```

| Level | Name | Vibe |
| :---: | :--- | :--- |
| 0–2 | **Cool** | Professional 1:1. Honest but no edge. |
| 3–4 | **Blunt** | "This is bad. Here's why." |
| 5–6 | **Harsh** | Sarcastic. Impatient. Cutting. |
| 7–8 | **Savage** | Mocking. Dismissive. Full roast energy. |
| 9–10 | **Nuclear** | Profanity unlocked. Gordon Ramsay mode. |

> [!IMPORTANT]
### Export to Cursor & Copilot

You can use these brutal personas in other AI coding assistants. Export them as a `.cursorrules` file for Cursor, or a `.github/copilot-instructions.md` file for GitHub Copilot.

```bash
# Export the engineering pack to Cursor
npx brutal-claude-skills export --export-target cursor --pack engineering

# Export a specific skill to GitHub Copilot
npx brutal-claude-skills export --export-target copilot --skill brutal-code-reviewer
```

### Programmatic API

Building a custom PR review bot? An internal Slack integration? You can consume the prompts programmatically via Node.js:

```javascript
const { getSkill, listSkills } = require('brutal-claude-skills');

// Get all available skill names
const skills = listSkills();

// Get the raw prompt for a specific skill, overriding the default brutality level
const prompt = getSkill('brutal-code-reviewer', { 
  stripFrontmatter: true, 
  level: 10 
});

console.log(prompt); // Use this in your Anthropic API calls
```

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
