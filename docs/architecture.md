# Architecture

How the code is laid out and why. Domain terms are defined in [GLOSSARY.md](../GLOSSARY.md); decisions are recorded in [adr/](adr/).

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
