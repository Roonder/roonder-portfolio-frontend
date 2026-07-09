# SDD Testing Capabilities — roonder-portfolio-frontend

**Strict TDD Mode**: disabled
**Detected**: 2026-07-09
**Package manager**: Bun (`bun.lock`)
**Config source**: `openspec/config.yaml` `testing:` block

## Test Runner

- Command: —
- Framework: — (no test runner configured)

## Test Layers

| Layer       | Available | Tool        |
| ----------- | --------- | ----------- |
| Unit        | ❌        | —           |
| Integration | ❌        | —           |
| E2E         | ❌        | —           |

## Coverage

- Available: ❌
- Command: —

## Quality Tools

| Tool         | Available | Command                  |
| ------------ | --------- | ------------------------ |
| Linter       | ❌        | —                        |
| Type checker | ✅        | `bun run typecheck` (alias `npm run typecheck`) |
| Formatter    | ❌ (config only) | — (`.prettierrc` present, prettier not installed) |

## Notes

- `bun run typecheck` runs `react-router typegen && tsc` and is the only automated quality gate today.
- `tsconfig.json` has `"strict": true`; treat any new file as type-checked by default.
- Recommend introducing Vitest + React Testing Library (unit/component) and Playwright (E2E) in a dedicated SDD change before relying on TDD-style phases.
- When a test runner is added, flip `openspec/config.yaml` `testing.strict_tdd` to `true` and set `rules.apply.test_command` accordingly.
