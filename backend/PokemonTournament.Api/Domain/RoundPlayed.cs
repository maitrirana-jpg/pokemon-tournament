namespace PokemonTournament.Api.Domain;

/// <summary>A Round just played, and where the Tournament stood right after it.</summary>
public sealed record RoundPlayed(
    Round Round, IReadOnlyList<ContenderRecord> Standings, int RoundsPlayed, TournamentStatus Status);
