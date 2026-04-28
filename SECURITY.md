# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | ✅ Yes             |

## Reporting a Vulnerability

This package installs markdown files to your local filesystem. It does not:
- Make network requests
- Execute arbitrary code
- Access secrets or credentials
- Run with elevated privileges

However, if you discover a security issue (e.g., a path traversal in the install script), please report it responsibly.

### How to Report

1. **Do not** open a public issue for security vulnerabilities
2. Email **[INSERT EMAIL]** with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
3. You will receive a response within 48 hours
4. A fix will be released as soon as possible, with credit given unless you prefer anonymity

## Scope

Security issues in the following are in scope:
- `bin/install.js` — the CLI installer
- `package.json` — dependency chain (currently zero dependencies)
- File system operations during install/uninstall

The content of `SKILL.md` files (skill prompts) is **not** in scope for security reports — those are text files read by Claude, not executed code. If a skill crosses ethical lines, [open a regular issue](https://github.com/premdevai/brutal-claude-skills/issues).
