namespace PokemonTournament.Api.Domain;

/// <summary>A Tournament played one Round at a time and kept so it can be reviewed later.</summary>
public sealed class RoundByRoundTournament(Guid id, DateTimeOffset startedAt, IReadOnlyList<Pokemon> contenders)
{
    public Guid Id => id;
    public DateTimeOffset StartedAt => startedAt;
    public IReadOnlyList<Pokemon> Contenders => contenders;

    /// <summary>Every Contender meets every other once, one Battle each per Round.</summary>
    public int TotalRounds => contenders.Count - 1;
    public int RoundsPlayed => 0;
    public TournamentStatus Status => RoundsPlayed == TotalRounds ? TournamentStatus.Complete : TournamentStatus.InProgress;

    /// <summary>Every Contender's Record so far, by wins descending then id ascending.</summary>
    public IReadOnlyList<ContenderRecord> Standings() =>
        contenders
            .Select(p => new ContenderRecord(p.Id, p.Name, p.Type, 0, 0, 0))
            .OrderByDescending(r => r.Wins)
            .ThenBy(r => r.Id)
            .ToList();
}
