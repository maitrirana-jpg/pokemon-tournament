namespace PokemonTournament.Api.Domain;

/// <summary>Plays one Tournament: pick Contenders, fetch them, run the Round-robin.</summary>
public sealed class TournamentService(IContenderPicker picker, IPokemonClient client, RoundRobin roundRobin)
{
    public async Task<IReadOnlyList<ContenderRecord>> PlayAsync(CancellationToken cancellationToken)
    {
        var ids = picker.Pick();
        var contenders = await Task.WhenAll(ids.Select(id => client.GetAsync(id, cancellationToken)));

        return roundRobin.Play(contenders);
    }
}
