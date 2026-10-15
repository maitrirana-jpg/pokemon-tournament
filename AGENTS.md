# Pokémon Tournament

C# API (`backend/`) and Angular app (`frontend/`) that run a round-robin Pokémon tournament using data from PokéAPI.

## Layout

```
CLAUDE.md, AGENTS.md     this file (root rules)
README.md, GLOSSARY.md   run/test/API docs; domain terms
docs/
  architecture.md        how the code is laid out and why
  adr/                   architecture decision records
  runbooks/              repeatable procedures
  agents/                config read by the skills
.claude/
  settings.json          shared permissions
  hooks/                 hook scripts
  skills/                skills (one folder each, SKILL.md)
tools/
  scripts/               helper scripts (e.g. sync-scratch.mjs)
  prompts/               reusable prompts
.scratch/                local mirror of specs/tickets, plus reviews and notes
backend/AGENTS.md        backend rules
frontend/AGENTS.md       frontend rules
```

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues for `maitrirana-jpg/pokemon-tournament`, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the five default triage labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
