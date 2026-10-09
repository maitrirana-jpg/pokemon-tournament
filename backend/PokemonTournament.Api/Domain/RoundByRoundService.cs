namespace PokemonTournament.Api.Domain;

/// <summary>Starts round-by-round Tournaments and keeps them in the store.</summary>
public sealed class RoundByRoundService(
    IContenderPicker picker, IPokemonClient client, ITournamentStore store, TimeProvider clock)
{
    /// <summary>Picks and fetches 16 Contenders, then stores a new Tournament with no Rounds played.</summary>
    public async Task<RoundByRoundTournament> StartAsync(CancellationToken cancellationToken)
    {
        var ids = picker.Pick();
        var contenders = await Task.WhenAll(ids.Select(id => client.GetAsync(id, cancellationToken)));

        var tournament = new RoundByRoundTournament(Guid.NewGuid(), clock.GetUtcNow(), contenders);
        store.Add(tournament);
        return tournament;
    }

    /// <summary>The Tournament with this id, or null if there is none.</summary>
    public RoundByRoundTournament? Find(Guid id) => store.Find(id);
}
