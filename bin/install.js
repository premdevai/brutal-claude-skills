#!/usr/bin/env node

/**
 * brutal-skills CLI
 *
 * Usage:
 *   npx brutal-claude-skills                        # Interactive install
 *   npx brutal-claude-skills --all                  # Install all skills
 *   npx brutal-claude-skills --list                 # List available skills
 *   npx brutal-claude-skills --skill <name>         # Install a specific skill
 *   npx brutal-claude-skills --target <path>        # Override install target
 *   npx brutal-claude-skills --uninstall <name>     # Uninstall a specific skill
 *   npx brutal-claude-skills --uninstall --all      # Uninstall all skills
 *   npx brutal-claude-skills --version              # Show version
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");

// ── Constants ──────────────────────────────────────────────────────────

const SKILLS_DIR = path.join(__dirname, "..", "skills");
const DEFAULT_TARGET = path.join(os.homedir(), ".claude", "skills");
const PKG = require(path.join(__dirname, "..", "package.json"));

// ── Colors (no dependencies) ──────────────────────────────────────────

const supportsColor =
  process.stdout.isTTY &&
  !process.env.NO_COLOR &&
  process.env.TERM !== "dumb";

const c = {
  bold: (s) => (supportsColor ? `\x1b[1m${s}\x1b[22m` : s),
  dim: (s) => (supportsColor ? `\x1b[2m${s}\x1b[22m` : s),
  green: (s) => (supportsColor ? `\x1b[32m${s}\x1b[39m` : s),
  red: (s) => (supportsColor ? `\x1b[31m${s}\x1b[39m` : s),
  yellow: (s) => (supportsColor ? `\x1b[33m${s}\x1b[39m` : s),
  cyan: (s) => (supportsColor ? `\x1b[36m${s}\x1b[39m` : s),
  gray: (s) => (supportsColor ? `\x1b[90m${s}\x1b[39m` : s),
};

// ── Helpers ───────────────────────────────────────────────────────────

function listSkills() {
  if (!fs.existsSync(SKILLS_DIR)) {
    console.error(c.red("Skills directory not found:"), SKILLS_DIR);
    process.exit(1);
  }
  return fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirSync(s, d);
    else fs.copyFileSync(s, d);
  }
}

function removeDirSync(dir) {
  if (!fs.existsSync(dir)) return false;
  fs.rmSync(dir, { recursive: true, force: true });
  return true;
}

function readDescription(skillName) {
  const skillFile = path.join(SKILLS_DIR, skillName, "SKILL.md");
  if (!fs.existsSync(skillFile)) return "";
  const content = fs.readFileSync(skillFile, "utf8");
  const match = content.match(/^description:\s*(.+?)(?=\n[a-z_-]+:|\n---)/ms);
  if (!match) return "";
  // First sentence only, for compactness
  const desc = match[1].trim().replace(/\s+/g, " ");
  const firstSentence = desc.split(/(?<=\.)\s/)[0];
  return firstSentence;
}

function installSkill(name, target) {
  const src = path.join(SKILLS_DIR, name);
  const dest = path.join(target, name);
  if (!fs.existsSync(src)) {
    console.error(c.red(`  ✗ Skill not found: ${name}`));
    return false;
  }
  copyDirSync(src, dest);
  console.log(`  ${c.green("✓")} ${c.bold(name)}  ${c.dim("→")}  ${c.gray(dest)}`);
  return true;
}

function uninstallSkill(name, target) {
  const dest = path.join(target, name);
  if (removeDirSync(dest)) {
    console.log(`  ${c.green("✓")} ${c.bold(name)} ${c.dim("removed")}`);
    return true;
  } else {
    console.log(`  ${c.yellow("⚠")} ${name} ${c.dim("not found at")} ${c.gray(dest)}`);
    return false;
  }
}

// ── Argument parsing ──────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {
    all: false,
    list: false,
    skill: null,
    target: DEFAULT_TARGET,
    help: false,
    version: false,
    uninstall: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--all" || a === "-a") args.all = true;
    else if (a === "--list" || a === "-l") args.list = true;
    else if (a === "--skill" || a === "-s") args.skill = argv[++i];
    else if (a === "--target" || a === "-t") args.target = argv[++i];
    else if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--version" || a === "-v") args.version = true;
    else if (a === "--uninstall" || a === "-u") {
      args.uninstall = true;
      // Check if next arg is a skill name (not a flag)
      if (argv[i + 1] && !argv[i + 1].startsWith("-")) {
        args.skill = argv[++i];
      }
    }
  }
  return args;
}

// ── Commands ──────────────────────────────────────────────────────────

function printBanner() {
  console.log("");
  console.log(c.bold("  brutal-claude-skills") + c.dim(` v${PKG.version}`));
  console.log(c.gray("  No-mercy skills for Claude Code"));
  console.log("");
}

function printHelp() {
  printBanner();
  console.log(`${c.bold("USAGE")}

  ${c.cyan("npx brutal-claude-skills")}                       Interactive install
  ${c.cyan("npx brutal-claude-skills --all")}                 Install all skills
  ${c.cyan("npx brutal-claude-skills --list")}                List available skills
  ${c.cyan("npx brutal-claude-skills --skill")} ${c.dim("<name>")}       Install a specific skill
  ${c.cyan("npx brutal-claude-skills --target")} ${c.dim("<path>")}     Override install target
  ${c.cyan("npx brutal-claude-skills --uninstall")} ${c.dim("<name>")}  Uninstall a skill
  ${c.cyan("npx brutal-claude-skills --uninstall --all")}     Uninstall all skills
  ${c.cyan("npx brutal-claude-skills --version")}             Show version

${c.bold("FLAGS")}

  ${c.cyan("-a, --all")}          Install or uninstall all skills
  ${c.cyan("-s, --skill")} ${c.dim("<name>")}  Target a specific skill
  ${c.cyan("-t, --target")} ${c.dim("<path>")} Override install directory ${c.gray(`(default: ~/.claude/skills)`)}
  ${c.cyan("-l, --list")}         List available skills
  ${c.cyan("-u, --uninstall")}    Uninstall instead of install
  ${c.cyan("-v, --version")}      Show version
  ${c.cyan("-h, --help")}         Show this help

${c.bold("EXAMPLES")}

  ${c.gray("# Install everything")}
  npx brutal-claude-skills --all

  ${c.gray("# Just the code reviewer")}
  npx brutal-claude-skills --skill brutal-code-reviewer

  ${c.gray("# Install to a custom directory")}
  npx brutal-claude-skills --skill roast-mode --target ./my-skills

  ${c.gray("# Remove a skill")}
  npx brutal-claude-skills --uninstall brutal-code-reviewer
`);
}

async function interactiveInstall(skills, target) {
  printBanner();
  console.log(`  ${c.bold("Available skills")} ${c.dim(`(${skills.length})`)}\n`);

  skills.forEach((s, i) => {
    const desc = readDescription(s);
    const short = desc.length > 70 ? desc.slice(0, 67) + "..." : desc;
    const num = c.gray(String(i + 1).padStart(2) + ".");
    console.log(`  ${num} ${c.bold(s.padEnd(34))} ${c.dim(short)}`);
  });
  console.log("");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const ask = (q) => new Promise((res) => rl.question(q, res));

  const answer = await ask(
    `  ${c.cyan("?")} Install which? ${c.dim('(comma-separated numbers, "all", or empty to cancel)')}: `
  );
  rl.close();

  const trimmed = answer.trim().toLowerCase();
  if (!trimmed) {
    console.log(c.dim("\n  Cancelled.\n"));
    return;
  }

  let selected;
  if (trimmed === "all") {
    selected = skills;
  } else {
    const nums = trimmed
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 1 && n <= skills.length);
    selected = nums.map((n) => skills[n - 1]);
  }

  if (selected.length === 0) {
    console.log(c.yellow("\n  Nothing selected. Cancelled.\n"));
    return;
  }

  console.log(`\n  ${c.dim("Installing to:")} ${c.cyan(target)}\n`);
  fs.mkdirSync(target, { recursive: true });
  selected.forEach((s) => installSkill(s, target));
  console.log(
    `\n  ${c.green(selected.length + " skill(s) installed.")}`
  );
  console.log(
    c.dim("  Restart Claude Code to pick up the new skills.\n")
  );
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);

  if (args.version) {
    console.log(PKG.version);
    return;
  }

  if (args.help) {
    printHelp();
    return;
  }

  const skills = listSkills();

  // ── List ──
  if (args.list) {
    printBanner();
    console.log(`  ${c.bold("Available skills")} ${c.dim(`(${skills.length})`)}\n`);
    skills.forEach((s) => {
      const desc = readDescription(s);
      const short = desc.length > 80 ? desc.slice(0, 77) + "..." : desc;
      console.log(`  ${c.bold(s.padEnd(34))} ${c.dim(short)}`);
    });
    console.log("");
    return;
  }

  // ── Uninstall ──
  if (args.uninstall) {
    if (args.all) {
      console.log(`\n  ${c.dim("Uninstalling all skills from:")} ${c.cyan(args.target)}\n`);
      let removed = 0;
      skills.forEach((s) => {
        if (uninstallSkill(s, args.target)) removed++;
      });
      console.log(`\n  ${c.green(removed + " skill(s) removed.")}\n`);
    } else if (args.skill) {
      console.log(`\n  ${c.dim("Uninstalling from:")} ${c.cyan(args.target)}\n`);
      uninstallSkill(args.skill, args.target);
      console.log("");
    } else {
      console.error(c.red("\n  Specify a skill name or use --all with --uninstall.\n"));
      process.exit(1);
    }
    return;
  }

  // ── Install single ──
  if (args.skill) {
    fs.mkdirSync(args.target, { recursive: true });
    console.log(`\n  ${c.dim("Installing to:")} ${c.cyan(args.target)}\n`);
    const ok = installSkill(args.skill, args.target);
    if (ok) {
      console.log(
        `\n  ${c.green("Done.")} ${c.dim(`Restart Claude to pick up "${args.skill}".`)}\n`
      );
    } else {
      console.log(`\n  ${c.dim("Available skills:")} ${skills.join(", ")}\n`);
      process.exit(1);
    }
    return;
  }

  // ── Install all ──
  if (args.all) {
    fs.mkdirSync(args.target, { recursive: true });
    printBanner();
    console.log(
      `  ${c.dim("Installing all")} ${c.bold(String(skills.length))} ${c.dim("skills to:")} ${c.cyan(args.target)}\n`
    );
    skills.forEach((s) => installSkill(s, args.target));
    console.log(
      `\n  ${c.green(skills.length + " skill(s) installed.")} ${c.dim("Restart Claude to pick them up.")}\n`
    );
    return;
  }

  // ── Default: interactive ──
  await interactiveInstall(skills, args.target);
}

main().catch((err) => {
  console.error(c.red("Error:"), err.message);
  process.exit(1);
});
