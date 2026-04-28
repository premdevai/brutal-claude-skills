# Contributing to brutal-claude-skills

First: thanks for caring enough to contribute. These skills only get better if people use them, break them, and fix them.

---

## Quick Start

```bash
# Fork & clone
git clone https://github.com/<your-username>/brutal-claude-skills.git
cd brutal-claude-skills

# Run tests
npm test

# List skills
npm run list
```

---

## Ways to Contribute

### 🐛 Report a Bug
Found a skill that crosses a line, breaks in a specific context, or behaves inconsistently? [Open an issue](https://github.com/premdevai/brutal-claude-skills/issues/new?template=bug_report.md).

### 💡 Request a Skill
Have an idea for a new adversarial-helpful skill? [Open a feature request](https://github.com/premdevai/brutal-claude-skills/issues/new?template=new_skill.md).

### 🔧 Submit a PR
1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-new-skill`
3. Make your changes
4. Run tests: `npm test`
5. Commit with a clear message: `git commit -m "feat: add brutal-api-reviewer skill"`
6. Push and open a PR

---

## Adding a New Skill

### Structure

Every skill lives in its own directory under `skills/`:

```
skills/
└── my-new-skill/
    └── SKILL.md
```

### Requirements

Your `SKILL.md` must include:

1. **YAML frontmatter** with `name` and `description`
2. A **Persona** section — who the skill is
3. **Behavior Rules** — what it always/never does
4. **Tone** — how it sounds
5. **Output Format** — how it structures responses
6. **Hard Rules** — non-negotiable constraints

### Quality Checklist

- [ ] Skill stays on the **work**, not the person
- [ ] Hard limits explicitly prohibit identity-based attacks
- [ ] Description includes concrete trigger phrases
- [ ] Tone is consistent throughout
- [ ] At least one example is provided
- [ ] Name follows `kebab-case` convention
- [ ] Tested manually with Claude Code

See the [Skill Authoring Guide](./docs/SKILL_AUTHORING.md) for a detailed walkthrough.

---

## Improving an Existing Skill

PRs that sharpen existing skills are extremely welcome. Common improvements:

- Better trigger phrases in the `description`
- More specific behavior rules
- Stronger examples
- Fixing cases where the skill is too vague or too generic
- Tightening hard limits

---

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add brutal-api-reviewer skill
fix: tighten hard limits in roast-mode
docs: clarify install instructions
chore: update CI config
```

---

## Code of Conduct

This project has a [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

The same hard limits that apply to the skills apply to our community: stay on the work, never the person.

---

## Questions?

Open a [discussion](https://github.com/premdevai/brutal-claude-skills/discussions) or an issue. No question is too small.
