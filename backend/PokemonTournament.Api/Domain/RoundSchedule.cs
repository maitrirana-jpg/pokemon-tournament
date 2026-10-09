namespace PokemonTournament.Api.Domain;

/// <summary>Pairs Contenders for every Round of a Round-robin, by the circle method.</summary>
public static class RoundSchedule
{
    /// <summary>
    /// For an even <paramref name="count"/> of Contenders, the index pairs of each Round:
    /// count − 1 Rounds of count / 2 Battles, every pair exactly once.
    /// </summary>
    public static IReadOnlyList<IReadOnlyList<(int First, int Second)>> For(int count)
    {
        // The first Contender stays put; the rest rotate one place each Round.
        var rotating = Enumerable.Range(1, count - 1).ToList();
        var rounds = new List<IReadOnlyList<(int, int)>>();

        for (var round = 0; round < count - 1; round++)
        {
            var seats = rotating.Prepend(0).ToList();
            rounds.Add(Enumerable.Range(0, count / 2).Select(i => (seats[i], seats[count - 1 - i])).ToList());

            rotating.Insert(0, rotating[^1]);
            rotating.RemoveAt(rotating.Count - 1);
        }

        return rounds;
    }
}
