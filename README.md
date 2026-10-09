# Pokémon Tournament

Sixteen random Pokémon from the original 151 play a round-robin Tournament, and the app reports each Contender's Record (wins, losses, ties). There are two ways to play:

- **Round by round** (v2, the main page): start a Tournament, play it one Round of 8 Battles at a time, review any earlier Round or Battle, and reopen past Tournaments from the history.
- **Classic** (v1, `/classic`): play a whole Tournament instantly and browse the final Records. v1 is unchanged for existing customers.

The code is split in two:

- `backend/`: ASP.NET Core API (.NET 10).
- `frontend/`: Angular 21 + Bootstrap 5 web app.

Domain terms (Tournament, Contender, Battle, Round-robin, Record, Round, Standings, Leader) are defined in [GLOSSARY.md](GLOSSARY.md).

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

Open http://localhost:4200 for the round-by-round view. The "Classic view" button at the bottom of the page (or http://localhost:4200/classic) opens v1, and "Tournament history" lists past Tournaments. The Angular dev server proxies `/pokemon` to the API ([frontend/proxy.conf.json](frontend/proxy.conf.json)), so no CORS setup is needed.

To call the API directly:

```sh
# Classic: play a whole Tournament
curl "http://localhost:5146/pokemon/tournament/statistics?sortBy=wins&sortDirection=desc"

# Round by round: start, then play the next Round (use the id from the first response)
curl -X POST http://localhost:5146/pokemon/tournament
curl -X POST http://localhost:5146/pokemon/tournament/{id}/rounds
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

Every error the API reports itself has the body `{ "error": "..." }`; a malformed id (not a GUID, or a non-numeric Round or Battle number) matches no route and gets an empty 404. Any endpoint that fetches from PokéAPI answers 502 if PokéAPI fails or returns unusable data (`"PokéAPI request failed"`), and 504 if it doesn't answer within 5 seconds (`"PokéAPI did not respond in time"`).

### Round by round

| Method and path | Success | Errors |
| --- | --- | --- |
| `POST /pokemon/tournament` | 201 + Tournament, with a `Location` header | 502, 504 (nothing is stored) |
| `GET /pokemon/tournament/{id}` | 200 + Tournament | 404 `tournament not found` |
| `POST /pokemon/tournament/{id}/rounds` | 200 + Round played | 404 `tournament not found`, 409 `tournament is complete` |
| `GET /pokemon/tournament/{id}/rounds/{roundNumber}` | 200 + Round | 404 `tournament not found` / `round not found` |
| `GET /pokemon/tournament/{id}/battles/{battleId}` | 200 + Battle | 404 `tournament not found` / `battle not found` |
| `GET /pokemon/tournament/history` | 200 + history entries, newest first | none |

A Round or Battle that hasn't been played yet is "not found". Responses are camelCase JSON:

```jsonc
// Tournament
{ "id": "3f2a…", "startedAt": "2026-10-09T12:00:00+00:00", "roundsPlayed": 0, "totalRounds": 15,
  "status": "inProgress",            // or "complete" after Round 15
  "standings": [{ "id": 25, "name": "pikachu", "type": "electric", "wins": 0, "losses": 0, "ties": 0 }] }

// Round played
{ "round": { "number": 1, "battles": [/* 8 Battles */] },
  "standings": [/* 16 Records */], "roundsPlayed": 1, "status": "inProgress" }

// Battle
{ "id": 8, "round": 1,
  "first":  { "id": 63, "name": "abra",   "type": "psychic",  "baseExperience": 62 },
  "second": { "id": 66, "name": "machop", "type": "fighting", "baseExperience": 61 },
  "outcome": "firstWins",            // or "secondWins", "tie"
  "winnerId": 63,                    // null on a tie
  "reason": "typeAdvantage" }        // or "baseExperience", "equalBaseExperience"

// History entry
{ "id": "3f2a…", "startedAt": "…", "roundsPlayed": 4, "totalRounds": 15, "status": "inProgress",
  "leader": { "id": 94, "name": "gengar", "wins": 4 } }   // null before Round 1
