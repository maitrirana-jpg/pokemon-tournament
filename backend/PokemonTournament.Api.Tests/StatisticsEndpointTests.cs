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

    private async Task AssertBadRequest(string query, string error)
    {
        var response = await factory.CreateClient().GetAsync($"/pokemon/tournament/statistics?{query}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal($$"""{"error":"{{error}}"}""", await response.Content.ReadAsStringAsync());
    }

    [Theory]
    [InlineData("")]
    [InlineData("sortBy=")]
    [InlineData("sortDirection=asc")]
    public async Task Rejects_a_missing_sortBy(string query) =>
        await AssertBadRequest(query, "sortBy parameter is required");

    [Theory]
    [InlineData("sortBy=type")]
    [InlineData("sortBy=wins2&sortDirection=asc")]
    public async Task Rejects_an_unknown_sortBy(string query) =>
        await AssertBadRequest(query, "sortBy parameter is invalid");

    [Theory]
    [InlineData("sortBy=wins&sortDirection=up")]
    [InlineData("sortBy=wins&sortDirection=ascending")]
    public async Task Rejects_an_unknown_sortDirection(string query) =>
        await AssertBadRequest(query, "sortDirection parameter is invalid");

    [Theory]
    [InlineData("sortBy=type&sortDirection=up", "sortBy parameter is invalid")]
    [InlineData("sortDirection=up", "sortBy parameter is required")]
    public async Task Reports_the_sortBy_error_when_both_are_invalid(string query, string error) =>
        await AssertBadRequest(query, error);

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

    [Fact]
    public async Task Accepts_sort_parameters_in_any_case()
    {
        var leader = (await GetStatistics("sortBy=Wins&sortDirection=DESC"))[0];

        Assert.Equal("gengar", leader.Name);
    }

    private static readonly string[] Alphabetical =
    [
        "abra", "bulbasaur", "charmander", "dragonite", "eevee", "gastly", "gengar", "machop",
        "mewtwo", "ninetales", "onix", "pikachu", "psyduck", "snorlax", "squirtle", "vulpix",
    ];

    [Fact]
    public async Task Sorts_by_name_ascending() =>
        Assert.Equal(Alphabetical, (await GetStatistics("sortBy=name&sortDirection=asc")).Select(c => c.Name));

    [Fact]
    public async Task Sorts_by_name_descending() =>
        Assert.Equal(Alphabetical.Reverse(), (await GetStatistics("sortBy=name&sortDirection=desc")).Select(c => c.Name));

    [Theory]
    [InlineData("asc", new[] { 1, 4, 7, 25, 37, 38, 54, 63, 66, 92, 94, 95, 133, 143, 149, 150 })]
    [InlineData("desc", new[] { 150, 149, 143, 133, 95, 94, 92, 66, 63, 54, 38, 37, 25, 7, 4, 1 })]
    public async Task Sorts_by_id(string direction, int[] expected)
    {
        var ids = (await GetStatistics($"sortBy=id&sortDirection={direction}")).Select(c => c.Id);

        Assert.Equal(expected, ids);
    }

    [Theory]
    [InlineData("wins", "asc")]
    [InlineData("wins", "desc")]
    [InlineData("losses", "asc")]
    [InlineData("losses", "desc")]
    [InlineData("ties", "asc")]
    [InlineData("ties", "desc")]
    public async Task Sorts_by_record_with_equal_values_ordered_by_id_ascending(string sortBy, string direction)
    {
        var contenders = await GetStatistics($"sortBy={sortBy}&sortDirection={direction}");
        int Value(ContenderDto c) => sortBy switch { "wins" => c.Wins, "losses" => c.Losses, _ => c.Ties };
        var sign = direction == "asc" ? 1 : -1;

        Assert.All(contenders.Zip(contenders.Skip(1)), pair =>
        {
            var byValue = sign * Value(pair.First).CompareTo(Value(pair.Second));
            Assert.True(byValue < 0 || (byValue == 0 && pair.First.Id < pair.Second.Id),
                $"{pair.First.Name} should not come before {pair.Second.Name}");
        });
    }
}
