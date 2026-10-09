using PokemonTournament.Api.Domain;

namespace PokemonTournament.Api.Controllers;

/// <summary>A round-by-round Tournament as the API returns it.</summary>
public sealed record TournamentView(
    Guid Id,
    DateTimeOffset StartedAt,
    int RoundsPlayed,
    int TotalRounds,
    TournamentStatus Status,
    IReadOnlyList<ContenderRecord> Standings)
{
    public static TournamentView From(RoundByRoundTournament tournament) =>
        new(tournament.Id, tournament.StartedAt, tournament.RoundsPlayed, tournament.TotalRounds,
            tournament.Status, tournament.Standings());
}
