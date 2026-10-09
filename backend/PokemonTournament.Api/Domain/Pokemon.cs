namespace PokemonTournament.Api.Domain;

/// <summary>A Pokémon as the Tournament sees it: identity, primary type and base experience.</summary>
public sealed record Pokemon(int Id, string Name, string Type, int BaseExperience);
