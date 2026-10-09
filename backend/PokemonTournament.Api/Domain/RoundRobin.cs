namespace PokemonTournament.Api.Domain;

/// <summary>Plays every Contender against every other Contender exactly once and tallies their Records.</summary>
public sealed class RoundRobin(BattleService battles)
{
    public IReadOnlyList<ContenderRecord> Play(IReadOnlyList<Pokemon> contenders)
    {
        var tallies = contenders.Select(_ => new Tally()).ToArray();

        for (var i = 0; i < contenders.Count; i++)
        for (var j = i + 1; j < contenders.Count; j++)
        {
            switch (battles.Resolve(contenders[i], contenders[j]))
            {
                case BattleOutcome.FirstWins:
                    tallies[i].Wins++;
                    tallies[j].Losses++;
                    break;
                case BattleOutcome.SecondWins:
                    tallies[j].Wins++;
                    tallies[i].Losses++;
                    break;
                default:
                    tallies[i].Ties++;
                    tallies[j].Ties++;
                    break;
            }
        }

        return contenders
            .Zip(tallies, (p, t) => new ContenderRecord(p.Id, p.Name, p.Type, t.Wins, t.Losses, t.Ties))
            .ToList();
    }

    private sealed class Tally
    {
        public int Wins;
        public int Losses;
        public int Ties;
    }
}
