using System.Net;
using System.Net.Http.Json;

namespace PokemonTournament.Api.Tests;

public class StatisticsEndpointTests(TournamentApiFactory factory) : IClassFixture<TournamentApiFactory>
{
    private sealed record ContenderDto(int Id, string Name, string Type, int Wins, int Losses, int Ties);

    private async Task<List<ContenderDto>> GetStatistics(string query)
    {
        var response = await factory.CreateClient().GetAsync($"/pokemon/tournament/statistics?{query}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<List<ContenderDto>>())!;
    }

    [Fact]
    public async Task Returns_the_sixteen_picked_contenders_with_their_primary_type()
    {
        var contenders = await GetStatistics("sortBy=wins");

        Assert.Equal(16, contenders.Count);
        Assert.Equal(
            SampleContenders.Sixteen.Select(p => (p.Id, p.Name, p.Type)).OrderBy(c => c.Id),
            contenders.Select(c => (c.Id, c.Name, c.Type)).OrderBy(c => c.Id));
    }

    [Fact]
    public async Task Every_contender_battles_every_other_contender_exactly_once()
    {
        var contenders = await GetStatistics("sortBy=wins");

        Assert.All(contenders, c => Assert.Equal(15, c.Wins + c.Losses + c.Ties));
        Assert.Equal(contenders.Sum(c => c.Wins), contenders.Sum(c => c.Losses));
    }

    [Fact]
    public async Task Records_follow_the_battle_rules()
    {
        var contenders = await GetStatistics("sortBy=wins");

        // Worked by hand: Mewtwo (psychic, 340) loses only to the two ghosts.
        var mewtwo = contenders.Single(c => c.Name == "mewtwo");
        Assert.Equal((13, 2, 0), (mewtwo.Wins, mewtwo.Losses, mewtwo.Ties));
    }

    [Fact]
    public async Task Sorts_by_wins_ascending_by_default()
    {
        var wins = (await GetStatistics("sortBy=wins")).Select(c => c.Wins).ToList();

        Assert.Equal(wins.Order(), wins);
    }

    [Fact]
    public async Task Sorts_by_wins_descending_when_asked()
    {
        var contenders = await GetStatistics("sortBy=wins&sortDirection=desc");
        var wins = contenders.Select(c => c.Wins).ToList();

        Assert.Equal(wins.OrderDescending(), wins);

        // Worked by hand: Gengar (ghost, 250) beats both psychics on type and loses only to Dragonite (270).
        var leader = contenders[0];
        Assert.Equal(("gengar", 14, 1), (leader.Name, leader.Wins, leader.Losses));
    }
}
