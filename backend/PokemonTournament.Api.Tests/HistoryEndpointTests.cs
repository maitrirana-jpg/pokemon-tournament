using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using PokemonTournament.Api.Domain;

namespace PokemonTournament.Api.Tests;

/// <summary>Each test gets its own API host, so the in-memory history starts empty.</summary>
public sealed class HistoryEndpointTests : IDisposable
{
    private readonly TournamentApiFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    private sealed record LeaderDto(int Id, string Name, int Wins);

    private sealed record EntryDto(
        Guid Id, DateTimeOffset StartedAt, int RoundsPlayed, int TotalRounds, string Status, LeaderDto? Leader);

    private sealed record StartedDto(Guid Id);

    /// <summary>A host whose clock moves on a minute every time it is read, so Tournaments get distinct start times.</summary>
    private WebApplicationFactory<Program> WithTickingClock() =>
        _factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(new TickingTimeProvider(TournamentApiFactory.Now, TimeSpan.FromMinutes(1)));
        }));

    private static async Task<List<EntryDto>> History(HttpClient client)
    {
        var response = await client.GetAsync("/pokemon/tournament/history");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<List<EntryDto>>())!;
    }

    private static async Task<Guid> Start(HttpClient client) =>
        (await (await client.PostAsync("/pokemon/tournament", null)).Content.ReadFromJsonAsync<StartedDto>())!.Id;

    [Fact]
    public async Task History_is_empty_before_any_tournament() =>
        Assert.Empty(await History(_factory.CreateClient()));

    [Fact]
    public async Task History_lists_tournaments_newest_first_with_progress_and_leader()
    {
        var client = WithTickingClock().CreateClient();
        var older = await Start(client);
        var newer = await Start(client);
        await client.PostAsync($"/pokemon/tournament/{older}/rounds", null);

        var history = await History(client);

        Assert.Equal([newer, older], history.Select(e => e.Id));
        Assert.True(history[0].StartedAt > history[1].StartedAt);

        Assert.Equal((0, 15, "inProgress"), (history[0].RoundsPlayed, history[0].TotalRounds, history[0].Status));
        Assert.Null(history[0].Leader);

        // The leader is whoever tops the standings (wins, then id) after Round 1.
        var standings = await client.GetFromJsonAsync<StandingsDto>($"/pokemon/tournament/{older}");
        var top = standings!.Standings[0];
        Assert.Equal(1, history[1].RoundsPlayed);
        Assert.Equal(new LeaderDto(top.Id, top.Name, top.Wins), history[1].Leader);
        Assert.Equal(1, top.Wins);
    }

    private sealed record ContenderDto(int Id, string Name, int Wins);

    private sealed record StandingsDto(List<ContenderDto> Standings);

    [Fact]
    public async Task A_failed_start_leaves_no_trace_in_history()
    {
        var client = _factory
            .WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<IPokemonClient>();
                services.AddSingleton<IPokemonClient>(new FailingPokemonClient(new PokemonSourceException("PokéAPI answered 500.")));
            }))
            .CreateClient();

        Assert.Equal(HttpStatusCode.BadGateway, (await client.PostAsync("/pokemon/tournament", null)).StatusCode);
        Assert.Empty(await History(client));
    }

    [Fact]
    public async Task Instant_v1_tournaments_are_not_kept_in_history()
    {
        var client = _factory.CreateClient();

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/pokemon/tournament/statistics?sortBy=wins")).StatusCode);
        Assert.Empty(await History(client));
    }
}
