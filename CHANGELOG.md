# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.6.0] - 2026-05-08

### Added
- **production-readiness-reviewer** skill — a final gate reviewer that scans diffs across 12 dimensions (functional correctness, SSR/hydration, analytics, Statsig experiments, React lifecycle, async/race conditions, Redux/Zustand/RQ state, API/type safety, performance, platform parity, edge cases, test coverage) and emits exactly 3 compact tables: Dimension Scan, Issues (P0/P1/P2), and a Ship Decision verdict. Zero prose, zero noise.
- New keywords: `production-readiness`, `ship-check`, `pre-push`

## [0.1.0] - 2026-04-29

### Added
- Initial release with 13 skills
- **Brutal critics** (8 skills): code reviewer, writing editor, design critic, resume reviewer, pitch reviewer, readme reviewer, commit message reviewer, email reviewer
- **Adversarial thinking** (4 skills): devil's advocate, pre-mortem, BS detector, assumption auditor
- **Entertainment** (1 skill): roast mode
- Interactive CLI installer with `npx brutal-claude-skills`
- Support for `--all`, `--skill <name>`, `--list`, `--target <path>` flags
- Uninstall support via `--uninstall`
- Skill authoring documentation

[Unreleased]: https://github.com/premdevai/brutal-claude-skills/compare/v1.6.0...HEAD
[1.6.0]: https://github.com/premdevai/brutal-claude-skills/releases/tag/v1.6.0
[0.1.0]: https://github.com/premdevai/brutal-claude-skills/releases/tag/v0.1.0