```

### Classic

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

- `TournamentController`: thin. It validates input, calls `TournamentService` (Classic) or `RoundByRoundService` (round by round), and maps outcomes to HTTP status codes.
- `TournamentService`: plays one Tournament. It picks 16 ids, fetches them in parallel, runs the Round-robin, and sorts the Records. It is stateless.
- `RoundRobin`: plays every pair of Contenders once and tallies their Records. No I/O.
- `BattleService`: decides one Battle. No I/O.
- `IContenderPicker` / `RandomContenderPicker`: chooses the 16 ids.
- `IPokemonClient` / `PokeApiClient`, wrapped by `CachingPokemonClient`: fetches a Pokémon and maps it to the domain.

Round by round, built on the same picker, client and Battle rules:

- `RoundByRoundService`: starts a Tournament (pick, fetch, store), plays its next Round, and lists the history.
- `RoundByRoundTournament`: one Tournament and every Round and Battle played so far. It plays Rounds under a lock, so two simultaneous requests play two consecutive Rounds. Its Standings and Leader are always worked out from the Battles played, never stored separately.
- `RoundSchedule`: pairs the 16 Contenders into 15 Rounds of 8 Battles by the circle method. No I/O.
- `BattleService.Decide`: decides a Battle and says which rule settled it. Classic's `Resolve` uses the same rules.
- `ITournamentStore` / `InMemoryTournamentStore`: keeps Tournaments for the life of the process.

Randomness and PokéAPI sit behind interfaces because they are the two things a test cannot control. Swapping in a fixed picker and a fake client makes a whole Tournament deterministic and offline, so the tests can assert exact Records and failure handling. The clock is injected (`TimeProvider`) for the same reason. The Tournament store sits behind an interface so a database could replace memory later without touching the flow.

Frontend (`frontend/src/app/tournament`):

- `RoundByRoundApiService`: typed calls to the round-by-round endpoints.
- `RoundByRoundPage` (`/` and `/tournament/:id`): Start, Process Round, the Round picker, Battle detail and the Standings grid.
- `HistoryPage` (`/history`): past Tournaments.
- `TournamentApiService` and `StatisticsPage` (`/classic`): the v1 view.
- Presentational components: `ContenderCard` and `StatTile`.
- Pure helpers for sorting (`sort-contenders.ts`) and display (`contender-display.ts`).

## Assumptions

**Eight vs sixteen.** The assessment brief (not included in this repo) contradicts itself about the number of Contenders. This implementation uses **16**. That means **120 Battles** per Tournament (16 × 15 / 2), and **15 Battles per Contender**, so every Record's wins + losses + ties = 15.

Defaults chosen where the brief was silent:

Contenders
- 16 distinct ids drawn uniformly from 1–151 (the original Pokémon) by shuffling the range, so there are never duplicates.
- Classic plays a new random Tournament on every request and stores nothing.

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

Classic web app (`/classic`)
- The page plays one Tournament on load, with `sortBy=wins&sortDirection=desc`.
- After that, sorting happens client-side (same fields and tie-break as the API), so re-sorting never replays the Tournament. "New tournament" plays a fresh one and keeps the chosen sort.
- Paging is client-side: page sizes 4, 8 and 16, default 8.
- Medals are given by wins rank. Ranks 1–3 get 🏆, ranks 4–7 get 🥈, ranks 8–12 get 🥉, and the rest get none. Contenders with equal wins share a rank.
- Sprites are built client-side from the id (the PokéAPI sprites repository on GitHub), so the API contract stays exactly as specified.
- If the API call fails, the page shows an error card with a "Try again" button that plays a new Tournament.
- Bootstrap 5 comes from npm and is used for CSS and the grid only (no ng-bootstrap).
- Each type badge has its own colour, and types without one use grey.
- The win-rate bar is green at 75% or above and blue below.

Round by round
- Pairings come from a fixed schedule set when the Tournament starts (the circle method: the first Contender stays put and the others rotate). Only the results are revealed Round by Round. Over 15 Rounds every pair meets exactly once, and the final Records equal a Classic Tournament's for the same 16.
- Battle ids run 1–120 in play order, so Round *r* holds Battles 8(r−1)+1 to 8r. Tournament ids are GUIDs.
- Each Battle records the rule that decided it: type advantage, higher base experience, or equal base experience (a tie).
- Standings are ordered by wins, then by id. The Leader is the top of the Standings; there is no Leader before Round 1.
- Tournaments live in memory with no cap and are lost when the server restarts. There is no database.
- Rounds of one Tournament are played one at a time, so simultaneous Process Round requests play consecutive Rounds.
- History lists only round-by-round Tournaments, newest first. Classic Tournaments are not stored, and a failed Start leaves no trace.
- Medals in the round-by-round view appear from Round 1 onwards and use the same wins-rank rule as Classic.
- Opening `/tournament/{id}` for a Tournament that no longer exists (for example after a restart) shows "Tournament not found".
- Web routes: `/` is the round-by-round view, `/tournament/{id}` reopens one Tournament, `/history` lists them, and `/classic` is v1, reached from a "Classic view" button at the bottom of the main page.
- The round-by-round view talks to the API through its own typed service (`RoundByRoundApiService`); v1's `TournamentApiService` is untouched.
