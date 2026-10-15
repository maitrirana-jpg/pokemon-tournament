# Frontend

Angular 21 + Bootstrap 5 (CSS and grid only, no ng-bootstrap). Layout: [docs/architecture.md](../docs/architecture.md).

- `src/app/tournament/`: pages (`*-page/`), presentational components, typed API services (`round-by-round-api.ts`, `tournament-api.ts`) and pure helpers (`sort-contenders.ts`, `contender-display.ts`).
- The dev server proxies `/pokemon` to the API ([proxy.conf.json](proxy.conf.json)).

## Commands

```sh
npm install
npm start                    # http://localhost:4200
npm test -- --watch=false
```

## Rules

- Format with Prettier ([.prettierrc](.prettierrc)): single quotes, width 100.
- Tests stub HTTP; never hit the real API or PokéAPI.
- v1's `TournamentApiService` and `/classic` are frozen; v2 uses its own service.
