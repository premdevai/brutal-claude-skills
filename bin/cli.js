#!/usr/bin/env node

/**
 * 💥 brutal-review v1 CLI
 * No sugar, all signal.
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { execSync } = require("child_process");

// We'll require the core logic later, but for now let's set up the router.
const SKILLS_DIR = path.join(__dirname, "..", "skills");
const HOOKS_DIR = path.join(__dirname, "hooks");
const PKG = require("../package.json");
const NPM_PKG = PKG.name;
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

// ── Config & Persona System ───────────────────────────────────────────

const CONFIG_PATH = path.join(
  process.env.HOME || process.env.USERPROFILE || "",
  ".brutal",
  "config.json"
);

const DEFAULT_CONFIG = {
  defaultPersona: "Alan",
  brutality: 7,
  hasSeenOnboarding: false,
  asciiMode: "minimal",
  personas: {
    doug:  { level: 2,  name: "Doug",     vibe: "Chill, normal guy. Useless but harmless. Honest feedback with zero edge.", active: true },
    stu:   { level: 4,  name: "Stu",      vibe: 'Anxious, spiraling, tries to be responsible. "This could go very wrong."', active: true },
    phil:  { level: 6,  name: "Phil",     vibe: 'Confident. Bad decisions sound logical. "Trust me, this is fine."', active: true },
    alan:  { level: 8,  name: "Alan",     vibe: "Absolute chaos. Says insane things with total confidence.", active: true },
    chow:  { level: 10, name: "Mr. Chow", vibe: 'Unhinged. Loud. Zero filter. "But did you die?"', active: true }
  }
};

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  try {
    const data = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    return { ...DEFAULT_CONFIG, ...data, personas: { ...DEFAULT_CONFIG.personas, ...(data.personas || {}) } };
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }
}

function saveConfig(config) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
}

let BRUTAL_CONFIG = loadConfig();

function getActivePersonas() {
  const active = {};
  for (const [k, v] of Object.entries(BRUTAL_CONFIG.personas)) {
    if (v.active) active[k] = v;
  }
  return active;
}

// Reverse lookup: level → character
function characterForLevel(lvl) {
  const active = getActivePersonas();
  const n = Math.min(10, Math.max(0, lvl));
  const sorted = Object.values(active).sort((a, b) => a.level - b.level);
  if (sorted.length === 0) return { name: "Unknown", level: n, vibe: "No active personas." };
  let best = sorted[0];
  for (const ch of sorted) {
    if (ch.level <= n) best = ch;
  }
  return best;
}

const CATEGORIES = {
  "CRITICS": [
    "code-quality-review",
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
    skills: ["code-quality-review", "brutal-code-reviewer", "brutal-architecture-reviewer", "brutal-commit-message-reviewer", "brutal-readme-reviewer", "brutal-web-vitals-reviewer"]
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
        const pointer = i === selected ? c.cyan("›") : " ";
        const label = i === selected ? c.cyan(`${i + 1}. ${opt.label}`) : `  ${i + 1}. ${opt.label}`;
        stdout.write(`  ${pointer} ${label}\n`);
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
      } else if (key >= "1" && key <= String(options.length)) {
        selected = parseInt(key, 10) - 1;
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
  { label: "Code & Engineering", pack: "engineering" },
  { label: "Writing & Docs", pack: "writing" },
  { label: "Strategy & Thinking", pack: "strategy" },
  { label: "Career Growth", pack: "career" },
  { label: "Fun / Roast", pack: "fun" },
  { label: "Everything", pack: "_all" }
];

async function runInit() {
  const projectDir = getProjectTarget();

  const args = process.argv.slice(2);
  const forceAscii = args.includes("--force-ascii");

  // ── Step 1: Welcome ────────────────────────────────────────────────
  if (forceAscii || (!BRUTAL_CONFIG.hasSeenOnboarding && BRUTAL_CONFIG.asciiMode !== "off")) {
    const banner = `
  ${c.cyan("██████╗ ██████╗ ██╗   ██╗████████╗ █████╗ ██╗     ")}
  ${c.cyan("██╔══██╗██╔══██╗██║   ██║╚══██╔══╝██╔══██╗██║     ")}
  ${c.cyan("██████╔╝██████╔╝██║   ██║   ██║   ███████║██║     ")}
  ${c.cyan("██╔══██╗██╔══██╗██║   ██║   ██║   ██╔══██║██║     ")}
  ${c.cyan("██████╔╝██║  ██║╚██████╔╝   ██║   ██║  ██║███████╗")}
  ${c.cyan("╚═════╝ ╚═╝  ╚═╝ ╚═════╝    ╚═╝   ╚═╝  ╚═╝╚══════╝")}
`;
    console.log(banner);
    console.log(`  ${c.dim("brutal — adversarial skills loaded")}\n`);
    BRUTAL_CONFIG.hasSeenOnboarding = true;
    saveConfig(BRUTAL_CONFIG);
  } else {
    console.log(`\n  ${c.dim("brutal init")}\n`);
  }

  // Non-interactive fallback (piped mode)
  if (!process.stdin.isTTY) {
    console.log(`  loading personas... done`);
    console.log(`  config loaded (brutality: ${BRUTAL_CONFIG.brutality})\n`);
    if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true });
    for (const s of PACKS.engineering.skills) {
      copyDirSync(path.join(SKILLS_DIR, s), path.join(projectDir, s));
    }
    console.log(`  ✔ Installed ${PACKS.engineering.skills.length} skills to ${c.cyan(projectDir)}\n`);
    return;
  }

  console.log(`  loading personas... done`);
  console.log(`  config loaded (brutality: ${BRUTAL_CONFIG.brutality})\n`);

  console.log(`  ${c.dim("personas:")}`);
  const activePersonas = getActivePersonas();
  Object.values(activePersonas).forEach(p => {
    console.log(`    ${c.dim("-")} ${p.name.padEnd(8)} ${c.dim(`(lvl ${p.level})`)}`);
  });
  console.log("");

  console.log(`  ${c.yellow("warning:")}`);
  console.log(`    Your code will be judged.`);
  console.log(`    Your feelings are optional.\n`);

  // ── Step 2: Category Selection ─────────────────────────────────────
  const choice = await arrowSelect(
    `  What do you want to get brutal about?`,
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
  console.log(`    ${c.cyan("brutal hook git --all")}    ${c.dim("commit-msg + pre-commit + pre-push")}`);
  console.log(`    ${c.cyan("brutal hook github")}       ${c.dim("Auto-review every PR (GitHub Actions)")}`);
  console.log("");
  console.log(`  ${c.dim("Something feel off?")} ${c.cyan("brutal doctor")}`);
  console.log("");

  // ── Step 6: Post-Install PATH Check ────────────────────────────────
  try {
    execSync('command -v brutal', { stdio: 'ignore' });
  } catch (e) {
    console.log(`  ${c.yellow("⚠")} ${c.bold("brutal")} command not found in PATH.`);
    console.log(`  To fix this, you can install globally:`);
    console.log(`    ${c.cyan("npm i -g brutal-review")}`);
    console.log(`  Or use npx instead:`);
    console.log(`    ${c.cyan("npx brutal-review use ...")}\n`);
    
    if (process.stdin.isTTY) {
      const wantAlias = await confirmPrompt(`  Add an alias (brutal="npx brutal-review") to your shell?`, true);
      if (wantAlias) {
        const shell = process.env.SHELL || '';
        let rcFile = '';
        if (shell.includes('zsh')) rcFile = path.join(process.env.HOME || process.env.USERPROFILE || '', '.zshrc');
        else if (shell.includes('bash')) rcFile = path.join(process.env.HOME || process.env.USERPROFILE || '', '.bashrc');
        
        if (rcFile && fs.existsSync(rcFile)) {
          fs.appendFileSync(rcFile, '\n# Brutal Review Alias\nalias brutal="npx brutal-review"\n');
          console.log(`  ${c.green("✔")} Added alias to ${rcFile}`);
          console.log(`  Run ${c.cyan(`source ${rcFile}`)} or restart your terminal.\n`);
        } else {
          console.log(`  ${c.red("✗")} Could not detect shell config file. Please add manually:\n  alias brutal="npx brutal-review"\n`);
        }
      }
    }
  }
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
  
  let level = BRUTAL_CONFIG.brutality || 7;
  const levelIdx = args.findIndex(a => a === "--level");
  if (levelIdx !== -1 && args[levelIdx+1]) {
    level = parseInt(args[levelIdx+1], 10);
  }

  // --persona <character> flag overrides level
  const personaIdx = args.findIndex(a => a === "--persona");
  const asIdx = args.findIndex(a => a === "--as");
  const pIdx = personaIdx !== -1 ? personaIdx : asIdx;
  if (pIdx !== -1 && args[pIdx+1]) {
    const charKey = args[pIdx+1].toLowerCase();
    if (BRUTAL_CONFIG.personas[charKey] && BRUTAL_CONFIG.personas[charKey].active) {
      level = BRUTAL_CONFIG.personas[charKey].level;
    } else {
      console.error(c.red(`\n✗ Unknown or inactive persona: ${args[pIdx+1]}`));
      console.error(`  Available: ${Object.keys(getActivePersonas()).join(", ")}\n`);
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
    if (line.trim().startsWith('/persona ')) {
      const charKey = line.trim().split(' ')[1].toLowerCase();
      if (BRUTAL_CONFIG.personas[charKey] && BRUTAL_CONFIG.personas[charKey].active) {
        level = BRUTAL_CONFIG.personas[charKey].level;
        const ch = characterForLevel(level);
        console.log(`\n🧨 Switched to ${c.cyan(ch.name)} (level ${level})\n`);
      } else {
        console.log(`\n✗ Unknown or inactive persona: ${charKey}\n`);
      }
      return;
    }
    if (line.trim().startsWith('/level ')) {
      const newLvl = parseInt(line.trim().split(' ')[1], 10);
      if (!isNaN(newLvl) && newLvl >= 0 && newLvl <= 10) {
        level = newLvl;
        const ch = characterForLevel(level);
        console.log(`\n🧨 Brutality level set to ${level} (Nearest persona: ${c.cyan(ch.name)})\n`);
      } else {
        console.log(`\n✗ Invalid level (must be 0-10).\n`);
      }
      return;
    }
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

// Written into every installed hook so we can detect and manage our own hooks
const BRUTAL_HOOK_SENTINEL = "# brutal-review managed hook";

function getGitHooksDir() {
  const hooksDir = path.join(process.cwd(), ".git", "hooks");
  if (!fs.existsSync(hooksDir)) return null;
  return hooksDir;
}

function installGitHook(hookName, scriptPath, hooksDir) {
  if (!fs.existsSync(scriptPath)) {
    console.log(`  ${c.red("✗")} Hook script not found: ${path.basename(scriptPath)}`);
    return false;
  }

  const destPath = path.join(hooksDir, hookName);
  const hookScript = `#!/bin/sh\n${BRUTAL_HOOK_SENTINEL}\nexec node "${scriptPath}" "$@"\n`;

  if (fs.existsSync(destPath)) {
    const existing = fs.readFileSync(destPath, "utf8");
    if (!existing.includes(BRUTAL_HOOK_SENTINEL)) {
      // Backup the existing hook and chain it
      const backupPath = destPath + ".brutal-backup";
      fs.copyFileSync(destPath, backupPath);
      console.log(`  ${c.yellow("⚠")}  Backed up existing ${hookName} → ${hookName}.brutal-backup`);
      const chainedScript = `#!/bin/sh\n${BRUTAL_HOOK_SENTINEL}\n# Run original hook first\n"${backupPath}" "$@"\nORIG_EXIT=$?\nif [ $ORIG_EXIT -ne 0 ]; then exit $ORIG_EXIT; fi\n# Then run brutal hook\nexec node "${scriptPath}" "$@"\n`;
      fs.writeFileSync(destPath, chainedScript, "utf8");
    } else {
      fs.writeFileSync(destPath, hookScript, "utf8");
    }
  } else {
    fs.writeFileSync(destPath, hookScript, "utf8");
  }

  fs.chmodSync(destPath, "755");
  return true;
}

function removeGitHook(hookName, hooksDir) {
  const destPath = path.join(hooksDir, hookName);
  if (!fs.existsSync(destPath)) {
    console.log(`  ${c.dim(`→ ${hookName} not installed`)}`);
    return;
  }

  const content = fs.readFileSync(destPath, "utf8");
  if (!content.includes(BRUTAL_HOOK_SENTINEL)) {
    console.log(`  ${c.yellow("⚠")}  ${hookName} exists but wasn't installed by brutal — skipping`);
    return;
  }

  const backupPath = destPath + ".brutal-backup";
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, destPath);
    fs.unlinkSync(backupPath);
    console.log(`  ${c.green("✔")} Restored original ${hookName}`);
  } else {
    fs.unlinkSync(destPath);
    console.log(`  ${c.green("✔")} Removed ${hookName}`);
  }
}

function buildGitHubActionsWorkflow(level) {
  return `name: Brutal Review

# Automated adversarial code review on every PR.
# Powered by ${NPM_PKG} (npmjs.com/package/${NPM_PKG})

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write

jobs:
  brutal-review:
    runs-on: ubuntu-latest
    name: Brutal Code Review (Level ${level})

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Get PR diff
        run: |
          git fetch origin \${{ github.base_ref }}
          git diff origin/\${{ github.base_ref }}...HEAD > pr-diff.txt

      - name: Run Brutal Review
        id: review
        run: |
          if [ ! -s pr-diff.txt ]; then
            echo "No diff found."
            echo "review_body=" >> $GITHUB_OUTPUT
            exit 0
          fi
          npx ${NPM_PKG}@latest use code-reviewer --level ${level} < pr-diff.txt > review.txt 2>&1 || true
          echo "review_body<<EOF" >> $GITHUB_OUTPUT
          cat review.txt >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: Post review comment
        if: steps.review.outputs.review_body != ''
        uses: actions/github-script@v7
        with:
          github-token: \${{ secrets.GITHUB_TOKEN }}
          script: |
            const body = \`## 🧨 Brutal Review (Level ${level})\n\n\` + process.env.REVIEW_BODY + \`\n\n---\n_Automated by [brutal-review](https://npmjs.com/package/${NPM_PKG})_\`;
            const comments = await github.rest.issues.listComments({ ...context.repo, issue_number: context.issue.number });
            for (const comment of comments.data) {
              if (comment.body.includes('Brutal Review') && comment.body.includes('brutal-review')) {
                await github.rest.issues.deleteComment({ ...context.repo, comment_id: comment.id });
              }
            }
            await github.rest.issues.createComment({ ...context.repo, issue_number: context.issue.number, body });
        env:
          REVIEW_BODY: \${{ steps.review.outputs.review_body }}
`;
}

async function runHook(args) {
  const rawArgs = args.filter(a => !a.startsWith("-"));
  const target = rawArgs[0];

  const wantCommitMsg  = args.includes("--commit-msg");
  const wantPreCommit  = args.includes("--pre-commit");
  const wantPrePush    = args.includes("--pre-push");
  const wantAll        = args.includes("--all") || (!wantCommitMsg && !wantPreCommit && !wantPrePush && target === "git");

  const levelIdx = args.indexOf("--level");
  const level = levelIdx !== -1 && args[levelIdx + 1] ? parseInt(args[levelIdx + 1], 10) : 8;

  // ── brutal hook uninstall ───────────────────────────────
  if (target === "uninstall") {
    const hooksDir = getGitHooksDir();
    if (!hooksDir) { console.error(c.red(`\n✗ Not inside a git repository.\n`)); return; }
    console.log(`\n  ${c.bold("Uninstalling brutal git hooks...")}\n`);
    removeGitHook("commit-msg", hooksDir);
    removeGitHook("pre-commit", hooksDir);
    removeGitHook("pre-push", hooksDir);
    console.log(`\n  ${c.dim("Done. Run brutal hook git to reinstall.")}\n`);
    return;
  }

  // ── brutal hook git ─────────────────────────────────────
  if (target === "git") {
    const hooksDir = getGitHooksDir();
    if (!hooksDir) {
      console.error(c.red(`\n✗ .git/hooks not found. Run this from inside a git repository.\n`));
      return;
    }

    const hooksToBuild = [];
    if (wantAll || wantCommitMsg) hooksToBuild.push({ name: "commit-msg", file: "commit-msg", desc: "Block lazy commit messages, suggest better ones" });
    if (wantAll || wantPreCommit) hooksToBuild.push({ name: "pre-commit", file: "pre-commit", desc: "Scan staged diff for secrets & code smells" });
    if (wantAll || wantPrePush)   hooksToBuild.push({ name: "pre-push",   file: "pre-push",   desc: "Guard against pushing to main & conflicts" });

    if (hooksToBuild.length === 0) {
      console.error(c.red(`\n✗ Specify hooks: --commit-msg, --pre-commit, --pre-push, or --all\n`));
      return;
    }

    console.log(`\n  🧨 ${c.bold("brutal hook git")}\n`);
    console.log(`  ${c.dim("Installing into:")} ${c.cyan(hooksDir)}\n`);
    hooksToBuild.forEach(h => console.log(`    ${c.green("◆")} ${h.name.padEnd(14)} ${c.dim(h.desc)}`));
    console.log("");

    if (process.stdin.isTTY) {
      const confirmed = await confirmPrompt(`  ${c.bold("Install hooks?")}`, true);
      if (!confirmed) { console.log(`\n  ${c.dim("Aborted.")}\n`); return; }
    }

    console.log("");
    let installed = 0;
    for (const hook of hooksToBuild) {
      const scriptPath = path.join(HOOKS_DIR, hook.file);
      if (installGitHook(hook.name, scriptPath, hooksDir)) {
        console.log(`  ${c.green("✔")} ${hook.name}`);
        installed++;
      }
    }

    console.log("");
    console.log(c.dim("────────────────────────────────────────────────────"));
    console.log("");
    console.log(`  ${c.green("✔")} ${c.bold(`${installed} hook(s) installed`)}`);
    console.log(`  ${c.dim("Location:")} ${c.cyan(hooksDir)}`);
    console.log("");
    if (hooksToBuild.find(h => h.name === "commit-msg"))
      console.log(`    ${c.cyan("commit-msg")}  Rejects lazy messages. Offers inline fix prompt.`);
    if (hooksToBuild.find(h => h.name === "pre-commit"))
      console.log(`    ${c.cyan("pre-commit")}  Blocks secrets. Warns on TODO/console.log/large diffs.`);
    if (hooksToBuild.find(h => h.name === "pre-push"))
      console.log(`    ${c.cyan("pre-push")}    Blocks direct pushes to main. Catches conflict markers.`);
    console.log("");
    console.log(`  ${c.dim("To uninstall:")} ${c.cyan("brutal hook uninstall")}`);
    console.log(`  ${c.dim("To skip once:")} ${c.cyan("git commit --no-verify")}`);
    console.log("");
    return;
  }

  // ── brutal hook github ──────────────────────────────────
  if (target === "github") {
    const githubDir = path.join(process.cwd(), ".github", "workflows");
    if (!fs.existsSync(githubDir)) fs.mkdirSync(githubDir, { recursive: true });
    const wfPath = path.join(githubDir, "brutal-review.yml");

    console.log(`\n  🧨 ${c.bold("brutal hook github")}\n`);
    console.log(`  ${c.dim("Generates:")} ${c.cyan(".github/workflows/brutal-review.yml")}`);
    console.log(`  ${c.dim("Brutality:")} Level ${level}\n`);

    if (fs.existsSync(wfPath)) console.log(`  ${c.yellow("⚠")}  Workflow already exists — overwriting.\n`);

    if (process.stdin.isTTY) {
      const confirmed = await confirmPrompt(`  ${c.bold("Create GitHub Actions workflow?")}`, true);
      if (!confirmed) { console.log(`\n  ${c.dim("Aborted.")}\n`); return; }
    }

    fs.writeFileSync(wfPath, buildGitHubActionsWorkflow(level), "utf8");

    console.log("");
    console.log(`  ${c.green("✔")} Created ${c.cyan(".github/workflows/brutal-review.yml")}`);
    console.log("");
    console.log(`  ${c.bold("What happens now:")}`);
    console.log(`    Every PR gets an automated brutal code review (Level ${level}) as a comment.`);
    console.log(`    Old reviews are deleted before posting — no comment spam.`);
    console.log("");
    console.log(`  ${c.bold("Next steps:")}`);
    console.log(`    ${c.cyan("git add .github/workflows/brutal-review.yml")}`);
    console.log(`    ${c.cyan('git commit -m "ci: add brutal code review workflow"')}`);
    console.log(`    ${c.cyan("git push")}`);
    console.log("");
    console.log(`  ${c.dim("Change level:")} ${c.cyan("brutal hook github --level 10")}`);
    console.log("");
    return;
  }

  // ── Help ────────────────────────────────────────────────
  console.log(`
  🧨 ${c.bold("brutal hook")} — plug into your entire dev cycle

  ${c.bold("Git hooks")} ${c.dim("(local, per-repo):")}
    ${c.cyan("brutal hook git")}              Install all 3 git hooks
    ${c.cyan("brutal hook git --commit-msg")} Block lazy commit messages
    ${c.cyan("brutal hook git --pre-commit")} Scan staged diff for secrets & smells
    ${c.cyan("brutal hook git --pre-push")}   Guard before pushing
    ${c.cyan("brutal hook uninstall")}         Remove all brutal git hooks

  ${c.bold("GitHub Actions")} ${c.dim("(CI, runs on every PR):")}
    ${c.cyan("brutal hook github")}            Default level 8
    ${c.cyan("brutal hook github --level 10")} Nuclear PR reviews

  ${c.bold("IDE integrations:")}
    ${c.cyan("brutal export cursor")}          Export to .cursorrules
    ${c.cyan("brutal export copilot")}         Export to .github/copilot-instructions.md
  `);
}

// ── Version / Upgrade ────────────────────────────────────────────────

async function fetchLatestVersion(pkgName) {
  return new Promise((resolve, reject) => {
    const https = require('https');
    const url = `https://registry.npmjs.org/${pkgName}/latest`;
    const req = https.get(url, { timeout: 8000 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.version);
        } catch (e) {
          reject(new Error('Failed to parse npm registry response'));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
  });
}

function semverGt(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}

async function runVersion() {
  console.log(`\n  ${c.bold('brutal-review')} ${c.cyan(`v${PKG.version}`)}\n`);
  console.log(`  ${c.dim('Checking latest on npm...')}`);
  try {
    const latest = await fetchLatestVersion(NPM_PKG);
    if (semverGt(latest, PKG.version)) {
      console.log(`  ${c.yellow('\u26a0')}  Update available: ${c.dim(`v${PKG.version}`)} \u2192 ${c.green(`v${latest}`)}`);
      console.log(`  Run ${c.cyan('brutal upgrade')} to update.\n`);
    } else {
      console.log(`  ${c.green('\u2714')}  You're on the latest version (${c.cyan(`v${PKG.version}`)})\n`);
    }
  } catch (e) {
    console.log(`  ${c.dim('(Could not reach npm registry — offline?)')}\n`);
  }
}

async function runUpgrade() {
  const current = PKG.version;
  console.log(`\n  ${c.bold('brutal upgrade')}\n`);
  console.log(`  Current:  ${c.cyan(`v${current}`)}`);
  console.log(`  ${c.dim('Checking npm for latest...')}`);

  let latest;
  try {
    latest = await fetchLatestVersion(NPM_PKG);
  } catch (e) {
    console.log(`\n  ${c.red('\u2717')}  Could not reach npm registry. Are you online?\n`);
    return;
  }

  console.log(`  Latest:   ${c.green(`v${latest}`)}\n`);

  if (!semverGt(latest, current)) {
    console.log(`  ${c.green('\u2714')}  Already up to date. Nothing to do.\n`);
    return;
  }

  console.log(`  ${c.yellow('\u26a0')}  New version available: ${c.dim(`v${current}`)} \u2192 ${c.green(`v${latest}`)}`);
  console.log('');

  if (process.stdin.isTTY) {
    const confirmed = await confirmPrompt(`  ${c.bold('Install update now?')}`, true);
    if (!confirmed) {
      console.log(`\n  ${c.dim('Upgrade skipped. Run')} ${c.cyan('brutal upgrade')} ${c.dim('when ready.')}\n`);
      return;
    }
  }

  console.log('');
  console.log(`  ${c.dim('Installing...')}`);
  try {
    execSync(`npm install -g ${NPM_PKG}@latest`, { stdio: 'inherit' });
    console.log('');
    console.log(`  ${c.green('\u2714')}  Updated to ${c.cyan(`v${latest}`)} — restart your terminal if the binary feels stale.\n`);
  } catch (e) {
    console.log('');
    console.log(`  ${c.red('\u2717')}  npm install failed. Try manually:`);
    console.log(`       ${c.cyan(`npm install -g ${NPM_PKG}@latest`)}\n`);
  }
}

// ── Router ────────────────────────────────────────────────────────────

async function runConfig(args) {
  const rawArgs = args.filter(a => !a.startsWith("-"));
  const subcmd = rawArgs[0];
  
  if (!subcmd) {
    console.log(JSON.stringify(BRUTAL_CONFIG, null, 2));
    return;
  }
  
  if (subcmd === "open") {
    console.log(`Config located at: ${c.cyan(CONFIG_PATH)}`);
    return;
  }
  
  if (subcmd === "set" && rawArgs.length === 3) {
    const key = rawArgs[1];
    let val = rawArgs[2];
    
    if (val === "true") val = true;
    else if (val === "false") val = false;
    else if (!isNaN(Number(val))) val = Number(val);
    
    BRUTAL_CONFIG[key] = val;
    saveConfig(BRUTAL_CONFIG);
    console.log(`  ${c.green("✔")} Set ${key} = ${val}`);
    return;
  }
  
  console.log(`Usage: brutal config [set <key> <value> | open]`);
}

async function runPersona(args) {
  const rawArgs = args.filter(a => !a.startsWith("-"));
  const subcmd = rawArgs[0];
  
  if (subcmd === "list" || !subcmd) {
    console.log(`\n  ${c.bold("Personas:")}\n`);
    for (const [key, p] of Object.entries(BRUTAL_CONFIG.personas)) {
      const status = p.active ? c.cyan("active") : c.dim("inactive");
      console.log(`    ${c.bold(p.name)} [${key}] - Level ${p.level} - ${status}`);
      console.log(`    ${c.dim(p.vibe)}\n`);
    }
    return;
  }
  
  if (subcmd === "set" && rawArgs.length === 2) {
    const name = rawArgs[1];
    if (BRUTAL_CONFIG.personas[name]) {
      BRUTAL_CONFIG.defaultPersona = name;
      BRUTAL_CONFIG.brutality = BRUTAL_CONFIG.personas[name].level;
      saveConfig(BRUTAL_CONFIG);
      console.log(`  ${c.green("✔")} Default persona set to ${name} (level ${BRUTAL_CONFIG.brutality})`);
    } else {
      console.error(`  ${c.red("✗")} Persona not found: ${name}`);
    }
    return;
  }
  
  if (subcmd === "toggle" && rawArgs.length === 2) {
    const name = rawArgs[1];
    if (BRUTAL_CONFIG.personas[name]) {
      BRUTAL_CONFIG.personas[name].active = !BRUTAL_CONFIG.personas[name].active;
      saveConfig(BRUTAL_CONFIG);
      const state = BRUTAL_CONFIG.personas[name].active ? "active" : "inactive";
      console.log(`  ${c.green("✔")} Persona ${name} is now ${state}`);
    } else {
      console.error(`  ${c.red("✗")} Persona not found: ${name}`);
    }
    return;
  }
  
  if (subcmd === "add" && rawArgs.length >= 4) {
    const key = rawArgs[1];
    const level = parseInt(rawArgs[2], 10);
    const name = rawArgs[3];
    const vibe = rawArgs.slice(4).join(" ") || "No vibe provided.";
    
    BRUTAL_CONFIG.personas[key] = { level, name, vibe, active: true };
    saveConfig(BRUTAL_CONFIG);
    console.log(`  ${c.green("✔")} Added persona ${name} [${key}] at level ${level}`);
    return;
  }
  
  console.log(`Usage: brutal persona [list | set <name> | toggle <name> | add <key> <level> <name> [vibe]]`);
}

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
    case "version":
    case "--version":
    case "-v":
      await runVersion();
      break;
    case "upgrade":
    case "update":
      await runUpgrade();
      break;
    case "hook":
      await runHook(cmdArgs);
      break;
    case "uninstall-hook":
      await runHook(["uninstall"]);
      break;
    case "config":
      await runConfig(cmdArgs);
      break;
    case "persona":
      await runPersona(cmdArgs);
      break;
    case "help":
    default:
      console.log(`
🔥 ${c.bold("brutal")} v${PKG.version} — no sugar, all signal

${c.bold("Commands:")}
  ${c.cyan("brutal init")}                First-time setup
  ${c.cyan("brutal install [name]")}      Install skills (alias: ${c.dim("i")})
  ${c.cyan("brutal use <skill>")}         Interactive prompt or piped input
  ${c.cyan("brutal hook git --all")}      Install all 3 git hooks
  ${c.cyan("brutal hook github")}         GitHub Actions PR review workflow
  ${c.cyan("brutal hook uninstall")}      Remove all brutal git hooks
  ${c.cyan("brutal export cursor")}       Export to .cursorrules
  ${c.cyan("brutal export copilot")}      Export to .github/copilot-instructions.md
  ${c.cyan("brutal config <cmd>")}        Manage settings (set, open)
  ${c.cyan("brutal persona <cmd>")}       Manage personas (list, set, toggle, add)
  ${c.cyan("brutal list")}               List all skills (alias: ${c.dim("ls")})
  ${c.cyan("brutal status")}             Check installed skills (alias: ${c.dim("st")})
  ${c.cyan("brutal remove <name>")}      Remove skills (alias: ${c.dim("rm")})
  ${c.cyan("brutal doctor")}             Run diagnostics
  ${c.cyan("brutal version")}            Show current version + update check
  ${c.cyan("brutal upgrade")}            Pull latest from npm and install

${c.bold("Characters:")} ${c.dim("(use --persona <name> to pick a reviewer personality)")}
  Run ${c.cyan("brutal persona list")} to see available personas.

${c.bold("Mid-session overrides:")}
  ${c.cyan("/persona <name>")}          Switch persona mid-session
  ${c.cyan("/level <0-10>")}            Adjust brutality level mid-session

${c.bold("Examples:")}
  brutal use code-reviewer --persona chow
  npx ${NPM_PKG} use code-reviewer --level 10
  git diff | brutal use code-reviewer --persona alan
  brutal hook git --all
  brutal hook github --level 10
  brutal export cursor
      `);
      break;
  }
}

main().catch((err) => {
  console.error(c.red(`\n✗ Error: ${err.message}\n`));
  process.exit(1);
});
