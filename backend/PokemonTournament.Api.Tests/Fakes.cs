using PokemonTournament.Api.Domain;

namespace PokemonTournament.Api.Tests;

/// <summary>Always "picks" the same Contenders so a Tournament is predictable.</summary>
internal sealed class FixedContenderPicker(IReadOnlyList<int> ids) : IContenderPicker
{
    public IReadOnlyList<int> Pick() => ids;
}

/// <summary>Stands in for PokéAPI with hand-made Pokémon.</summary>
internal sealed class FakePokemonClient(IEnumerable<Pokemon> pokemon) : IPokemonClient
{
    private readonly Dictionary<int, Pokemon> _byId = pokemon.ToDictionary(p => p.Id);

    public Task<Pokemon> GetAsync(int id, CancellationToken cancellationToken) =>
        Task.FromResult(_byId[id]);
}

internal static class SampleContenders
{
    /// <summary>16 real Gen-1 Pokémon (primary type, base_experience as in PokéAPI).</summary>
    public static readonly IReadOnlyList<Pokemon> Sixteen =
    [
        new(1, "bulbasaur", "grass", 64),
        new(4, "charmander", "fire", 62),
        new(7, "squirtle", "water", 63),
        new(25, "pikachu", "electric", 112),
        new(37, "vulpix", "fire", 60),
        new(38, "ninetales", "fire", 177),
        new(54, "psyduck", "water", 64),
        new(63, "abra", "psychic", 62),
        new(66, "machop", "fighting", 61),
        new(92, "gastly", "ghost", 62),
        new(94, "gengar", "ghost", 250),
        new(95, "onix", "rock", 77),
        new(133, "eevee", "normal", 65),
        new(143, "snorlax", "normal", 189),
        new(149, "dragonite", "dragon", 270),
        new(150, "mewtwo", "psychic", 340),
    ];

    public static IReadOnlyList<int> Ids => Sixteen.Select(p => p.Id).ToArray();
}
