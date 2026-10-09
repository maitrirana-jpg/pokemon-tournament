namespace PokemonTournament.Api.Domain;

/// <summary>A Tournament played one Round at a time and kept so it can be reviewed later.</summary>
public sealed class RoundByRoundTournament(Guid id, DateTimeOffset startedAt, IReadOnlyList<Pokemon> contenders)
{
    private readonly IReadOnlyList<IReadOnlyList<(int First, int Second)>> _schedule = RoundSchedule.For(contenders.Count);
    private readonly List<Round> _rounds = [];
    private readonly Lock _gate = new();

    public Guid Id => id;
    public DateTimeOffset StartedAt => startedAt;
    public IReadOnlyList<Pokemon> Contenders => contenders;

    /// <summary>Every Contender meets every other once, one Battle each per Round.</summary>
    public int TotalRounds => _schedule.Count;

    public int RoundsPlayed
    {
        get { lock (_gate) return _rounds.Count; }
    }

    public TournamentStatus Status => RoundsPlayed == TotalRounds ? TournamentStatus.Complete : TournamentStatus.InProgress;

    /// <summary>
    /// Plays the next scheduled Round. One caller at a time, so concurrent calls play consecutive Rounds,
    /// and each gets the standings as they were right after its own Round.
    /// </summary>
    /// <exception cref="TournamentCompleteException">Every Round has been played.</exception>
    public RoundPlayed PlayNextRound(BattleService battles)
    {
        lock (_gate)
        {
            if (_rounds.Count == TotalRounds)
                throw new TournamentCompleteException();

            var number = _rounds.Count + 1;
            var firstBattleId = (number - 1) * _schedule[0].Count + 1;
            var round = new Round(number, _schedule[number - 1]
                .Select((pair, i) =>
                {
                    var (first, second) = (contenders[pair.First], contenders[pair.Second]);
                    var (outcome, reason) = battles.Decide(first, second);
                    return new Battle(firstBattleId + i, number, first, second, outcome, reason);
                })
                .ToList());

            _rounds.Add(round);
            return new RoundPlayed(round, Standings(), RoundsPlayed, Status);
        }
    }

    /// <summary>Every Contender's Record so far, by wins descending then id ascending.</summary>
    public IReadOnlyList<ContenderRecord> Standings()
    {
        List<Battle> played;
        lock (_gate) played = _rounds.SelectMany(r => r.Battles).ToList();

        int Count(int contenderId, Func<Battle, bool> counts) =>
            played.Count(b => (b.First.Id == contenderId || b.Second.Id == contenderId) && counts(b));

        return contenders
            .Select(p => new ContenderRecord(
                p.Id, p.Name, p.Type,
                Wins: Count(p.Id, b => b.WinnerId == p.Id),
                Losses: Count(p.Id, b => b.WinnerId is { } winner && winner != p.Id),
                Ties: Count(p.Id, b => b.WinnerId is null)))
            .OrderByDescending(r => r.Wins)
            .ThenBy(r => r.Id)
            .ToList();
    }
}
