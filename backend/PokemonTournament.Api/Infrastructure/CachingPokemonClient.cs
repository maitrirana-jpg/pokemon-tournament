using System.Collections.Concurrent;
using PokemonTournament.Api.Domain;

namespace PokemonTournament.Api.Infrastructure;

/// <summary>Remembers every Pokémon the wrapped client fetched, for the life of the process.</summary>
public sealed class CachingPokemonClient(IPokemonClient inner) : IPokemonClient
{
    private readonly ConcurrentDictionary<int, Pokemon> _byId = new();

    public async Task<Pokemon> GetAsync(int id, CancellationToken cancellationToken)
    {
        if (_byId.TryGetValue(id, out var cached))
            return cached;

        var pokemon = await inner.GetAsync(id, cancellationToken);
        _byId.TryAdd(id, pokemon);
        return pokemon;
    }
}
