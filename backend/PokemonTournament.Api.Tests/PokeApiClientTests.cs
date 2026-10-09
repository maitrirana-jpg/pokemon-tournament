using System.Net;
using System.Text;
using PokemonTournament.Api.Domain;
using PokemonTournament.Api.Infrastructure;

namespace PokemonTournament.Api.Tests;

public class PokeApiClientTests
{
    /// <summary>Answers every request with the same JSON body.</summary>
    private sealed class CannedHandler(string json) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json"),
            });
    }

    private static PokeApiClient ClientAnswering(string json) =>
        new(new HttpClient(new CannedHandler(json)) { BaseAddress = new Uri("https://pokeapi.test/") });

    [Fact]
    public async Task Maps_the_primary_type_and_base_experience()
    {
        var client = ClientAnswering("""
            {"id":1,"name":"bulbasaur","base_experience":64,
             "types":[{"slot":2,"type":{"name":"poison"}},{"slot":1,"type":{"name":"grass"}}]}
            """);

        Assert.Equal(new Pokemon(1, "bulbasaur", "grass", 64), await client.GetAsync(1, CancellationToken.None));
    }

    [Fact]
    public async Task Rejects_a_pokemon_without_base_experience()
    {
        var client = ClientAnswering("""
            {"id":1,"name":"bulbasaur","base_experience":null,
             "types":[{"slot":1,"type":{"name":"grass"}}]}
            """);

        await Assert.ThrowsAsync<PokemonSourceException>(() => client.GetAsync(1, CancellationToken.None));
    }
}
