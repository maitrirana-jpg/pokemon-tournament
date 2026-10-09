namespace PokemonTournament.Api.Domain;

/// <summary>Plays one Tournament: pick Contenders, fetch them, run the Round-robin, order the Records.</summary>
public sealed class TournamentService(IContenderPicker picker, IPokemonClient client, RoundRobin roundRobin)
{
    // Names compare by code point, not by the server's culture.
    private static readonly Comparer<IComparable> OrdinalComparer = Comparer<IComparable>.Create((a, b) =>
        a is string x && b is string y ? string.CompareOrdinal(x, y) : a.CompareTo(b));

    /// <summary>Plays a Tournament and returns every Record, ordered by <paramref name="sortBy"/> with ties broken by id ascending.</summary>
    public async Task<IReadOnlyList<ContenderRecord>> PlayAsync(
        SortField sortBy, SortDirection sortDirection, CancellationToken cancellationToken)
    {
        var ids = picker.Pick();
        var contenders = await Task.WhenAll(ids.Select(id => client.GetAsync(id, cancellationToken)));
        var records = roundRobin.Play(contenders);

        Func<ContenderRecord, IComparable> sortKey = sortBy switch
        {
            SortField.Wins => r => r.Wins,
            SortField.Losses => r => r.Losses,
            SortField.Ties => r => r.Ties,
            SortField.Name => r => r.Name,
            SortField.Id => r => r.Id,
            _ => throw new ArgumentOutOfRangeException(nameof(sortBy)),
        };
        var sorted = sortDirection == SortDirection.Desc
            ? records.OrderByDescending(sortKey, OrdinalComparer)
            : records.OrderBy(sortKey, OrdinalComparer);
        return sorted.ThenBy(r => r.Id).ToList();
    }
}
