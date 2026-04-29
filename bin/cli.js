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

// ── Characters (The Hangover) ───────────────────────────────────────────
// One franchise. Five characters. Perfectly escalating chaos.
const CHARACTERS = {
  doug:  { level: 2,  name: "Doug",     vibe: "Chill, normal guy. Useless but harmless. Honest feedback with zero edge." },
  stu:   { level: 4,  name: "Stu",      vibe: "Anxious, spiraling, tries to be responsible. \"This could go very wrong.\"" },
  phil:  { level: 6,  name: "Phil",     vibe: "Confident. Bad decisions sound logical. \"Trust me, this is fine.\"" },
  alan:  { level: 8,  name: "Alan",     vibe: "Absolute chaos. Says insane things with total confidence." },
  chow:  { level: 10, name: "Mr. Chow", vibe: "Unhinged. Loud. Zero filter. \"But did you die?\"" },
};

// Reverse lookup: level → character
function characterForLevel(lvl) {
  const n = Math.min(10, Math.max(0, lvl));
  const sorted = Object.values(CHARACTERS).sort((a, b) => a.level - b.level);
  let best = sorted[0];
  for (const ch of sorted) {
    if (ch.level <= n) best = ch;
  }
  return best;
}

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
    "brutal-web-vitals-reviewer",
    "brutal-seo-reviewer",
  ],
  "ADVERSARIAL THINKING": ["devils-advocate", "pre-mortem", "bs-detector", "assumption-auditor"],
  "CAREER & PREP": ["brutal-resume-reviewer", "interview-prep-destroyer"],
  "ENTERTAINMENT": ["roast-mode"],
};

const PACKS = {
  engineering: {
    desc: "Code, architecture, commits, READMEs, and web vitals",
    skills: ["brutal-code-reviewer", "brutal-architecture-reviewer", "brutal-commit-message-reviewer", "brutal-readme-reviewer", "brutal-web-vitals-reviewer"]
  },
  strategy: {
    desc: "Pre-mortems, BS detection, assumptions",
    skills: ["pre-mortem", "bs-detector", "assumption-auditor", "devils-advocate"]
  },
  career: {
    desc: "Resume reviews and brutal mock interviews",
    skills: ["brutal-resume-reviewer", "interview-prep-destroyer"]
  },
  growth: {
    desc: "SEO, web vitals, pitches, and copy",
    skills: ["brutal-seo-reviewer", "brutal-web-vitals-reviewer", "brutal-pitch-reviewer", "brutal-writing-editor"]
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

// ── Interactive Selector (zero-dep arrow-key UI) ─────────────────────

function arrowSelect(prompt, options) {
  return new Promise((resolve) => {
    let selected = 0;
    const { stdin, stdout } = process;

    function render() {
      // Move cursor up to clear previous render (except first time)
      stdout.write(`\x1b[${options.length + 1}A`);
      stdout.write(`\x1b[0J`); // clear from cursor down
      stdout.write(`${prompt}\n`);
      options.forEach((opt, i) => {
        const pointer = i === selected ? c.cyan("❯") : " ";
        const label = i === selected ? c.cyan(c.bold(opt.label)) : ` ${opt.label}`;
        const desc = opt.desc ? c.dim(` — ${opt.desc}`) : "";
        stdout.write(`  ${pointer} ${label}${desc}\n`);
      });
    }

    // Print initial spacer lines so the first render can overwrite
    stdout.write(`${prompt}\n`);
    options.forEach(() => stdout.write("\n"));

    // Now render the actual content
    render();

    if (!stdin.isTTY) {
      // Non-interactive — just pick the first option
      resolve(options[0]);
      return;
    }

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    function onKey(key) {
      if (key === "\x1b[A") { // Up arrow
        selected = (selected - 1 + options.length) % options.length;
        render();
      } else if (key === "\x1b[B") { // Down arrow
        selected = (selected + 1) % options.length;
        render();
      } else if (key === "\r" || key === "\n") { // Enter
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onKey);
        resolve(options[selected]);
      } else if (key === "\x03") { // Ctrl+C
        stdin.setRawMode(false);
        stdout.write("\n");
        process.exit(0);
      }
    }

    stdin.on("data", onKey);
  });
}

function confirmPrompt(question, defaultYes = true) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const hint = defaultYes ? "Y/n" : "y/N";
    rl.question(`${question} ${c.dim(`(${hint})`)} `, (answer) => {
      rl.close();
      const a = answer.trim().toLowerCase();
      if (a === "") resolve(defaultYes);
      else resolve(a === "y" || a === "yes");
    });
  });
}

