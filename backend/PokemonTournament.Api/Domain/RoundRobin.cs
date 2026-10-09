namespace PokemonTournament.Api.Domain;

/// <summary>Plays every Contender against every other Contender exactly once and tallies their Records.</summary>
public sealed class RoundRobin(BattleService battles)
{
    public IReadOnlyList<ContenderRecord> Play(IReadOnlyList<Pokemon> contenders)
    {
        var wins = new int[contenders.Count];
        var losses = new int[contenders.Count];
        var ties = new int[contenders.Count];

        for (var i = 0; i < contenders.Count; i++)
        for (var j = i + 1; j < contenders.Count; j++)
        {
            switch (battles.Resolve(contenders[i], contenders[j]))
            {
                case BattleOutcome.FirstWins:
                    wins[i]++;
                    losses[j]++;
                    break;
                case BattleOutcome.SecondWins:
                    wins[j]++;
                    losses[i]++;
                    break;
                default:
                    ties[i]++;
                    ties[j]++;
                    break;
            }
        }

        return contenders
            .Select((p, i) => new ContenderRecord(p.Id, p.Name, p.Type, wins[i], losses[i], ties[i]))
            .ToList();
    }
}
