namespace PokemonTournament.Api.Domain;

/// <summary>Keeps round-by-round Tournaments so they can be resumed and reviewed.</summary>
public interface ITournamentStore
{
    /// <summary>Keeps a newly started Tournament.</summary>
    void Add(RoundByRoundTournament tournament);

    /// <summary>The Tournament with this id, or null if there is none.</summary>
    RoundByRoundTournament? Find(Guid id);
}
