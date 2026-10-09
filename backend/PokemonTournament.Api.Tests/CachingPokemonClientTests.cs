using PokemonTournament.Api.Domain;
using PokemonTournament.Api.Infrastructure;

namespace PokemonTournament.Api.Tests;

public class CachingPokemonClientTests
{
    private static readonly Pokemon Pikachu = new(25, "pikachu", "electric", 112);

    [Fact]
    public async Task Fetches_a_pokemon_from_the_source_only_once()
    {
        var source = new CountingPokemonClient(new FakePokemonClient([Pikachu]));
        var client = new CachingPokemonClient(source);

        var first = await client.GetAsync(25, CancellationToken.None);
        var second = await client.GetAsync(25, CancellationToken.None);

        Assert.Equal(Pikachu, first);
        Assert.Equal(Pikachu, second);
        Assert.Equal(1, source.Calls);
    }
}
