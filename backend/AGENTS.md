# Backend

ASP.NET Core API (.NET 10). Layout and responsibilities: [docs/architecture.md](../docs/architecture.md).

- `PokemonTournament.Api/Controllers/`: thin HTTP layer. Validate, call a service, map outcomes to status codes.
- `PokemonTournament.Api/Domain/`: Tournament rules. No I/O; randomness, PokéAPI, storage and the clock sit behind interfaces.
- `PokemonTournament.Api/Infrastructure/`: implementations of those interfaces (PokéAPI client, cache, in-memory store).
- `PokemonTournament.Api.Tests/`: endpoint tests via `TournamentApiFactory` with the fakes in `Fakes.cs`. No test calls the real PokéAPI.

## Commands

```sh
dotnet run --project PokemonTournament.Api   # http://localhost:5146
dotnet test
```

## Rules

- Error bodies are `{ "error": "..." }`, never ProblemDetails.
- Use the terms in [GLOSSARY.md](../GLOSSARY.md) for type and member names.
- v1 (Classic) behaviour is frozen; change it only when an issue says so.
