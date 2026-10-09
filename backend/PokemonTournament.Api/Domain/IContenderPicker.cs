namespace PokemonTournament.Api.Domain;

/// <summary>Chooses which Pokémon become the Tournament's Contenders.</summary>
public interface IContenderPicker
{
    IReadOnlyList<int> Pick();
}
