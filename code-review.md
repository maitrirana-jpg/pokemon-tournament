# Code review: #2 Tracer bullet

- **Branch:** `2-tracer-bullet`
- **Fixed point:** `main` (merge-base `0e797f8`)
- **Commits reviewed:**
  - `f161784` Play a Tournament end to end (tracer bullet)
  - `36825bf` Pin rootDir in frontend tsconfigs
- **Spec:** #2, with #1 for design decisions. Work owned by #3–#7 was excluded.
- **Tests:** backend 19/19 pass, frontend 1/1 pass.

## Standards

**Sources:**
- `AGENTS.md`
- `GLOSSARY.md`
- `docs/agents/domain.md`
- `frontend/.editorconfig`
- `frontend/.prettierrc`
- the code-smell checklist (Fowler, *Refactoring* ch.3)

### Definite breaks

1. **Lines over the 100-character limit.** `frontend/.prettierrc` sets `printWidth: 100`, but nothing runs Prettier automatically, so these weren't caught.
   - `frontend/src/app/tournament/statistics-page/statistics-page.html:12-14`: the Wins, Losses and Ties lines.
   - `frontend/src/app/tournament/statistics-page/statistics-page.spec.ts:29`: the `it(...)` title.
   - `frontend/src/app/tournament/statistics-page/statistics-page.spec.ts:42`: the `querySelectorAll` line.
2. **Missing trailing commas (minor).** These lines come from the Angular starter project.
   - `frontend/src/app/app.config.ts:11`
   - `frontend/src/app/app.ts:9`

### Judgement calls

These are judgement calls, not rule violations.

3. **Naming vs the glossary.** `GLOSSARY.md` says to avoid "statistics". The route `pokemon/tournament/statistics` comes from the spec, so it stays. `StatisticsPage`, `app-statistics-page` and `StatisticsEndpointTests` could be renamed to "Standings" or "Records".
4. **Plain strings standing in for domain concepts.**
   - `TournamentController.cs:12-13` takes `sortBy` and `sortDirection` as plain strings, while the frontend already has `SortField` and `SortDirection` types. This is deferred to #3.
   - A Pokémon type is also a plain string, in `Pokemon.Type` and in the rule table in `BattleService.cs:6-16`.
5. **Same fields declared three times.** `Id, Name, Type, Wins, Losses, Ties` appears in:
   - `ContenderRecord.cs`
   - the test response type in `StatisticsEndpointTests.cs:8`
   - `contender-record.ts`

   The test copy is defensible because it pins the wire format.
6. **Parallel arrays.** `RoundRobin.cs:8-10` keeps separate `wins`, `losses` and `ties` arrays. One small tally per Contender would remove the index bookkeeping.
7. **Types in the wrong file.** `SortField` and `SortDirection` live in `contender-record.ts`; they belong in `tournament-api.ts`.
8. **Sorting in the controller.** `TournamentController.cs:19-22` sorts the results itself instead of leaving it to `TournamentService`. It should move when #3 lands.

## Spec

### Missing or partial

1. **PokéAPI client defaults are missing.** #1 says: "5-second timeout, no retries; successfully fetched Pokémon cached in memory by id for the process lifetime".
   - No timeout is set, so the HttpClient default of 100 seconds applies.
   - `PokeApiClient` has no in-memory cache.
   - #4 may cover the timeout, but no ticket clearly owns the cache.
2. **Angular service name (minor).** #1 names it `TournamentApiService`; the class is `TournamentApi` in `frontend/src/app/tournament/tournament-api.ts:8`.

### Not asked for

3. **Missing `base_experience` silently becomes 0.** `PokeApiClient.cs:14` uses `dto.BaseExperience ?? 0`. No spec line covers this, and it changes Battle results without anyone knowing. It should be reported as a failure instead.
4. **Header and page background colour.** The "Pokémon League" header (`statistics-page.html:2`) and the page background (`styles.scss:3-5`) are #6's job. #2 only asks for "simple Bootstrap cards (name, type, wins / losses / ties)".
5. **Starter-project leftovers.** The default Angular `frontend/README.md` (#7 will replace it) and `frontend/.vscode/mcp.json`. There is also a small `GLOSSARY.md` edit outside #2's scope.

### Done, but looks wrong

6. **`sortBy` is ignored.** The endpoint always sorts by wins, so `sortBy=name` quietly returns the wins order. This is deliberately deferred to #3, but it's a trap if #3 slips.
7. **Equal wins aren't ordered by `id`.** #1 says: "ties broken by `id` ascending". Contenders with equal wins come back in the picker's random order.
8. **Test gap.** #2 says: "same-type and unruled types fall to base_experience". No test covers two Pokémon of the same type with equal `base_experience` (e.g. Fire vs Fire), which should tie.

## Summary

| Axis | Findings | Worst issue |
| --- | --- | --- |
| Standards | 2 definite breaks, 6 judgement calls | Five lines over the 100-character limit |
| Spec | 8 (all #2 acceptance criteria met) | Missing 5-second timeout and in-memory cache |
