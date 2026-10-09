namespace PokemonTournament.Api.Domain;

/// <summary>How a Battle ended, from the point of view of the first Contender passed in.</summary>
public enum BattleOutcome
{
    FirstWins,
    SecondWins,
    Tie,
}
