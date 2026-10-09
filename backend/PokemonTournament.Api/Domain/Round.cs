namespace PokemonTournament.Api.Domain;

/// <summary>One Round: each Contender's single Battle in it.</summary>
public sealed record Round(int Number, IReadOnlyList<Battle> Battles);
