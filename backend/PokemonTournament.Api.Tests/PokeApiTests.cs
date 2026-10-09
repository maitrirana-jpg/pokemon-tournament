using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using PokemonTournament.Api.Domain;

namespace PokemonTournament.Api.Tests;

public class PokeApiTests(TournamentApiFactory factory) : IClassFixture<TournamentApiFactory>
{
    private sealed record ErrorDto(string Error);

    private Task<HttpResponseMessage> PlayWith(IPokemonClient pokemon) =>
        factory
            .WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<IPokemonClient>();
                services.AddSingleton(pokemon);
            }))
            .CreateClient()
            .GetAsync("/pokemon/tournament/statistics?sortBy=wins");

    private static async Task AssertError(HttpResponseMessage response, HttpStatusCode status)
    {
        Assert.Equal(status, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ErrorDto>();
        Assert.False(string.IsNullOrWhiteSpace(body?.Error));
    }

    [Fact]
    public async Task Answers_504_when_PokeApi_times_out() =>
        await AssertError(
            await PlayWith(new FailingPokemonClient(new PokemonSourceTimeoutException("PokéAPI did not respond in time."))),
            HttpStatusCode.GatewayTimeout);

    [Fact]
    public async Task Answers_502_when_PokeApi_fails() =>
        await AssertError(
            await PlayWith(new FailingPokemonClient(new PokemonSourceException("PokéAPI answered 500."))),
            HttpStatusCode.BadGateway);

    [Fact]
    public async Task Fetches_all_contenders_in_parallel()
    {
        var response = await PlayWith(new GatedPokemonClient(SampleContenders.Sixteen, expected: 16));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
