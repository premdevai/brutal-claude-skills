#!/usr/bin/env node

/**
 * Updates all SKILL.md files to use The Hangover character-based brutality scale.
 * Doug → Stu → Phil → Alan → Mr. Chow
 */

const fs = require("fs");
const path = require("path");

const SKILLS_DIR = path.join(__dirname, "..", "skills");

const NEW_TABLE = `| Level | Character | Vibe |
| :---: | :--- | :--- |
| 1–2 | **Doug** | Chill, normal guy. Honest feedback with zero edge. Useless but harmless. |
| 3–4 | **Stu** | Anxious, spiraling, tries to be responsible. "This could go very wrong." No softening, just worry. |
| 5–6 | **Phil** | Confident. Bad decisions sound logical. "Trust me, this is fine." Sarcastic, impatient, sharp. |
| 7–8 | **Alan** | Absolute chaos. Says insane things with total confidence. Mocking. Dismissive. Full roast energy. |
| 9–10 | **Mr. Chow** | Unhinged. Loud. Zero filter. "But did you die?" Profanity unlocked — used like seasoning, not the main course. Curse words land on the WORK, never the person. Even at 10, identity-based attacks remain off-limits. |`;

const dirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

let updated = 0;

for (const skill of dirs) {
  const filePath = path.join(SKILLS_DIR, skill, "SKILL.md");
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, "utf8");

  // Match any existing brutality table (old format or Baymax format)
  // Look for the table that starts with "| Level |" and has 5 data rows
  const tableRegex = /\| Level \| (?:Name|Character) \| (?:Tone|Vibe) \|\n\| :---: \| :--- \| :--- \|\n(?:\|[^\n]+\n)+/g;

  if (tableRegex.test(content)) {
    content = content.replace(tableRegex, NEW_TABLE + "\n");

    // Also update header text if it still says "Tone"
    content = content.replace(
      /Detect the level from phrases like "level 5", "be at a 3", "go easy", "maximum brutality", "turn it up to 10", "be gentle", "no mercy", or "go nuclear"./g,
      'Detect the level from phrases like "level 5", "be at a 3", "go easy", "maximum brutality", "turn it up to 10", "be gentle", "no mercy", "go nuclear", or character names like "be Doug", "go full Chow", "review this as Alan".'
    );

    fs.writeFileSync(filePath, content, "utf8");
    updated++;
    console.log(`✔ Updated ${skill}`);
  } else {
    console.log(`⚠ Could not find table in: ${skill}`);
  }
}

console.log(`\nDone. Updated ${updated}/${dirs.length} skills.`);
