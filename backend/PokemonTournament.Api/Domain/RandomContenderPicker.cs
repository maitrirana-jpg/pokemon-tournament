namespace PokemonTournament.Api.Domain;

public sealed class RandomContenderPicker : IContenderPicker
{
    public const int ContenderCount = 16;
    private const int LastOriginalPokemonId = 151;

    public IReadOnlyList<int> Pick()
    {
        // Shuffling the whole range makes duplicates impossible by construction.
        var ids = Enumerable.Range(1, LastOriginalPokemonId).ToArray();
        Random.Shared.Shuffle(ids);
        return ids[..ContenderCount];
    }
}