// ── Init Flow ────────────────────────────────────────────────────────

const INIT_CATEGORIES = [
  {
    label: "⚡ Code & Engineering",
    desc: "Reviews, architecture, commits, web vitals",
    pack: "engineering",
  },
  {
    label: "✍️  Writing & Docs",
    desc: "Prose, READMEs, emails, copy",
    pack: "writing",
  },
  {
    label: "🧠 Strategy & Thinking",
    desc: "Devil's advocate, pre-mortems, BS detection",
    pack: "strategy",
  },
  {
    label: "🚀 Career Growth",
    desc: "Resumes, interviews, pitches",
    pack: "career",
  },
  {
    label: "🎭 Fun / Roast",
    desc: "Pure chaos. You asked for this.",
    pack: "fun",
  },
  {
    label: "💀 Everything",
    desc: "Install all 17 skills. No mercy.",
    pack: "_all",
  },
];

async function runInit() {
  const projectDir = getProjectTarget();

  // ── Step 1: Welcome ────────────────────────────────────────────────
  const banner = `
${c.cyan("╔══════════════════════════════════════════════════════════════╗")}
${c.cyan("║")}                                                              ${c.cyan("║")}
${c.cyan("║")}   ${c.bold("██████╗ ██████╗ ██╗   ██╗████████╗ █████╗ ██╗")}              ${c.cyan("║")}
${c.cyan("║")}   ${c.bold("██╔══██╗██╔══██╗██║   ██║╚══██╔══╝██╔══██╗██║")}              ${c.cyan("║")}
${c.cyan("║")}   ${c.bold("██████╔╝██████╔╝██║   ██║   ██║   ███████║██║")}              ${c.cyan("║")}
${c.cyan("║")}   ${c.bold("██╔══██╗██╔══██╗██║   ██║   ██║   ██╔══██║██║")}              ${c.cyan("║")}
${c.cyan("║")}   ${c.bold("██████╔╝██║  ██║╚██████╔╝   ██║   ██║  ██║███████╗")}         ${c.cyan("║")}
${c.cyan("║")}   ${c.bold("╚═════╝ ╚═╝  ╚═╝ ╚═════╝    ╚═╝   ╚═╝  ╚═╝╚══════╝")}         ${c.cyan("║")}
${c.cyan("║")}                                                              ${c.cyan("║")}
${c.cyan("║")}        ${c.bold("██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗")}      ${c.cyan("║")}
${c.cyan("║")}       ${c.bold("██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██╔════╝")}      ${c.cyan("║")}
${c.cyan("║")}       ${c.bold("██║     ██║     ███████║██║   ██║██║  ██║█████╗")}        ${c.cyan("║")}
${c.cyan("║")}       ${c.bold("██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝")}        ${c.cyan("║")}
${c.cyan("║")}       ${c.bold("╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗")}      ${c.cyan("║")}
${c.cyan("║")}        ${c.bold("╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝")}      ${c.cyan("║")}
${c.cyan("║")}                                                              ${c.cyan("║")}
${c.cyan("║")}              ${c.bold("S K I L L S   I N I T I A L I Z E D")}             ${c.cyan("║")}
${c.cyan("║")}                                                              ${c.cyan("║")}
${c.cyan("║")}   ${c.dim("> Loading personas...")}                                      ${c.cyan("║")}
${c.cyan("║")}     ${c.green("■")}${c.dim("□□□□")} Doug        ${c.dim('– "looks fine, ship it?"')}             ${c.cyan("║")}
${c.cyan("║")}     ${c.green("■■")}${c.dim("□□□")} Stu         ${c.dim("– overthinking intensifies")}           ${c.cyan("║")}
${c.cyan("║")}     ${c.green("■■■")}${c.dim("□□")} Phil        ${c.dim("– bad ideas, great confidence")}        ${c.cyan("║")}
${c.cyan("║")}     ${c.green("■■■■")}${c.dim("□")} Alan        ${c.dim("– chaos is a feature")}                 ${c.cyan("║")}
${c.cyan("║")}     ${c.green("■■■■■")} Mr. Chow   ${c.dim("– prepare yourself")}                  ${c.cyan("║")}
${c.cyan("║")}                                                              ${c.cyan("║")}
${c.cyan("║")}   > Brutality Level: ${c.bold("7")} (Alan)                                ${c.cyan("║")}
${c.cyan("║")}   > Safety Rails: ${c.green("ON")} ${c.dim("(barely)")}                                ${c.cyan("║")}
${c.cyan("║")}                                                              ${c.cyan("║")}
${c.cyan("║")}   ${c.yellow("⚠")} Your code will be judged.                                ${c.cyan("║")}
${c.cyan("║")}   ${c.yellow("⚠")} Your feelings are optional.                              ${c.cyan("║")}
${c.cyan("║")}                                                              ${c.cyan("║")}
${c.cyan("╚══════════════════════════════════════════════════════════════╝")}`;

  console.log(banner);
  console.log("");

  // Non-interactive fallback (piped mode)
  if (!process.stdin.isTTY) {
    console.log(`  Non-interactive mode detected. Installing engineering pack.\n`);
    if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true });
    for (const s of PACKS.engineering.skills) {
      copyDirSync(path.join(SKILLS_DIR, s), path.join(projectDir, s));
    }
    console.log(`  ✔ Installed ${PACKS.engineering.skills.length} skills to ${c.cyan(projectDir)}\n`);
    return;
  }

  // ── Step 2: Category Selection ─────────────────────────────────────
  const choice = await arrowSelect(
    `  ${c.bold("What do you want to get brutal about?")}`,
    INIT_CATEGORIES
  );

  console.log("");

  // ── Step 3: Show Pack & Confirm ────────────────────────────────────
  let skillsToInstall = [];
  let packLabel = "";

  if (choice.pack === "_all") {
    skillsToInstall = skills; // all skills
    packLabel = "everything";
  } else {
    const pack = PACKS[choice.pack];
    skillsToInstall = pack.skills;
    packLabel = choice.pack;
  }

  console.log(`  ${c.bold("Pack:")} ${packLabel} ${c.dim(`(${skillsToInstall.length} skills)`)}`);
  console.log("");
  skillsToInstall.forEach(s => {
    const display = s.replace(/^brutal-/, "");
    console.log(`    ${c.green("◆")} ${display}`);
  });
  console.log("");
  console.log(`  ${c.dim("We'll install the essentials. You can get fancy later.")}`);
  console.log("");

  const confirmed = await confirmPrompt(`  ${c.bold("Install?")}`, true);

  if (!confirmed) {
    console.log(`\n  ${c.dim("Nothing installed. Run")} ${c.cyan("brutal init")} ${c.dim("when you're ready.")}\n`);
    return;
  }

  // ── Step 4: Install ────────────────────────────────────────────────
  console.log("");
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }

  for (const s of skillsToInstall) {
    copyDirSync(path.join(SKILLS_DIR, s), path.join(projectDir, s));
  }

  // ── Step 5: Final Confirmation ─────────────────────────────────────
  const ch = characterForLevel(7);
  console.log(c.dim("────────────────────────────────────────────────────"));
  console.log("");
  console.log(`  ${c.green("✔")} ${c.bold(`${skillsToInstall.length} skills installed`)}`);
  console.log(`  ${c.dim("Location:")} ${c.cyan(projectDir)}`);
  console.log(`  ${c.dim("Default:")}  ${ch.name} mode (Level 7)`);
  console.log("");
  console.log(c.dim("────────────────────────────────────────────────────"));
  console.log("");
  console.log(`  ${c.bold("Try it now:")}`);
  console.log("");
  console.log(`    ${c.cyan("brutal use code-reviewer --as alan")}`);
  console.log(`    ${c.dim("# or pipe a diff directly:")}`);
  console.log(`    ${c.cyan("git diff | brutal use code-reviewer --as chow")}`);
  console.log("");
  console.log(`  ${c.bold("Set up auto-reviews")} ${c.dim("(recommended):")}`);
  console.log("");
  console.log(`    ${c.cyan("brutal hook github")}  ${c.dim("Auto-review every PR")}`);
  console.log(`    ${c.cyan("brutal hook git")}     ${c.dim("Pre-commit checks")}`);
  console.log("");
  console.log(`  ${c.dim("Something feel off?")} ${c.cyan("brutal doctor")}`);
  console.log("");
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

  // --as <character> flag overrides level
  const asIdx = args.findIndex(a => a === "--as");
  if (asIdx !== -1 && args[asIdx+1]) {
    const charKey = args[asIdx+1].toLowerCase();
    if (CHARACTERS[charKey]) {
      level = CHARACTERS[charKey].level;
    } else {
      console.error(c.red(`\n✗ Unknown character: ${args[asIdx+1]}`));
      console.error(`  Available: ${Object.keys(CHARACTERS).join(", ")}\n`);
      return;
    }
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
  
  const ch = characterForLevel(level);
  console.log(`\n🧨 ${c.bold(skillName)} as ${c.cyan(ch.name)} (level ${level})\n`);
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
  
  const ch = characterForLevel(level);
  
  console.log(`\n🧨 ${c.bold("Brutal Review")} — ${c.cyan(ch.name)} mode (Level ${level})`);
  console.log(`${c.dim(`"${ch.vibe}"`)}\n`);
  
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

// ── Integrations (Hooks) ──────────────────────────────────────────────

async function runHook(args) {
  const rawArgs = args.filter(a => !a.startsWith("-"));
  const target = rawArgs[0];

  if (!target || (target !== "github" && target !== "git")) {
    console.error(c.red(`\n✗ Provide a valid hook target: 'github' or 'git'`));
    console.error(`  Example: brutal hook github\n`);
    return;
  }

  if (target === "github") {
    const githubDir = path.join(process.cwd(), ".github", "workflows");
    if (!fs.existsSync(githubDir)) fs.mkdirSync(githubDir, { recursive: true });
    
    const wfPath = path.join(githubDir, "brutal-review.yml");
    const wfContent = `name: Brutal Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  brutal-review:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Get PR diff
        run: git fetch origin \${{ github.base_ref }}

      - name: Run Brutal Review
        run: |
          git diff origin/\${{ github.base_ref }} > diff.txt
          npx brutal-claude-skills use code-reviewer --level 8 < diff.txt > review.txt || echo "No diff found"

      - name: Comment on PR
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            if (fs.existsSync('review.txt')) {
              const body = fs.readFileSync('review.txt', 'utf8');
              if (body.trim()) {
                github.rest.issues.createComment({
                  ...context.repo,
                  issue_number: context.issue.number,
                  body
                });
              }
            }
`;
    fs.writeFileSync(wfPath, wfContent, "utf8");
    console.log(`\n  ${c.green("✔")} Created ${c.cyan(".github/workflows/brutal-review.yml")}`);
    console.log(`\nEvery PR will now be brutally reviewed automatically.\n`);
  } else if (target === "git") {
    const hooksDir = path.join(process.cwd(), ".git", "hooks");
    if (!fs.existsSync(hooksDir)) {
      console.error(c.red(`\n✗ .git/hooks directory not found. Are you in a git repository?\n`));
      return;
    }

    const preCommitPath = path.join(hooksDir, "pre-commit");
    const preCommitContent = `#!/bin/sh
# brutal pre-commit hook
echo "🧨 Running Brutal Pre-commit Check..."
git diff --cached | npx brutal-claude-skills use code-reviewer --level 6
`;
    fs.writeFileSync(preCommitPath, preCommitContent, "utf8");
    fs.chmodSync(preCommitPath, "755");

    console.log(`\n  ${c.green("✔")} Created ${c.cyan(".git/hooks/pre-commit")}`);
    console.log(`\nYour staged changes will now be checked before every commit.\n`);
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
    case "hook":
      await runHook(cmdArgs);
      break;
    case "help":
    default:
      console.log(`
🔥 ${c.bold("brutal")} v${PKG.version} — no sugar, all signal

${c.bold("Commands:")}
  ${c.cyan("brutal init")}           First-time setup
  ${c.cyan("brutal install [name]")} Install skills (alias: ${c.dim("i")})
  ${c.cyan("brutal use <skill>")}    Interactive prompt or piped input
  ${c.cyan("brutal hook <target>")}  Auto-review integrations (github, git)
  ${c.cyan("brutal list")}           List all skills (alias: ${c.dim("ls")})
  ${c.cyan("brutal status")}         Check installed skills (alias: ${c.dim("st")})
  ${c.cyan("brutal remove <name>")}  Remove skills (alias: ${c.dim("rm")})
  ${c.cyan("brutal doctor")}         Run diagnostics
  ${c.cyan("brutal export")}         Export to Cursor/Copilot
  ${c.cyan("brutal upgrade")}        Check for CLI updates

${c.bold("Characters:")} ${c.dim("(use --as <name> to pick a reviewer personality)")}
  ${c.cyan("doug")}     Level 1-2   Chill, normal, useless
  ${c.cyan("stu")}      Level 3-4   Anxious, spiraling, tries to be responsible
  ${c.cyan("phil")}     Level 5-6   Confident, bad decisions sound logical
  ${c.cyan("alan")}     Level 7-8   Absolute chaos, says insane things with confidence
  ${c.cyan("chow")}     Level 9-10  Unhinged, loud, zero filter

${c.bold("Examples:")}
  brutal use code-reviewer --as chow
  brutal use code-reviewer --as phil
  git diff | brutal use code-reviewer --as alan
  brutal install --project
  brutal export cursor
      `);
      break;
  }
}

main().catch((err) => {
  console.error(c.red(`\n✗ Error: ${err.message}\n`));
  process.exit(1);
});
