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
});

// ── List ──────────────────────────────────────────────────────────────

describe("--list", () => {
  it("lists all available skills", () => {
    const output = run("--list");
    assert.ok(output.includes("brutal-code-reviewer"));
    assert.ok(output.includes("roast-mode"));
    assert.ok(output.includes("devils-advocate"));
    assert.ok(output.includes("pre-mortem"));
  });

  it("lists at least 13 skills", () => {
    const dirs = fs
      .readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory());
    assert.ok(dirs.length >= 13, `Expected >= 13 skills, got ${dirs.length}`);
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
    assert.ok(dirs.length >= 13, `Expected >= 13, got ${dirs.length}`);
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
