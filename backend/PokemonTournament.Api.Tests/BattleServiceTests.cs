using PokemonTournament.Api.Domain;

namespace PokemonTournament.Api.Tests;

public class BattleServiceTests
{
    private readonly BattleService _battles = new();

    private static Pokemon Contender(string type, int baseExperience = 100) =>
        new(1, $"{type}-mon", type, baseExperience);

    [Fact]
    public void Water_beats_fire()
    {
        var water = Contender("water");
        var fire = Contender("fire");

        Assert.Equal(BattleOutcome.FirstWins, _battles.Resolve(water, fire));
    }

    [Theory]
    [InlineData("water", "fire")]
    [InlineData("fire", "grass")]
    [InlineData("grass", "electric")]
    [InlineData("electric", "water")]
    [InlineData("ghost", "psychic")]
    [InlineData("psychic", "fighting")]
    [InlineData("fighting", "dark")]
    [InlineData("dark", "ghost")]
    public void Type_advantage_decides_the_battle_whichever_side_it_is_on(string strong, string weak)
    {
        // Give the weaker type far more experience: type must still win.
        var winner = Contender(strong, baseExperience: 50);
        var loser = Contender(weak, baseExperience: 300);

        Assert.Equal(BattleOutcome.FirstWins, _battles.Resolve(winner, loser));
        Assert.Equal(BattleOutcome.SecondWins, _battles.Resolve(loser, winner));
    }

    [Fact]
    public void Without_a_type_rule_higher_base_experience_wins()
    {
        // Real PokéAPI values: neither normal nor rock appears in the type rules.
        var snorlax = new Pokemon(143, "snorlax", "normal", 189);
        var onix = new Pokemon(95, "onix", "rock", 77);

        Assert.Equal(BattleOutcome.FirstWins, _battles.Resolve(snorlax, onix));
        Assert.Equal(BattleOutcome.SecondWins, _battles.Resolve(onix, snorlax));
    }

    [Fact]
    public void Same_type_falls_back_to_base_experience()
    {
        var charmander = new Pokemon(4, "charmander", "fire", 62);
        var vulpix = new Pokemon(37, "vulpix", "fire", 60);

        Assert.Equal(BattleOutcome.FirstWins, _battles.Resolve(charmander, vulpix));
        Assert.Equal(BattleOutcome.SecondWins, _battles.Resolve(vulpix, charmander));
    }

    [Fact]
    public void Equal_base_experience_without_a_type_rule_is_a_tie()
    {
        var normal = Contender("normal", baseExperience: 100);
        var rock = Contender("rock", baseExperience: 100);

        Assert.Equal(BattleOutcome.Tie, _battles.Resolve(normal, rock));
        Assert.Equal(BattleOutcome.Tie, _battles.Resolve(rock, normal));
    }

    [Fact]
    public void Type_advantage_beats_much_higher_base_experience()
    {
        var squirtle = new Pokemon(7, "squirtle", "water", 63);
        var ninetales = new Pokemon(38, "ninetales", "fire", 177);

        Assert.Equal(BattleOutcome.FirstWins, _battles.Resolve(squirtle, ninetales));
        Assert.Equal(BattleOutcome.SecondWins, _battles.Resolve(ninetales, squirtle));
    }
}
