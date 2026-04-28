const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const CLI = path.join(__dirname, "..", "bin", "install.js");
const SKILLS_DIR = path.join(__dirname, "..", "skills");

function run(...args) {
  return execFileSync(process.execPath, [CLI, ...args], {
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
}

// ── Version ──────────────────────────────────────────────────────────

describe("--version", () => {
  it("prints the version from package.json", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8")
    );
    const output = run("--version").trim();
    assert.equal(output, pkg.version);
  });
});

// ── Help ──────────────────────────────────────────────────────────────

describe("--help", () => {
  it("prints usage information", () => {
    const output = run("--help");
    assert.ok(output.includes("brutal-claude-skills"));
    assert.ok(output.includes("--all"));
    assert.ok(output.includes("--skill"));
    assert.ok(output.includes("--list"));
    assert.ok(output.includes("--target"));
    assert.ok(output.includes("--uninstall"));
    assert.ok(output.includes("--version"));
  });

  it("shows new flags", () => {
    const output = run("--help");
    assert.ok(output.includes("--project"), "should show --project flag");
    assert.ok(output.includes("--pack"), "should show --pack flag");
    assert.ok(output.includes("--preview"), "should show --preview flag");
    assert.ok(output.includes("--status"), "should show --status flag");
  });

  it("shows available packs", () => {
    const output = run("--help");
    assert.ok(output.includes("engineering"), "should list engineering pack");
    assert.ok(output.includes("writing"), "should list writing pack");
    assert.ok(output.includes("strategy"), "should list strategy pack");
    assert.ok(output.includes("career"), "should list career pack");
    assert.ok(output.includes("fun"), "should list fun pack");
  });
});

// ── List ──────────────────────────────────────────────────────────────

describe("--list", () => {
  it("lists all available skills", () => {
    const output = run("--list");
    assert.ok(output.includes("brutal-code-reviewer"));
    assert.ok(output.includes("roast-mode"));
    assert.ok(output.includes("devils-advocate"));
    assert.ok(output.includes("pre-mortem"));
    assert.ok(output.includes("brutal-architecture-reviewer"));
    assert.ok(output.includes("interview-prep-destroyer"));
  });

  it("shows categories", () => {
    const output = run("--list");
    assert.ok(output.includes("CRITICS"), "should show CRITICS category");
    assert.ok(output.includes("ADVERSARIAL THINKING"), "should show ADVERSARIAL THINKING");
    assert.ok(output.includes("CAREER"), "should show CAREER & PREP");
    assert.ok(output.includes("ENTERTAINMENT"), "should show ENTERTAINMENT");
  });

  it("shows total count", () => {
    const output = run("--list");
    assert.ok(output.includes("skills available"), "should show total count");
  });

  it("lists at least 13 skills", () => {
    const dirs = fs
      .readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory());
    assert.ok(dirs.length >= 13, `Expected >= 13 skills, got ${dirs.length}`);
  });
});

// ── Preview ──────────────────────────────────────────────────────────

describe("--preview", () => {
  it("shows skill preview for a valid skill", () => {
    const output = run("--preview", "roast-mode");
    assert.ok(output.includes("Preview:"), "should show preview header");
    assert.ok(output.includes("roast-mode"), "should show skill name");
    assert.ok(output.includes("Sections:"), "should show sections");
    assert.ok(output.includes("Install with:"), "should show install hint");
  });

  it("shows sections from the skill", () => {
    const output = run("--preview", "brutal-code-reviewer");
    assert.ok(output.includes("Persona") || output.includes("Behavior") || output.includes("Tone"),
      "should list at least one section header");
  });

  it("fails for nonexistent skill", () => {
    assert.throws(
      () => run("--preview", "nonexistent-skill"),
      /not found/i
    );
  });
});

// ── Status ───────────────────────────────────────────────────────────

describe("--status", () => {
  it("shows global and project status", () => {
    const output = run("--status");
    assert.ok(output.includes("Global"), "should show Global section");
    assert.ok(output.includes("Project"), "should show Project section");
  });
});

// ── Skill files ──────────────────────────────────────────────────────

