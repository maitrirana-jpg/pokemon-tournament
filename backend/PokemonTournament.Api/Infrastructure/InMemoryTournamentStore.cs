using System.Collections.Concurrent;
using PokemonTournament.Api.Domain;

namespace PokemonTournament.Api.Infrastructure;

/// <summary>Holds every Tournament for the life of the process; nothing survives a restart.</summary>
public sealed class InMemoryTournamentStore : ITournamentStore
{
    private readonly ConcurrentDictionary<Guid, RoundByRoundTournament> _byId = new();

    public void Add(RoundByRoundTournament tournament) => _byId[tournament.Id] = tournament;

    public RoundByRoundTournament? Find(Guid id) => _byId.GetValueOrDefault(id);
}
