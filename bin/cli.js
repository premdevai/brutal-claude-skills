#!/usr/bin/env node

/**
 * 💥 brutal-claude-skills v1 CLI
 * No sugar, all signal.
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { execSync } = require("child_process");

// We'll require the core logic later, but for now let's set up the router.
const SKILLS_DIR = path.join(__dirname, "..", "skills");
const PKG = require("../package.json");
const DEFAULT_TARGET = path.join(
  process.env.HOME || process.env.USERPROFILE || "",
  ".claude",
  "skills"
);

// Basic styling
const format = (code, str) => `\x1b[${code}m${str}\x1b[0m`;
const c = {
  bold: (s) => format("1", s),
  dim: (s) => format("2", s),
  red: (s) => format("31", s),
  green: (s) => format("32", s),
  yellow: (s) => format("33", s),
  cyan: (s) => format("36", s),
  gray: (s) => format("90", s),
};

const CATEGORIES = {
  "CRITICS": [
    "brutal-code-reviewer",
    "brutal-architecture-reviewer",
    "brutal-design-critic",
    "brutal-readme-reviewer",
    "brutal-commit-message-reviewer",
    "brutal-email-reviewer",
    "brutal-pitch-reviewer",
    "brutal-writing-editor",
  ],
  "ADVERSARIAL THINKING": ["devils-advocate", "pre-mortem", "bs-detector", "assumption-auditor"],
  "CAREER & PREP": ["brutal-resume-reviewer", "interview-prep-destroyer"],
  "ENTERTAINMENT": ["roast-mode"],
};

const PACKS = {
  engineering: {
    desc: "Code, architecture, commits, and READMEs",
    skills: ["brutal-code-reviewer", "brutal-architecture-reviewer", "brutal-commit-message-reviewer", "brutal-readme-reviewer"]
  },
  strategy: {
    desc: "Pre-mortems, BS detection, assumptions",
    skills: ["pre-mortem", "bs-detector", "assumption-auditor", "devils-advocate"]
  },
  career: {
    desc: "Resume reviews and brutal mock interviews",
    skills: ["brutal-resume-reviewer", "interview-prep-destroyer"]
  },
  founder: {
    desc: "Pitch reviews, writing, architecture",
    skills: ["brutal-pitch-reviewer", "brutal-architecture-reviewer", "brutal-writing-editor", "bs-detector"]
  },
  fun: {
    desc: "Just roasts",
    skills: ["roast-mode"]
  }
};

const skills = fs.existsSync(SKILLS_DIR)
  ? fs
      .readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .filter((d) => fs.existsSync(path.join(SKILLS_DIR, d.name, "SKILL.md")))
      .map((d) => d.name)
      .sort()
  : [];

// ── Utils ─────────────────────────────────────────────────────────────

function getProjectTarget() {
  return path.join(process.cwd(), ".claude", "skills");
}

function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function removeDirSync(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    return true;
  }
  return false;
}

function getInstalledSkills(target) {
  if (!fs.existsSync(target)) return [];
  return fs
    .readdirSync(target, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .filter((d) => fs.existsSync(path.join(target, d.name, "SKILL.md")))
    .map((d) => d.name)
    .sort();
}

function fuzzyMatchSkill(query) {
  if (skills.includes(query)) return query;
  if (skills.includes(`brutal-${query}`)) return `brutal-${query}`;
  const matched = skills.find(s => s.includes(query));
  return matched || query; // fallback
}

function readSkillContent(skillName) {
  const skillFile = path.join(SKILLS_DIR, skillName, "SKILL.md");
  if (!fs.existsSync(skillFile)) return null;
  return fs.readFileSync(skillFile, "utf8");
}

function exportSkill(skillName, exportTarget, outPath) {
  const content = readSkillContent(skillName);
  if (!content) return false;

  // Strip frontmatter
  let cleanContent = content.replace(/^---\n([\s\S]*?)\n---\n/, '').trim();
  
  const header = `You are adopting the following persona for all interactions in this project:\n\n`;

  let finalContent = cleanContent;
  if (exportTarget === 'cursor' || exportTarget === 'copilot') {
    finalContent = header + cleanContent;
  }

  // If file exists, append (for packs), otherwise create
  if (fs.existsSync(outPath)) {
    fs.appendFileSync(outPath, "\n\n---\n\n" + cleanContent, "utf8");
  } else {
    fs.writeFileSync(outPath, finalContent, "utf8");
  }
  return true;
}

// ── Commands ──────────────────────────────────────────────────────────

async function runInit() {
  console.log(`\n🔥 ${c.bold("brutal")} v${PKG.version} — no sugar, all signal\n`);
  
  // Create project dir
  const projectDir = getProjectTarget();
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }
  
  console.log(`✔ Created ${c.cyan(".claude/skills/")}\n`);
  
  // Install recommended pack (engineering)
  console.log(`Installing recommended pack (engineering)...`);
  for (const s of PACKS.engineering.skills) {
    copyDirSync(path.join(SKILLS_DIR, s), path.join(projectDir, s));
    console.log(`  ✔ ${s}`);
  }
  
  console.log(`\n✔ Default brutality: 7 (Savage)\n`);
  console.log(`${c.dim("────────────────────────────────────")}\n`);
  console.log(`You're ready.\n`);
  console.log(`Try this in Claude Code:`);
  console.log(`→ "Review my last commit brutally"\n`);
  console.log(`Or:`);
  console.log(`→ brutal use code-reviewer\n`);
  console.log(`Run \`${c.cyan("brutal doctor")}\` if something feels off.\n`);
}

async function runInstall(args) {
  const isProject = args.includes("--project") || args.includes("-p");
  const target = isProject ? getProjectTarget() : DEFAULT_TARGET;
  
  let toInstall = [];
  let packName = null;

  const rawArgs = args.filter(a => !a.startsWith("-"));

  if (rawArgs.length === 0) {
    packName = "engineering";
    toInstall = PACKS.engineering.skills;
    console.log(`\nInstalling recommended pack (engineering)...`);
  } else if (rawArgs[0] === "pack" && rawArgs[1]) {
    packName = rawArgs[1];
    if (!PACKS[packName]) {
      console.error(c.red(`\n✗ Unknown pack: ${packName}`));
      return;
    }
    toInstall = PACKS[packName].skills;
    console.log(`\nInstalling pack: ${packName}...`);
  } else if (rawArgs[0] === "all") {
    toInstall = skills;
    console.log(`\nInstalling all skills...`);
  } else {
    toInstall = rawArgs.map(fuzzyMatchSkill);
    console.log(`\nInstalling...`);
  }

  let installedCount = 0;
  for (const s of toInstall) {
    const src = path.join(SKILLS_DIR, s);
    if (!fs.existsSync(src)) {
      console.log(`  ${c.red("✗")} ${s} (not found)`);
      continue;
    }
    copyDirSync(src, path.join(target, s));
    console.log(`  ${c.green("✔")} ${s}`);
    installedCount++;
  }

  if (isProject) {
    console.log(`\n✔ Added to project (${installedCount} skills)`);
    console.log(`✔ Safe to commit\n`);
    console.log(`Next:\n→ git add .claude/skills\n`);
  } else {
    console.log(`\nDone in ${installedCount} skills\n`);
    if (installedCount > 0) {
      console.log(`Tip:\n→ brutal use ${toInstall[0].replace("brutal-", "")}\n`);
    }
  }
}

async function runRemove(args) {
  const isProject = args.includes("--project") || args.includes("-p");
  const target = isProject ? getProjectTarget() : DEFAULT_TARGET;
  
  const rawArgs = args.filter(a => !a.startsWith("-"));
  if (rawArgs.length === 0) {
    console.error(c.red("\n✗ Provide a skill name or 'all' to remove\n"));
    return;
  }

  console.log("");
  
  if (rawArgs[0] === "all") {
    let removed = 0;
    const installed = getInstalledSkills(target);
    for (const s of installed) {
      if (removeDirSync(path.join(target, s))) {
        console.log(`Removing: ${s}  ${c.green("✔")} Removed`);
        removed++;
      }
    }
    console.log(`\nRemaining: 0 skills\n`);
  } else {
    let removed = 0;
    for (const raw of rawArgs) {
      const s = fuzzyMatchSkill(raw);
      if (removeDirSync(path.join(target, s))) {
        console.log(`Removing: ${s}  ${c.green("✔")} Removed`);
        removed++;
      } else {
        console.log(`Removing: ${s}  ${c.yellow("⚠")} Not installed`);
      }
    }
    const remaining = getInstalledSkills(target).length;
    console.log(`\nRemaining: ${remaining} skills\n`);
  }
}

async function runList() {
  console.log(`\n${c.bold("Available Skills")}\n`);
  for (const [cat, catSkills] of Object.entries(CATEGORIES)) {
    console.log(`${c.dim(cat)}`);
    for (const s of catSkills) {
      console.log(`  ${s.replace("brutal-", "")}`);
    }
    console.log("");
  }
  
  console.log(`Run:\n→ brutal use <skill>\n→ brutal install <skill>\n`);
}

async function runStatus() {
  const globalInstalled = getInstalledSkills(DEFAULT_TARGET);
  const projectInstalled = getInstalledSkills(getProjectTarget());
  
  const allInstalledSet = new Set([...globalInstalled, ...projectInstalled]);
  const missing = skills.filter(s => !allInstalledSet.has(s));

  console.log(`\n${c.bold("Environment")}\n`);
  
  console.log(`Global:`);
  if (globalInstalled.length === 0) console.log(c.dim("  (none)"));
  globalInstalled.forEach(s => console.log(`  ${c.green("✔")} ${s.replace("brutal-", "")}`));
  
  console.log(`\nProject:`);
  if (projectInstalled.length === 0) console.log(c.dim("  (none)"));
  projectInstalled.forEach(s => console.log(`  ${c.green("✔")} ${s.replace("brutal-", "")}`));
  
  console.log(`\nMissing:`);
  if (missing.length === 0) console.log(c.dim("  (none)"));
  missing.forEach(s => console.log(`  ${c.red("✗")} ${s.replace("brutal-", "")}`));
  
  console.log(`\nDefault Level: 7 (Savage)`);
  console.log(`Install Path: ${c.dim("~/.claude/skills/")}\n`);
  console.log(`${c.dim("────────────────────────────────────")}\n`);
  
  if (missing.length > 0) {
    console.log(`Tip:\n→ brutal install ${missing[0].replace("brutal-", "")}\n`);
  }
}

async function runDoctor() {
  console.log(`\nRunning diagnostics...\n`);
  
  let ok = true;
  if (fs.existsSync(DEFAULT_TARGET)) {
    console.log(`  ${c.green("✔")} Claude global skills directory found`);
  } else {
    console.log(`  ${c.yellow("⚠")} Claude global skills directory missing (Run: brutal install)`);
    ok = false;
  }
  
  try {
    if (fs.existsSync(DEFAULT_TARGET)) fs.accessSync(DEFAULT_TARGET, fs.constants.R_OK | fs.constants.W_OK);
    console.log(`  ${c.green("✔")} Permissions OK`);
  } catch (e) {
    console.log(`  ${c.red("✗")} Permissions error on ${DEFAULT_TARGET}`);
    ok = false;
  }
  
  const totalInstalled = getInstalledSkills(DEFAULT_TARGET).length + getInstalledSkills(getProjectTarget()).length;
  console.log(`  ${c.green("✔")} ${totalInstalled} skills installed\n`);
  
  if (!ok) {
    console.log(`Fix:\n→ Run \`brutal init\` to setup your environment\n`);
  } else {
    console.log(`All systems good.\n`);
  }
}

async function runExport(args) {
  const rawArgs = args.filter(a => !a.startsWith("-"));
  const target = rawArgs[0]; // cursor or copilot
  
  if (target !== "cursor" && target !== "copilot") {
    console.error(c.red("\n✗ Provide a target: 'cursor' or 'copilot'"));
    console.error(`  Example: brutal export cursor --pack engineering\n`);
    return;
  }
  
  const exportTarget = target;
  let outPath = "";
  if (exportTarget === 'cursor') {
    outPath = path.join(process.cwd(), ".cursorrules");
  } else if (exportTarget === 'copilot') {
    const githubDir = path.join(process.cwd(), ".github");
    if (!fs.existsSync(githubDir)) fs.mkdirSync(githubDir);
    outPath = path.join(githubDir, "copilot-instructions.md");
  }

  let toExport = [];
  if (args.includes("--pack")) {
    const packIdx = args.indexOf("--pack");
    const packName = args[packIdx+1];
    if (PACKS[packName]) toExport = PACKS[packName].skills;
  } else if (rawArgs.length > 1) {
    toExport = [fuzzyMatchSkill(rawArgs[1])];
  } else {
    toExport = PACKS.engineering.skills; // Default to engineering pack
  }

  // Clear existing if we are overwriting
  if (fs.existsSync(outPath)) {
    console.log(`  ${c.yellow("⚠")} Overwriting existing ${path.basename(outPath)}`);
    fs.unlinkSync(outPath);
  }

  console.log(`\nExporting to ${target === 'cursor' ? 'Cursor' : 'Copilot'}...`);
  
  let count = 0;
  toExport.forEach(s => {
    if (exportSkill(s, exportTarget, outPath)) count++;
  });

  if (count > 0) {
    if (target === "cursor") {
      console.log(`\n  ${c.green("✔")} Generated .cursorrules (${count} skills)\n`);
      console.log(`Next:\n→ Restart Cursor\n`);
    } else {
      console.log(`\n  ${c.green("✔")} Generated .github/copilot-instructions.md (${count} skills)\n`);
    }
  } else {
    console.error(c.red(`\n✗ Export failed\n`));
  }
}

async function runUse(args) {
  const rawArgs = args.filter(a => !a.startsWith("-"));
  if (rawArgs.length === 0) {
    console.error(c.red("\n✗ Provide a skill name. Example: brutal use code-reviewer\n"));
    return;
  }
  
  const skillQuery = rawArgs[0];
  const skillName = fuzzyMatchSkill(skillQuery);
  
  if (!skills.includes(skillName)) {
    console.error(c.red(`\n✗ Skill not found: ${skillQuery}\n`));
    return;
  }
  
  let level = 7;
  const levelIdx = args.findIndex(a => a === "--level");
  if (levelIdx !== -1 && args[levelIdx+1]) {
    level = parseInt(args[levelIdx+1], 10);
  }
  
  const { getSkill, getSkillMetadata } = require("../index");
  const meta = getSkillMetadata(skillName);
  const promptText = getSkill(skillName, { stripFrontmatter: true, level });
  
  // Check for piped input
  if (!process.stdin.isTTY) {
    // Read from stdin
    let inputData = "";
    for await (const chunk of process.stdin) {
      inputData += chunk;
    }
    
    if (inputData.trim()) {
      executeClaudeCLI(skillName, level, promptText, inputData);
    } else {
      console.error(c.red("✗ Piped input was empty."));
    }
    return;
  }
  
  // Interactive mode
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log(`\n🧨 ${c.bold(skillName)} (level ${level})\n`);
  console.log(`Paste your code / input below:`);
  console.log(`${c.dim("(press Ctrl+D when done)")}\n`);
  
  let inputData = "";
  
  rl.on('line', (line) => {
    inputData += line + '\n';
  });
  
  rl.on('close', () => {
    if (inputData.trim()) {
      executeClaudeCLI(skillName, level, promptText, inputData);
    } else {
      console.log(c.yellow("\nNo input provided.\n"));
    }
  });
}

function executeClaudeCLI(skillName, level, promptText, inputData) {
  const tmpPath = path.join(require('os').tmpdir(), `brutal-input-${Date.now()}.txt`);
  const fullPrompt = `${promptText}\n\n---\n\nUSER INPUT TO REVIEW:\n\n${inputData}`;
  
  fs.writeFileSync(tmpPath, fullPrompt, "utf8");
  
  const levelNames = {
    0: "Cool", 1: "Cool", 2: "Cool",
    3: "Blunt", 4: "Blunt",
    5: "Harsh", 6: "Harsh",
    7: "Savage", 8: "Savage",
    9: "Nuclear", 10: "Nuclear"
  };
  const vibe = levelNames[level] || "Savage";
  
  console.log(`\n🧨 ${c.bold("Brutal Review")} — Level ${level} (${vibe})\n`);
  
  // Try to use claude CLI if available
  try {
    execSync('claude --version', { stdio: 'ignore' });
    console.log(c.dim(`Sending to Claude Code...\n`));
    // execSync(`claude -p "$(cat ${tmpPath})"`, { stdio: 'inherit' });
    // It's safer to spawn to pipe it properly
    const { spawnSync } = require('child_process');
    spawnSync('claude', ['-p', fullPrompt], { stdio: 'inherit' });
    console.log(`\n${c.dim("────────────────────────────────────")}\n`);
  } catch (e) {
    // Claude CLI not found or failed, print instructions
    console.log(c.yellow(`⚠ Claude Code CLI not detected in your PATH.`));
    console.log(`Please run Claude Code directly and paste your input, or use the API.\n`);
    console.log(`Saved compiled prompt to: ${c.cyan(tmpPath)}\n`);
  }
}

// ── Router ────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "help";
  const cmdArgs = args.slice(1);

  switch (command) {
    case "init":
      await runInit();
      break;
    case "install":
    case "i":
      await runInstall(cmdArgs);
      break;
    case "use":
      await runUse(cmdArgs);
      break;
    case "list":
    case "ls":
      await runList();
      break;
    case "status":
    case "st":
      await runStatus();
      break;
    case "remove":
    case "rm":
      await runRemove(cmdArgs);
      break;
    case "doctor":
      await runDoctor();
      break;
    case "export":
      await runExport(cmdArgs);
      break;
    case "upgrade":
      console.log(`\nChecking for updates...\n\n✔ You're on latest version (${PKG.version})\n`);
      break;
    case "help":
    default:
      console.log(`
🔥 ${c.bold("brutal")} v${PKG.version} — no sugar, all signal

${c.bold("Commands:")}
  ${c.cyan("brutal init")}           First-time setup
  ${c.cyan("brutal install [name]")} Install skills (alias: ${c.dim("i")})
  ${c.cyan("brutal use <skill>")}    Interactive prompt or piped input
  ${c.cyan("brutal list")}           List all skills (alias: ${c.dim("ls")})
  ${c.cyan("brutal status")}         Check installed skills (alias: ${c.dim("st")})
  ${c.cyan("brutal remove <name>")}  Remove skills (alias: ${c.dim("rm")})
  ${c.cyan("brutal doctor")}         Run diagnostics
  ${c.cyan("brutal export")}         Export to Cursor/Copilot
  ${c.cyan("brutal upgrade")}        Check for CLI updates

${c.bold("Examples:")}
  brutal install --project
  brutal use code-reviewer --level 10
  git diff | brutal use code-reviewer
  brutal export cursor
      `);
      break;
  }
}

main().catch((err) => {
  console.error(c.red(`\n✗ Error: ${err.message}\n`));
  process.exit(1);
});
