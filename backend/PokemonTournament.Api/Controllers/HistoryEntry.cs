using PokemonTournament.Api.Domain;

namespace PokemonTournament.Api.Controllers;

/// <summary>One Tournament in the history list.</summary>
public sealed record HistoryEntry(
    Guid Id,
    DateTimeOffset StartedAt,
    int RoundsPlayed,
    int TotalRounds,
    TournamentStatus Status,
    HistoryEntry.LeaderView? Leader)
{
    /// <summary>The Contender topping the standings.</summary>
    public sealed record LeaderView(int Id, string Name, int Wins);

    public static HistoryEntry From(RoundByRoundTournament tournament) =>
        new(
            tournament.Id, tournament.StartedAt, tournament.RoundsPlayed, tournament.TotalRounds, tournament.Status,
            tournament.Leader() is { } leader ? new LeaderView(leader.Id, leader.Name, leader.Wins) : null);
}
