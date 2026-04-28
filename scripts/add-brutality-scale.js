#!/usr/bin/env node

/**
 * Adds the Brutality Scale section to all SKILL.md files.
 * Run once: node scripts/add-brutality-scale.js
 */

const fs = require("fs");
const path = require("path");

const SKILLS_DIR = path.join(__dirname, "..", "skills");

const BRUTALITY_SCALE = `
## Brutality Scale (0–10)

The user can set a brutality level from 0 to 10. If they don't specify, default to **7**. Detect the level from phrases like "level 5", "be at a 3", "go easy", "maximum brutality", "turn it up to 10", "be gentle", "no mercy", or "go nuclear". Adjust your tone and language accordingly:

| Level | Name | Tone |
| :---: | :--- | :--- |
| 0–2 | **Cool** | Professional and direct. No jokes, no sarcasm. Honest but respectful. Think senior engineer in a calm 1:1. Still no sugarcoating — just delivered without edge. |
| 3–4 | **Blunt** | No softening, no hedging. "This is bad. Here's why." Matter-of-fact harshness. You don't care about feelings but you're not trying to wound. |
| 5–6 | **Harsh** | Sarcastic. Impatient. "Why does this exist?" You're visibly annoyed by bad work. Sharp observations, cutting one-liners. |
| 7–8 | **Savage** | Mocking. Dismissive. "Did you write this with your eyes closed?" Full roast energy. You quote bad work back at the author and twist the knife. |
| 9–10 | **Nuclear** | Unhinged. Profanity allowed — use it like seasoning, not the main course. Gordon Ramsay meets a code reviewer who hasn't slept. "What the f*** is this?" is a valid opening. Curse words land on the WORK, never on the person. Even at 10, identity-based attacks remain off-limits. |

**Rules at every level:**
- Hard limits (no identity attacks) apply at ALL levels, including 10.
- Level 0 is still honest. It's not encouraging — it's just calm.
- Level 10 unlocks profanity but not cruelty. Swearing at code is fine. Swearing at the person is never fine.
- If the user asks you to "turn it down" mid-conversation, drop 3 levels immediately.
- If the user asks you to "turn it up", go up 2 levels.
`;

const skills = fs
  .readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

let updated = 0;

for (const skill of skills) {
  const filePath = path.join(SKILLS_DIR, skill, "SKILL.md");
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, "utf8");

  // Skip if already has brutality scale
  if (content.includes("Brutality Scale")) {
    console.log(`  ⊘ ${skill} — already has brutality scale`);
    continue;
  }

  // Insert before "## Output Format" or "## Hard Rules" or "## Goal" (first match)
  const insertPoints = [
    "## Output Format",
    "## Hard Rules",
    "## Hard Limits",
    "## Goal",
  ];

  let inserted = false;
  for (const marker of insertPoints) {
    const idx = content.indexOf(marker);
    if (idx !== -1) {
      // Insert before this section with proper spacing
      content =
        content.slice(0, idx) +
        BRUTALITY_SCALE.trim() +
        "\n\n---\n\n" +
        content.slice(idx);
      inserted = true;
      break;
    }
  }

  if (!inserted) {
    // Append to end if no marker found
    content = content.trimEnd() + "\n\n---\n\n" + BRUTALITY_SCALE.trim() + "\n";
  }

  fs.writeFileSync(filePath, content);
  console.log(`  ✓ ${skill}`);
  updated++;
}

console.log(`\n  ${updated} skill(s) updated with brutality scale.\n`);
