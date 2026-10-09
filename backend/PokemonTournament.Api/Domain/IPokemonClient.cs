namespace PokemonTournament.Api.Domain;

/// <summary>Source of Pokémon data (PokéAPI in production).</summary>
public interface IPokemonClient
{
    Task<Pokemon> GetAsync(int id, CancellationToken cancellationToken);
}
