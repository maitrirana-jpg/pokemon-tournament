# Pokémon Tournament

Sixteen random Pokémon from the original 151 play a round-robin Tournament, and the app reports each Contender's Record (wins, losses, ties).

- `backend/`: ASP.NET Core API (.NET 10) exposing `GET /pokemon/tournament/statistics`.
- `frontend/`: Angular 21 + Bootstrap 5 web app that plays a Tournament and lets you browse the results.

Domain terms (Tournament, Contender, Battle, Round-robin, Record) are defined in [GLOSSARY.md](GLOSSARY.md).

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 22.12+](https://nodejs.org/) (with npm; Angular 21 needs at least 22.12)
- Internet access: the API fetches Pokémon from [PokéAPI](https://pokeapi.co/), and the web app loads sprites from GitHub.

## Run

Start the API and the web app in two terminals.

```sh
# Terminal 1: API on http://localhost:5146
cd backend
dotnet run --project PokemonTournament.Api
```

```sh
# Terminal 2: web app on http://localhost:4200
cd frontend
npm install
npm start
```

Open http://localhost:4200. The Angular dev server proxies `/pokemon` to the API ([frontend/proxy.conf.json](frontend/proxy.conf.json)), so no CORS setup is needed.

To call the API directly:

```sh
curl "http://localhost:5146/pokemon/tournament/statistics?sortBy=wins&sortDirection=desc"
```

## Test

```sh
cd backend
dotnet test
```

```sh
cd frontend
npm install   # if not already done
npm test -- --watch=false
```

No test calls the real PokéAPI. The backend tests swap in fake Pokémon and a fixed Contender picker, and the frontend tests stub HTTP.

## API

`GET /pokemon/tournament/statistics?sortBy={wins|losses|ties|name|id}&sortDirection={asc|desc}`

Each request plays a new Tournament. It returns a JSON array of 16 Records:

```json
[{ "id": 25, "name": "pikachu", "type": "electric", "wins": 11, "losses": 3, "ties": 1 }]
```

| Status | When | Body |
| --- | --- | --- |
| 200 | OK | the array above |
| 400 | `sortBy` missing or empty | `{ "error": "sortBy parameter is required" }` |
| 400 | `sortBy` not one of the five fields | `{ "error": "sortBy parameter is invalid" }` |
| 400 | `sortDirection` not `asc`/`desc` | `{ "error": "sortDirection parameter is invalid" }` |
| 502 | PokéAPI failed or returned unusable data | `{ "error": "PokéAPI request failed" }` |
| 504 | PokéAPI did not answer within 5 seconds | `{ "error": "PokéAPI did not respond in time" }` |

## Architecture

Backend (`backend/PokemonTournament.Api`):

- `TournamentController`: thin. It validates the query, calls the service, and maps outcomes to HTTP status codes.
- `TournamentService`: plays one Tournament. It picks 16 ids, fetches them in parallel, runs the Round-robin, and sorts the Records. It is stateless.
- `RoundRobin`: plays every pair of Contenders once and tallies their Records. No I/O.
- `BattleService`: decides one Battle. No I/O.
- `IContenderPicker` / `RandomContenderPicker`: chooses the 16 ids.
- `IPokemonClient` / `PokeApiClient`, wrapped by `CachingPokemonClient`: fetches a Pokémon and maps it to the domain.

Randomness and PokéAPI sit behind interfaces because they are the two things a test cannot control. Swapping in a fixed picker and a fake client makes a whole Tournament deterministic and offline, so the tests can assert exact Records and failure handling.

Frontend (`frontend/src/app/tournament`):

- `TournamentApiService`: the typed HTTP call.
- `StatisticsPage`: holds the page state.
- Presentational components: `ContenderCard` and `StatTile`.
- Pure helpers for sorting (`sort-contenders.ts`) and display (`contender-display.ts`).

## Assumptions

**Eight vs sixteen.** The assessment brief (not included in this repo) contradicts itself about the number of Contenders. This implementation uses **16**. That means **120 Battles** per Tournament (16 × 15 / 2), and **15 Battles per Contender**, so every Record's wins + losses + ties = 15.

Defaults chosen where the brief was silent:

Contenders
- 16 distinct ids drawn uniformly from 1–151 (the original Pokémon) by shuffling the range, so there are never duplicates.
- A new random Tournament is played on every request. Nothing is stored between requests.

Battles
- A Pokémon's type is its primary type (PokéAPI type slot 1).
- The type rule decides a Battle first. Water beats Fire, Fire beats Grass, Grass beats Electric, Electric beats Water, Ghost beats Psychic, Psychic beats Fighting, Fighting beats Dark, Dark beats Ghost.
- With no type rule, including two Pokémon of the same type, the higher `base_experience` wins. Equal `base_experience` is a tie.
- A Pokémon with no `base_experience` in PokéAPI is treated as a PokéAPI failure (502). The API does not guess a value.

Sorting and validation
- `sortBy` is required, and an empty `sortBy` counts as missing.
- `sortDirection` defaults to `asc`.
- Both are matched case-insensitively. `sortBy` is checked before `sortDirection`, so a request with both wrong reports the `sortBy` error.
- Equal sort values are broken by `id` ascending. Names compare ordinally (by code point), not by culture.
- Error bodies are `{ "error": "..." }`, not ASP.NET's default ProblemDetails.

PokéAPI
- 5-second timeout and no retries. A timeout gives 504, and any other failure gives 502.
- Fetched Pokémon are cached in memory by id for the life of the process, because Gen-1 data never changes.

Web app
- The page plays one Tournament on load, with `sortBy=wins&sortDirection=desc`.
- After that, sorting happens client-side (same fields and tie-break as the API), so re-sorting never replays the Tournament. "New tournament" plays a fresh one and keeps the chosen sort.
- Paging is client-side: page sizes 4, 8 and 16, default 8.
- Medals are given by wins rank. Ranks 1–3 get 🏆, ranks 4–7 get 🥈, ranks 8–12 get 🥉, and the rest get none. Contenders with equal wins share a rank.
- Sprites are built client-side from the id (the PokéAPI sprites repository on GitHub), so the API contract stays exactly as specified.
- If the API call fails, the page shows an error card with a "Try again" button that plays a new Tournament.
- Bootstrap 5 comes from npm and is used for CSS and the grid only (no ng-bootstrap).
- Each type badge has its own colour, and types without one use grey.
- The win-rate bar is green at 75% or above and blue below.
