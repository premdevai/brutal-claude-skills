#!/usr/bin/env node

/**
 * brutal-skills CLI
 *
 * Usage:
 *   npx brutal-claude-skills                        # Interactive install
 *   npx brutal-claude-skills --all                  # Install all skills
 *   npx brutal-claude-skills --list                 # List available skills (categorized)
 *   npx brutal-claude-skills --skill <name>         # Install a specific skill
 *   npx brutal-claude-skills --pack <name>          # Install a skill pack
 *   npx brutal-claude-skills --project              # Install to current project (.claude/skills/)
 *   npx brutal-claude-skills --target <path>        # Override install target
 *   npx brutal-claude-skills --preview <name>       # Preview a skill before installing
 *   npx brutal-claude-skills --status               # Show installed skills
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

// ── Skill Packs ───────────────────────────────────────────────────────

const PACKS = {
  engineering: {
    description: "Code, commits, and architecture",
    skills: [
      "brutal-code-reviewer",
      "brutal-commit-message-reviewer",
      "brutal-design-critic",
    ],
  },
  writing: {
    description: "Prose, docs, and communications",
    skills: [
      "brutal-writing-editor",
      "brutal-readme-reviewer",
      "brutal-email-reviewer",
    ],
  },
  strategy: {
    description: "Adversarial thinking and decision-making",
    skills: [
      "devils-advocate",
      "pre-mortem",
      "assumption-auditor",
      "bs-detector",
    ],
  },
  career: {
    description: "Resumes, pitches, and professional docs",
    skills: [
      "brutal-resume-reviewer",
      "brutal-pitch-reviewer",
    ],
  },
  fun: {
    description: "Pure entertainment",
    skills: [
      "roast-mode",
    ],
  },
};

// ── Skill Categories ──────────────────────────────────────────────────

const CATEGORIES = {
  "🔍 CRITICS": [
    "brutal-code-reviewer",
    "brutal-writing-editor",
    "brutal-design-critic",
    "brutal-resume-reviewer",
    "brutal-pitch-reviewer",
    "brutal-readme-reviewer",
    "brutal-commit-message-reviewer",
    "brutal-email-reviewer",
  ],
  "🧠 ADVERSARIAL THINKING": [
    "devils-advocate",
    "pre-mortem",
    "bs-detector",
    "assumption-auditor",
  ],
  "🎤 ENTERTAINMENT": [
    "roast-mode",
  ],
};

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
  magenta: (s) => (supportsColor ? `\x1b[35m${s}\x1b[39m` : s),
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

function readSkillContent(skillName) {
  const skillFile = path.join(SKILLS_DIR, skillName, "SKILL.md");
  if (!fs.existsSync(skillFile)) return null;
  return fs.readFileSync(skillFile, "utf8");
}

function getProjectTarget() {
  return path.join(process.cwd(), ".claude", "skills");
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

function getInstalledSkills(target) {
  if (!fs.existsSync(target)) return [];
  return fs
    .readdirSync(target, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .filter((d) => fs.existsSync(path.join(target, d.name, "SKILL.md")))
    .map((d) => d.name)
    .sort();
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
    project: false,
    pack: null,
    preview: null,
    status: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--all" || a === "-a") args.all = true;
    else if (a === "--list" || a === "-l") args.list = true;
    else if (a === "--skill" || a === "-s") args.skill = argv[++i];
    else if (a === "--target" || a === "-t") args.target = argv[++i];
    else if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--version" || a === "-v") args.version = true;
    else if (a === "--project" || a === "-p") args.project = true;
    else if (a === "--pack") args.pack = argv[++i];
    else if (a === "--preview") args.preview = argv[++i];
    else if (a === "--status") args.status = true;
    else if (a === "--uninstall" || a === "-u") {
      args.uninstall = true;
      // Check if next arg is a skill name (not a flag)
      if (argv[i + 1] && !argv[i + 1].startsWith("-")) {
        args.skill = argv[++i];
      }
    }
  }

  // --project overrides target
  if (args.project) {
    args.target = getProjectTarget();
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
  ${c.cyan("npx brutal-claude-skills --pack")} ${c.dim("<name>")}        Install a skill pack
  ${c.cyan("npx brutal-claude-skills --project")}             Install to current project
  ${c.cyan("npx brutal-claude-skills --preview")} ${c.dim("<name>")}     Preview a skill
  ${c.cyan("npx brutal-claude-skills --status")}              Show installed skills
  ${c.cyan("npx brutal-claude-skills --target")} ${c.dim("<path>")}      Override install target
  ${c.cyan("npx brutal-claude-skills --uninstall")} ${c.dim("<name>")}   Uninstall a skill
  ${c.cyan("npx brutal-claude-skills --uninstall --all")}     Uninstall all skills
  ${c.cyan("npx brutal-claude-skills --version")}             Show version

${c.bold("FLAGS")}

  ${c.cyan("-a, --all")}           Install or uninstall all skills
  ${c.cyan("-s, --skill")} ${c.dim("<name>")}   Target a specific skill
  ${c.cyan("    --pack")} ${c.dim("<name>")}    Install a pack: ${c.dim(Object.keys(PACKS).join(", "))}
  ${c.cyan("-p, --project")}       Install to ${c.dim(".claude/skills/")} in current project
  ${c.cyan("    --preview")} ${c.dim("<name>")} Preview a skill's content before installing
  ${c.cyan("    --status")}        Show what's installed and where
  ${c.cyan("-t, --target")} ${c.dim("<path>")}  Override install directory ${c.gray(`(default: ~/.claude/skills)`)}
  ${c.cyan("-u, --uninstall")}     Uninstall instead of install
  ${c.cyan("-l, --list")}          List available skills
  ${c.cyan("-v, --version")}       Show version
  ${c.cyan("-h, --help")}          Show this help

${c.bold("PACKS")}

${Object.entries(PACKS)
  .map(
    ([name, pack]) =>
      `  ${c.bold(name.padEnd(16))} ${c.dim(pack.description)} ${c.gray(`(${pack.skills.length} skills)`)}`
  )
  .join("\n")}

${c.bold("EXAMPLES")}

  ${c.gray("# Install everything")}
  npx brutal-claude-skills --all

  ${c.gray("# Install the engineering pack")}
  npx brutal-claude-skills --pack engineering

  ${c.gray("# Install to your project (team sharing via git)")}
  npx brutal-claude-skills --all --project

  ${c.gray("# Preview a skill before installing")}
  npx brutal-claude-skills --preview roast-mode

  ${c.gray("# Check what's installed")}
  npx brutal-claude-skills --status

  ${c.gray("# Just the code reviewer")}
  npx brutal-claude-skills --skill brutal-code-reviewer

  ${c.gray("# Remove a skill")}
  npx brutal-claude-skills --uninstall brutal-code-reviewer
`);
}

function printCategorizedList(skills) {
  printBanner();

  const allKnown = Object.values(CATEGORIES).flat();

  for (const [category, members] of Object.entries(CATEGORIES)) {
    console.log(`  ${c.bold(category)}\n`);
    for (const s of members) {
      if (!skills.includes(s)) continue;
      const desc = readDescription(s);
      const short = desc.length > 65 ? desc.slice(0, 62) + "..." : desc;
      console.log(`    ${c.bold(s.padEnd(36))} ${c.dim(short)}`);
    }
    console.log("");
  }

  // Any skills not in a category
  const uncategorized = skills.filter((s) => !allKnown.includes(s));
  if (uncategorized.length > 0) {
    console.log(`  ${c.bold("📦 OTHER")}\n`);
    for (const s of uncategorized) {
      const desc = readDescription(s);
      const short = desc.length > 65 ? desc.slice(0, 62) + "..." : desc;
      console.log(`    ${c.bold(s.padEnd(36))} ${c.dim(short)}`);
    }
    console.log("");
  }

  console.log(
    `  ${c.dim("Total:")} ${c.bold(String(skills.length))} ${c.dim("skills available")}`
  );
  console.log(
    `  ${c.dim("Packs:")} ${Object.keys(PACKS).map((p) => c.cyan(p)).join(c.dim(", "))}`
  );
  console.log("");
}

function printStatus(skills, target) {
  printBanner();

  const globalTarget = DEFAULT_TARGET;
  const projectTarget = getProjectTarget();

  const globalInstalled = getInstalledSkills(globalTarget);
  const projectInstalled = getInstalledSkills(projectTarget);

  // Global
  console.log(`  ${c.bold("Global")} ${c.gray(`(${globalTarget})`)}\n`);
  if (globalInstalled.length === 0) {
    console.log(`    ${c.dim("No skills installed")}\n`);
  } else {
    for (const s of globalInstalled) {
      const isKnown = skills.includes(s);
      const badge = isKnown ? c.green("✓") : c.yellow("?");
      console.log(`    ${badge} ${c.bold(s)}`);
    }
    console.log(`\n    ${c.dim(`${globalInstalled.length} skill(s) installed`)}\n`);
  }

  // Project
  console.log(`  ${c.bold("Project")} ${c.gray(`(${projectTarget})`)}\n`);
  if (projectInstalled.length === 0) {
    console.log(`    ${c.dim("No skills installed")}\n`);
  } else {
    for (const s of projectInstalled) {
      const isKnown = skills.includes(s);
      const badge = isKnown ? c.green("✓") : c.yellow("?");
      console.log(`    ${badge} ${c.bold(s)}`);
    }
    console.log(`\n    ${c.dim(`${projectInstalled.length} skill(s) installed`)}\n`);
  }

  // Not installed
  const allInstalled = new Set([...globalInstalled, ...projectInstalled]);
  const notInstalled = skills.filter((s) => !allInstalled.has(s));
  if (notInstalled.length > 0) {
    console.log(`  ${c.bold("Not installed")} ${c.dim(`(${notInstalled.length})`)}\n`);
    for (const s of notInstalled) {
      console.log(`    ${c.gray("○")} ${c.dim(s)}`);
    }
    console.log("");
  }
}

function printPreview(skillName) {
  const content = readSkillContent(skillName);
  if (!content) {
    console.error(c.red(`\n  Skill not found: ${skillName}\n`));
    process.exit(1);
  }

  printBanner();
  console.log(`  ${c.bold("Preview:")} ${c.cyan(skillName)}`);
  console.log(`  ${c.gray("─".repeat(60))}\n`);

  // Parse and display frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (fmMatch) {
    const frontmatter = fmMatch[1];
    const body = fmMatch[2];

    // Show metadata
    for (const line of frontmatter.split("\n")) {
      const [key, ...rest] = line.split(":");
      if (key && rest.length) {
        const val = rest.join(":").trim();
        if (key === "name") {
          console.log(`  ${c.bold("Name:")}         ${c.cyan(val)}`);
        } else if (key === "description") {
          const desc = val.replace(/\s+/g, " ");
          const wrapped = desc.length > 70 ? desc.slice(0, 67) + "..." : desc;
          console.log(`  ${c.bold("Description:")}  ${wrapped}`);
        }
      }
    }
    // Get full description from the parsed result
    const fullDesc = readDescription(skillName);
    if (fullDesc.length > 70) {
      console.log(`  ${c.bold("Description:")}  ${fullDesc}`);
    }

    console.log(`\n  ${c.gray("─".repeat(60))}\n`);

    // Show body sections (headers only for compact preview)
    const headers = body.match(/^#{1,3}\s+.+$/gm) || [];
    if (headers.length > 0) {
      console.log(`  ${c.bold("Sections:")}\n`);
      for (const h of headers) {
        const level = h.match(/^(#+)/)[1].length;
        const title = h.replace(/^#+\s+/, "");
        const indent = "  ".repeat(level);
        console.log(`  ${indent}${level === 1 ? c.bold(title) : level === 2 ? c.cyan(title) : c.dim(title)}`);
      }
    }

    // Count lines
    const lineCount = body.split("\n").length;
    console.log(`\n  ${c.gray(`${lineCount} lines total`)}`);
  } else {
    // No frontmatter — just show raw
    console.log(content);
  }

  console.log(`\n  ${c.dim("Install with:")} ${c.cyan(`npx brutal-claude-skills --skill ${skillName}`)}\n`);
}

async function interactiveInstall(skills, target) {
  printBanner();

  const allKnown = Object.values(CATEGORIES).flat();
  let index = 1;
  const indexMap = {};

  for (const [category, members] of Object.entries(CATEGORIES)) {
    console.log(`  ${c.bold(category)}\n`);
    for (const s of members) {
      if (!skills.includes(s)) continue;
      const desc = readDescription(s);
      const short = desc.length > 55 ? desc.slice(0, 52) + "..." : desc;
      const num = c.gray(String(index).padStart(2) + ".");
      console.log(`  ${num} ${c.bold(s.padEnd(34))} ${c.dim(short)}`);
      indexMap[index] = s;
      index++;
    }
    console.log("");
  }

  // Uncategorized
  const uncategorized = skills.filter((s) => !allKnown.includes(s));
  if (uncategorized.length > 0) {
    console.log(`  ${c.bold("📦 OTHER")}\n`);
    for (const s of uncategorized) {
      const desc = readDescription(s);
      const short = desc.length > 55 ? desc.slice(0, 52) + "..." : desc;
      const num = c.gray(String(index).padStart(2) + ".");
      console.log(`  ${num} ${c.bold(s.padEnd(34))} ${c.dim(short)}`);
      indexMap[index] = s;
      index++;
    }
    console.log("");
  }

  // Show packs as shortcut
  console.log(`  ${c.bold("⚡ PACKS")} ${c.dim("(type a pack name to install a bundle)")}\n`);
  for (const [name, pack] of Object.entries(PACKS)) {
    console.log(`    ${c.cyan(name.padEnd(16))} ${c.dim(pack.description)} ${c.gray(`(${pack.skills.length})`)}`);
  }
  console.log("");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const ask = (q) => new Promise((res) => rl.question(q, res));

  const answer = await ask(
    `  ${c.cyan("?")} Install which? ${c.dim('(numbers, pack name, "all", or empty to cancel)')}: `
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
  } else if (PACKS[trimmed]) {
    selected = PACKS[trimmed].skills.filter((s) => skills.includes(s));
    console.log(`\n  ${c.magenta("⚡")} ${c.bold(`Pack: ${trimmed}`)} ${c.dim(`(${selected.length} skills)`)}`);
  } else {
    const nums = trimmed
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && indexMap[n]);
    selected = nums.map((n) => indexMap[n]);
  }

  if (!selected || selected.length === 0) {
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

  // ── Preview ──
  if (args.preview) {
    printPreview(args.preview);
    return;
  }

  // ── Status ──
  if (args.status) {
    printStatus(skills, args.target);
    return;
  }

  // ── List ──
  if (args.list) {
    printCategorizedList(skills);
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

  // ── Pack ──
  if (args.pack) {
    const pack = PACKS[args.pack];
    if (!pack) {
      console.error(c.red(`\n  Unknown pack: ${args.pack}`));
      console.log(`  ${c.dim("Available packs:")} ${Object.keys(PACKS).join(", ")}\n`);
      process.exit(1);
    }
    const packSkills = pack.skills.filter((s) => skills.includes(s));
    fs.mkdirSync(args.target, { recursive: true });
    printBanner();
    console.log(
      `  ${c.magenta("⚡")} ${c.bold(`Pack: ${args.pack}`)} ${c.dim(`— ${pack.description}`)}`
    );
    console.log(`  ${c.dim("Installing to:")} ${c.cyan(args.target)}\n`);
    packSkills.forEach((s) => installSkill(s, args.target));
    console.log(
      `\n  ${c.green(packSkills.length + " skill(s) installed.")} ${c.dim("Restart Claude to pick them up.")}\n`
    );
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
