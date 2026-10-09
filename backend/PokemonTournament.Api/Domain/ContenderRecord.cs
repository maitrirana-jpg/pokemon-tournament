namespace PokemonTournament.Api.Domain;

/// <summary>A Contender's Record at the end of a Tournament.</summary>
public sealed record ContenderRecord(int Id, string Name, string Type, int Wins, int Losses, int Ties);
