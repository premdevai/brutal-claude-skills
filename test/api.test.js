const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { listSkills, getSkill, getSkillMetadata } = require("../index.js");

describe("Programmatic API", () => {
  it("listSkills() returns an array of skill names", () => {
    const skills = listSkills();
    assert.ok(Array.isArray(skills));
    assert.ok(skills.length >= 15);
    assert.ok(skills.includes("brutal-code-reviewer"));
  });

  it("getSkill() returns raw markdown content", () => {
    const content = getSkill("brutal-code-reviewer");
    assert.ok(typeof content === "string");
    assert.ok(content.includes("name: brutal-code-reviewer"));
    assert.ok(content.includes("# Brutal Code Reviewer"));
  });

  it("getSkill({ stripFrontmatter: true }) removes YAML frontmatter", () => {
    const content = getSkill("brutal-code-reviewer", { stripFrontmatter: true });
    assert.ok(!content.startsWith("---"));
    assert.ok(!content.includes("name: brutal-code-reviewer"));
    assert.ok(content.startsWith("# Brutal Code Reviewer"));
  });

  it("getSkill({ level: 10 }) injects the custom default level", () => {
    const content = getSkill("brutal-code-reviewer", { level: 10 });
    assert.ok(content.includes("If they don't specify, default to **10**"));
    assert.ok(!content.includes("If they don't specify, default to **7**"));
  });

  it("getSkill() throws on invalid level", () => {
    assert.throws(() => getSkill("brutal-code-reviewer", { level: 11 }), /between 0 and 10/);
    assert.throws(() => getSkill("brutal-code-reviewer", { level: -1 }), /between 0 and 10/);
    assert.throws(() => getSkill("brutal-code-reviewer", { level: "high" }), /must be a number/);
  });

  it("getSkill() throws on missing skill", () => {
    assert.throws(() => getSkill("does-not-exist"), /Skill not found/);
  });

  it("getSkillMetadata() returns parsed frontmatter", () => {
    const meta = getSkillMetadata("brutal-code-reviewer");
    assert.ok(meta);
    assert.equal(meta.name, "brutal-code-reviewer");
    assert.ok(meta.description.includes("no-mercy, hyper-critical senior engineer"));
  });
});
