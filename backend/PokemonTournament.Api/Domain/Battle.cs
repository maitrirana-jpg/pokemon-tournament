namespace PokemonTournament.Api.Domain;

/// <summary>One Battle of a round-by-round Tournament, kept for review.</summary>
public sealed record Battle(
    int Id, int Round, Pokemon First, Pokemon Second, BattleOutcome Outcome, BattleReason Reason)
{
    public int? WinnerId => Outcome switch
    {
        BattleOutcome.FirstWins => First.Id,
        BattleOutcome.SecondWins => Second.Id,
        _ => null,
    };
}
