const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, 'skills');

/**
 * Returns a list of all available skill names.
 * @returns {string[]} Array of skill names
 */
function listSkills() {
  if (!fs.existsSync(SKILLS_DIR)) {
    throw new Error(`Skills directory not found at ${SKILLS_DIR}`);
  }
  return fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .filter((d) => fs.existsSync(path.join(SKILLS_DIR, d.name, 'SKILL.md')))
    .map((d) => d.name)
    .sort();
}

/**
 * Retrieves the prompt content for a specific skill.
 * 
 * @param {string} skillName - The name of the skill (e.g., 'brutal-code-reviewer')
 * @param {Object} options - Configuration options
 * @param {boolean} [options.stripFrontmatter=false] - If true, removes the YAML frontmatter
 * @param {number} [options.level] - Override the default brutality level (0-10)
 * @returns {string} The markdown prompt content
 */
function getSkill(skillName, options = {}) {
  const skillFile = path.join(SKILLS_DIR, skillName, 'SKILL.md');
  if (!fs.existsSync(skillFile)) {
    throw new Error(`Skill not found: ${skillName}`);
  }

  let content = fs.readFileSync(skillFile, 'utf8');

  // Strip frontmatter if requested
  if (options.stripFrontmatter) {
    content = content.replace(/^---\n([\s\S]*?)\n---\n/, '').trim();
  }

  // Override default brutality level if specified
  if (options.level !== undefined) {
    if (typeof options.level !== 'number' || options.level < 0 || options.level > 10) {
      throw new Error('Brutality level must be a number between 0 and 10');
    }
    // Replace the default level text
    content = content.replace(
      /If they don't specify, default to \*\*7\*\*/,
      `If they don't specify, default to **${options.level}**`
    );
  }

  return content;
}

/**
 * Parses the frontmatter of a skill to extract metadata.
 * 
 * @param {string} skillName - The name of the skill
 * @returns {Object|null} The parsed metadata (name, description, etc.) or null if no frontmatter
 */
function getSkillMetadata(skillName) {
  const skillFile = path.join(SKILLS_DIR, skillName, 'SKILL.md');
  if (!fs.existsSync(skillFile)) {
    throw new Error(`Skill not found: ${skillName}`);
  }

  const content = fs.readFileSync(skillFile, 'utf8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  
  if (!match) return null;
  
  const metadata = {};
  const lines = match[1].split('\n');
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      metadata[key] = value;
    }
  }
  
  return metadata;
}

module.exports = {
  listSkills,
  getSkill,
  getSkillMetadata
};
