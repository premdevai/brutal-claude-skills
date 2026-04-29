#!/usr/bin/env node

/**
 * Updates all SKILL.md files to use character-based brutality scale
 * instead of the generic Cool/Blunt/Harsh/Savage/Nuclear names.
 */

const fs = require("fs");
const path = require("path");

const SKILLS_DIR = path.join(__dirname, "..", "skills");

const OLD_TABLE = `| Level | Name | Tone |
| :---: | :--- | :--- |
| 0–2 | **Cool** | Professional and direct. No jokes, no sarcasm. Honest but respectful. Think senior engineer in a calm 1:1. Still no sugarcoating — just delivered without edge. |
| 3–4 | **Blunt** | No softening, no hedging. "This is bad. Here's why." Matter-of-fact harshness. You don't care about feelings but you're not trying to wound. |
| 5–6 | **Harsh** | Sarcastic. Impatient. "Why does this exist?" You're visibly annoyed by bad work. Sharp observations, cutting one-liners. |
| 7–8 | **Savage** | Mocking. Dismissive. "Did you write this with your eyes closed?" Full roast energy. You quote bad work back at the author and twist the knife. |
| 9–10 | **Nuclear** | Unhinged. Profanity allowed — use it like seasoning, not the main course. Gordon Ramsay meets a code reviewer who hasn't slept. "What the f*** is this?" is a valid opening. Curse words land on the WORK, never on the person. Even at 10, identity-based attacks remain off-limits. |`;

const NEW_TABLE = `| Level | Character | Tone |
| :---: | :--- | :--- |
| 0–2 | **Baymax** *(Big Hero 6)* | Gentle, caring, honest. "I am satisfied with my care." Professional 1:1. No edge, just facts. |
| 3–4 | **Spock** *(Star Trek)* | Logical. Emotionless. "That is illogical." No feelings, no hedging, just cold analysis. |
| 5–6 | **Miranda Priestly** *(Devil Wears Prada)* | Sarcastic. Impatient. "Is there some reason my coffee isn't here?" Visibly annoyed by mediocrity. |
| 7–8 | **Dr. House** *(House M.D.)* | Mocking. Dismissive. "Everybody lies." Full roast energy. Quotes your bad work back at you and twists the knife. |
| 9–10 | **Gordon Ramsay** *(Hell's Kitchen)* | Unhinged. Profanity unlocked — used like seasoning, not the main course. "IT'S RAW!" Curse words land on the WORK, never the person. Even at 10, identity-based attacks remain off-limits. |`;

const dirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

let updated = 0;

for (const skill of dirs) {
  const filePath = path.join(SKILLS_DIR, skill, "SKILL.md");
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, "utf8");

  // Try exact match first
  if (content.includes("| 0–2 | **Cool**")) {
    // Replace the entire table block
    // Find the table by matching from "| Level |" to the last row
    content = content.replace(
      /\| Level \| Name \| Tone \|\n\| :---: \| :--- \| :--- \|\n(\|[^\n]+\n)+/g,
      NEW_TABLE + "\n"
    );
    fs.writeFileSync(filePath, content, "utf8");
    updated++;
    console.log(`✔ Updated ${skill}`);
  } else if (content.includes("| 0–2 | **Baymax**")) {
    console.log(`⊘ Already updated: ${skill}`);
  } else {
    // Custom table (SEO, web vitals) — different format
    // These have custom examples per level, replace just the names
    const customReplacements = [
      [/\| 0–2 \| \*\*Cool\*\*/g, "| 0–2 | **Baymax** *(Big Hero 6)*"],
      [/\| 3–4 \| \*\*Blunt\*\*/g, "| 3–4 | **Spock** *(Star Trek)*"],
      [/\| 5–6 \| \*\*Harsh\*\*/g, "| 5–6 | **Miranda Priestly** *(Devil Wears Prada)*"],
      [/\| 7–8 \| \*\*Savage\*\*/g, "| 7–8 | **Dr. House** *(House M.D.)*"],
      [/\| 9–10 \| \*\*Nuclear\*\*/g, "| 9–10 | **Gordon Ramsay** *(Hell's Kitchen)*"],
    ];

    let changed = false;
    for (const [re, repl] of customReplacements) {
      if (re.test(content)) {
        content = content.replace(re, repl);
        changed = true;
      }
    }

    if (changed) {
      // Also update the header from "Name" to "Character"
      content = content.replace("| Level | Name | Tone |", "| Level | Character | Tone |");
      fs.writeFileSync(filePath, content, "utf8");
      updated++;
      console.log(`✔ Updated (custom): ${skill}`);
    } else {
      console.log(`⚠ Could not update: ${skill} (manual check needed)`);
    }
  }
}

console.log(`\nDone. Updated ${updated}/${dirs.length} skills.`);
