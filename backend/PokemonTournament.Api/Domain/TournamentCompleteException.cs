namespace PokemonTournament.Api.Domain;

/// <summary>Thrown when every Round of a Tournament has already been played.</summary>
public sealed class TournamentCompleteException() : InvalidOperationException("The Tournament is complete.");
