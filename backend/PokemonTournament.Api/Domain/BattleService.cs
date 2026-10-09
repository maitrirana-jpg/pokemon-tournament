namespace PokemonTournament.Api.Domain;

public sealed class BattleService
{
    // Attacking type → the type it beats.
    private static readonly Dictionary<string, string> Beats = new()
    {
        ["water"] = "fire",
        ["fire"] = "grass",
        ["grass"] = "electric",
        ["electric"] = "water",
        ["ghost"] = "psychic",
        ["psychic"] = "fighting",
        ["fighting"] = "dark",
        ["dark"] = "ghost",
    };

    public BattleOutcome Resolve(Pokemon first, Pokemon second) => Decide(first, second).Outcome;

    /// <summary>Decides a Battle and says which rule settled it.</summary>
    public (BattleOutcome Outcome, BattleReason Reason) Decide(Pokemon first, Pokemon second)
    {
        if (HasTypeAdvantage(first, second)) return (BattleOutcome.FirstWins, BattleReason.TypeAdvantage);
        if (HasTypeAdvantage(second, first)) return (BattleOutcome.SecondWins, BattleReason.TypeAdvantage);

        return first.BaseExperience.CompareTo(second.BaseExperience) switch
        {
            > 0 => (BattleOutcome.FirstWins, BattleReason.BaseExperience),
            < 0 => (BattleOutcome.SecondWins, BattleReason.BaseExperience),
            _ => (BattleOutcome.Tie, BattleReason.EqualBaseExperience),
        };
    }

    private static bool HasTypeAdvantage(Pokemon attacker, Pokemon defender) =>
        Beats.TryGetValue(attacker.Type, out var beaten) && beaten == defender.Type;
}
