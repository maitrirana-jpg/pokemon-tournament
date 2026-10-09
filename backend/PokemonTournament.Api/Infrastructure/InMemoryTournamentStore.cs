using PokemonTournament.Api.Domain;

namespace PokemonTournament.Api.Infrastructure;

/// <summary>Holds every Tournament for the life of the process; nothing survives a restart.</summary>
public sealed class InMemoryTournamentStore : ITournamentStore
{
    private readonly Lock _gate = new();
    private readonly Dictionary<Guid, RoundByRoundTournament> _byId = [];
    private readonly List<RoundByRoundTournament> _inStartOrder = [];

    public void Add(RoundByRoundTournament tournament)
    {
        lock (_gate)
        {
            _byId[tournament.Id] = tournament;
            _inStartOrder.Add(tournament);
        }
    }

    public RoundByRoundTournament? Find(Guid id)
    {
        lock (_gate) return _byId.GetValueOrDefault(id);
    }

    public IReadOnlyList<RoundByRoundTournament> All()
    {
        // Newest start first; Tournaments started at the same instant keep the order they were added in.
        lock (_gate)
            return _inStartOrder
                .Select((tournament, added) => (tournament, added))
                .OrderByDescending(t => t.tournament.StartedAt)
                .ThenByDescending(t => t.added)
                .Select(t => t.tournament)
                .ToList();
    }
}
