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

    private sealed record PokemonDto(int Id, string Name, string Type, int BaseExperience);

    private sealed record BattleDto(
        int Id, int Round, PokemonDto First, PokemonDto Second, string Outcome, int? WinnerId, string Reason);

    private sealed record RoundDto(int Number, List<BattleDto> Battles);

    private sealed record RoundPlayedDto(RoundDto Round, List<ContenderDto> Standings, int RoundsPlayed, string Status);

    private async Task<RoundPlayedDto> ProcessRound(Guid id)
    {
        var response = await factory.CreateClient().PostAsync($"/pokemon/tournament/{id}/rounds", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<RoundPlayedDto>())!;
    }

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

    [Fact]
    public async Task Processing_a_round_pairs_every_contender_into_eight_battles()
    {
        var (_, tournament) = await Start();

        var played = await ProcessRound(tournament.Id);

        Assert.Equal(1, played.Round.Number);
        Assert.Equal(8, played.Round.Battles.Count);
        Assert.Equal(Enumerable.Range(1, 8), played.Round.Battles.Select(b => b.Id));
        Assert.Equal(
            SampleContenders.Ids.Order(),
            played.Round.Battles.SelectMany(b => new[] { b.First.Id, b.Second.Id }).Order());
        Assert.Equal(1, played.RoundsPlayed);
        Assert.Equal("inProgress", played.Status);
        Assert.All(played.Standings, c => Assert.Equal(1, c.Wins + c.Losses + c.Ties));
    }

    private async Task<(TournamentDto Tournament, List<RoundPlayedDto> Rounds)> PlayAllRounds()
    {
        var (_, tournament) = await Start();
        var rounds = new List<RoundPlayedDto>();
        for (var i = 0; i < 15; i++)
            rounds.Add(await ProcessRound(tournament.Id));
        return (tournament, rounds);
    }

    [Fact]
    public async Task Fifteen_rounds_play_every_pair_exactly_once()
    {
        var (_, rounds) = await PlayAllRounds();
        var battles = rounds.SelectMany(r => r.Round.Battles).ToList();

        Assert.Equal(Enumerable.Range(1, 15), rounds.Select(r => r.Round.Number));
        Assert.All(rounds, r => Assert.Equal(16, r.Round.Battles.SelectMany(b => new[] { b.First.Id, b.Second.Id }).Distinct().Count()));
        Assert.Equal(Enumerable.Range(1, 120), battles.Select(b => b.Id));
        Assert.Equal(120, battles.Select(b => (Math.Min(b.First.Id, b.Second.Id), Math.Max(b.First.Id, b.Second.Id))).Distinct().Count());
        Assert.Equal("complete", rounds[^1].Status);
        Assert.Equal(15, rounds[^1].RoundsPlayed);
    }

    [Fact]
    public async Task Final_standings_match_the_instant_tournament_for_the_same_contenders()
    {
        var (_, rounds) = await PlayAllRounds();
        var instant = await factory.CreateClient().GetFromJsonAsync<List<ContenderDto>>(
            "/pokemon/tournament/statistics?sortBy=id");

        Assert.Equal(instant!, rounds[^1].Standings.OrderBy(c => c.Id));
    }

    [Fact]
    public async Task Standings_are_ordered_by_wins_then_id()
    {
        var (_, rounds) = await PlayAllRounds();

        Assert.All(rounds, r => Assert.Equal(r.Standings.OrderByDescending(c => c.Wins).ThenBy(c => c.Id), r.Standings));
    }

    [Fact]
    public async Task Battles_say_who_won_and_why()
    {
        var (_, rounds) = await PlayAllRounds();
        var battles = rounds.SelectMany(r => r.Round.Battles).ToList();
        BattleDto Between(int a, int b) =>
            battles.Single(x => (x.First.Id, x.Second.Id) == (a, b) || (x.First.Id, x.Second.Id) == (b, a));

        // Worked by hand from the Battle rules.
        var abraVsMachop = Between(63, 66); // psychic beats fighting
        Assert.Equal((63, "typeAdvantage"), (abraVsMachop.WinnerId, abraVsMachop.Reason));

        var bulbasaurVsMewtwo = Between(1, 150); // no type rule; 340 beats 64
        Assert.Equal((150, "baseExperience"), (bulbasaurVsMewtwo.WinnerId, bulbasaurVsMewtwo.Reason));

        var charmanderVsGastly = Between(4, 92); // no type rule; both 62
        Assert.Equal(((int?)null, "tie", "equalBaseExperience"),
            (charmanderVsGastly.WinnerId, charmanderVsGastly.Outcome, charmanderVsGastly.Reason));
        Assert.Equal(("charmander", "fire", 62), (Pick(charmanderVsGastly, 4).Name, Pick(charmanderVsGastly, 4).Type, Pick(charmanderVsGastly, 4).BaseExperience));

        static PokemonDto Pick(BattleDto battle, int id) => battle.First.Id == id ? battle.First : battle.Second;
    }

    [Fact]
    public async Task A_complete_tournament_has_no_more_rounds()
    {
        var (tournament, _) = await PlayAllRounds();

        var response = await factory.CreateClient().PostAsync($"/pokemon/tournament/{tournament.Id}/rounds", null);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("""{"error":"tournament is complete"}""", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Processing_an_unknown_tournament_is_not_found()
    {
        var response = await factory.CreateClient().PostAsync($"/pokemon/tournament/{Guid.NewGuid()}/rounds", null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("""{"error":"tournament not found"}""", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Simultaneous_round_requests_play_consecutive_rounds()
    {
        var (_, tournament) = await Start();

        var played = await Task.WhenAll(Enumerable.Range(0, 15).Select(_ => ProcessRound(tournament.Id)));

        Assert.Equal(Enumerable.Range(1, 15), played.Select(p => p.Round.Number).Order());
        // Each answer describes the Tournament as it stood right after its own Round.
        Assert.All(played, p =>
        {
            Assert.Equal(p.Round.Number, p.RoundsPlayed);
            Assert.All(p.Standings, c => Assert.Equal(p.Round.Number, c.Wins + c.Losses + c.Ties));
        });
    }
}