describe("skill files", () => {
  const skills = fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const skill of skills) {
    it(`${skill}/ has a SKILL.md`, () => {
      const file = path.join(SKILLS_DIR, skill, "SKILL.md");
      assert.ok(fs.existsSync(file), `Missing SKILL.md in ${skill}/`);
    });

    it(`${skill}/SKILL.md has valid frontmatter`, () => {
      const file = path.join(SKILLS_DIR, skill, "SKILL.md");
      const content = fs.readFileSync(file, "utf8");
      assert.ok(content.startsWith("---"), `${skill}: missing frontmatter opening`);
      assert.ok(content.includes("name:"), `${skill}: missing 'name' field`);
      assert.ok(content.includes("description:"), `${skill}: missing 'description' field`);
    });
  }
});

// ── Install & Uninstall ──────────────────────────────────────────────

describe("install and uninstall", () => {
  const tmpTarget = path.join(os.tmpdir(), `brutal-test-${Date.now()}`);

  after(() => {
    // Cleanup
    if (fs.existsSync(tmpTarget)) {
      fs.rmSync(tmpTarget, { recursive: true, force: true });
    }
  });

  it("installs a single skill to a custom target", () => {
    const output = run("--skill", "roast-mode", "--target", tmpTarget);
    assert.ok(output.includes("roast-mode"));

    const installed = path.join(tmpTarget, "roast-mode", "SKILL.md");
    assert.ok(fs.existsSync(installed), "SKILL.md should exist at target");
  });

  it("installs all skills", () => {
    const output = run("--all", "--target", tmpTarget);
    assert.ok(output.includes("skill(s) installed"));

    const dirs = fs
      .readdirSync(tmpTarget, { withFileTypes: true })
      .filter((d) => d.isDirectory());
    assert.ok(dirs.length >= 15, `Expected >= 15, got ${dirs.length}`);
  });

  it("uninstalls a single skill", () => {
    const output = run("--uninstall", "roast-mode", "--target", tmpTarget);
    assert.ok(output.includes("roast-mode"));

    const removed = path.join(tmpTarget, "roast-mode");
    assert.ok(!fs.existsSync(removed), "roast-mode should be removed");
  });

  it("uninstalls all skills", () => {
    const output = run("--uninstall", "--all", "--target", tmpTarget);
    assert.ok(output.includes("removed"));
  });

  it("fails gracefully for a nonexistent skill", () => {
    assert.throws(
      () => run("--skill", "nonexistent-skill", "--target", tmpTarget),
      /nonexistent/i
    );
  });
});

// ── Packs ────────────────────────────────────────────────────────────

describe("--pack", () => {
  const tmpTarget = path.join(os.tmpdir(), `brutal-pack-test-${Date.now()}`);

  after(() => {
    if (fs.existsSync(tmpTarget)) {
      fs.rmSync(tmpTarget, { recursive: true, force: true });
    }
  });

  it("installs engineering pack", () => {
    const output = run("--pack", "engineering", "--target", tmpTarget);
    assert.ok(output.includes("Pack: engineering"), "should show pack name");
    assert.ok(output.includes("skill(s) installed"), "should confirm install");

    const codeReviewer = path.join(tmpTarget, "brutal-code-reviewer", "SKILL.md");
    assert.ok(fs.existsSync(codeReviewer), "should install code reviewer");
  });

  it("installs strategy pack", () => {
    const output = run("--pack", "strategy", "--target", tmpTarget);
    assert.ok(output.includes("Pack: strategy"));

    const da = path.join(tmpTarget, "devils-advocate", "SKILL.md");
    assert.ok(fs.existsSync(da), "should install devils-advocate");
  });

  it("installs fun pack", () => {
    const output = run("--pack", "fun", "--target", tmpTarget);
    assert.ok(output.includes("Pack: fun"));

    const roast = path.join(tmpTarget, "roast-mode", "SKILL.md");
    assert.ok(fs.existsSync(roast), "should install roast-mode");
  });

  it("fails for unknown pack", () => {
    assert.throws(
      () => run("--pack", "nonexistent-pack", "--target", tmpTarget),
      /Unknown pack/i
    );
  });
});
