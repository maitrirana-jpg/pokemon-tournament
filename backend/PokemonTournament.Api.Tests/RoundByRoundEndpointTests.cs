using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using PokemonTournament.Api.Domain;

namespace PokemonTournament.Api.Tests;

public class RoundByRoundEndpointTests(TournamentApiFactory factory) : IClassFixture<TournamentApiFactory>
{
    private sealed record ErrorDto(string Error);

    private sealed record ContenderDto(int Id, string Name, string Type, int Wins, int Losses, int Ties);

    private sealed record TournamentDto(
        Guid Id, DateTimeOffset StartedAt, int RoundsPlayed, int TotalRounds, string Status, List<ContenderDto> Standings);

    private async Task<(HttpResponseMessage Response, TournamentDto Tournament)> Start()
    {
        var response = await factory.CreateClient().PostAsync("/pokemon/tournament", null);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (response, (await response.Content.ReadFromJsonAsync<TournamentDto>())!);
    }

    [Fact]
    public async Task Starting_a_tournament_shows_all_sixteen_contenders_even()
    {
        var (_, tournament) = await Start();

        Assert.Equal(0, tournament.RoundsPlayed);
        Assert.Equal(15, tournament.TotalRounds);
        Assert.Equal("inProgress", tournament.Status);
        Assert.Equal(TournamentApiFactory.Now, tournament.StartedAt);
        Assert.Equal(
            SampleContenders.Sixteen.Select(p => (p.Id, p.Name, p.Type)).OrderBy(c => c.Id),
            tournament.Standings.Select(c => (c.Id, c.Name, c.Type)).OrderBy(c => c.Id));
        Assert.All(tournament.Standings, c => Assert.Equal((0, 0, 0), (c.Wins, c.Losses, c.Ties)));
    }

    [Fact]
    public async Task A_started_tournament_can_be_fetched_back_from_its_location()
    {
        var (response, started) = await Start();

        var fetched = await factory.CreateClient().GetFromJsonAsync<TournamentDto>(response.Headers.Location);

        Assert.Equal(started.Id, fetched!.Id);
        Assert.Equal(started.StartedAt, fetched.StartedAt);
        Assert.Equal(started.Standings, fetched.Standings);
    }

    [Fact]
    public async Task An_unknown_tournament_is_not_found()
    {
        var response = await factory.CreateClient().GetAsync($"/pokemon/tournament/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("""{"error":"tournament not found"}""", await response.Content.ReadAsStringAsync());
    }

    [Theory]
    [InlineData(true, HttpStatusCode.GatewayTimeout, "PokéAPI did not respond in time")]
    [InlineData(false, HttpStatusCode.BadGateway, "PokéAPI request failed")]
    public async Task Starting_fails_like_v1_when_PokeApi_fails(bool timeout, HttpStatusCode status, string error)
    {
        Exception failure = timeout
            ? new PokemonSourceTimeoutException("PokéAPI did not respond in time.")
            : new PokemonSourceException("PokéAPI answered 500.");
        var client = factory
            .WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<IPokemonClient>();
                services.AddSingleton<IPokemonClient>(new FailingPokemonClient(failure));
            }))
            .CreateClient();

        var response = await client.PostAsync("/pokemon/tournament", null);

        Assert.Equal(status, response.StatusCode);
        Assert.Equal(error, (await response.Content.ReadFromJsonAsync<ErrorDto>())!.Error);
    }
}
