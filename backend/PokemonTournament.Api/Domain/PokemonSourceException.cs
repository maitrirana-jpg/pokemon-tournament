namespace PokemonTournament.Api.Domain;

/// <summary>The Pokémon source (PokéAPI) could not supply a Pokémon.</summary>
public class PokemonSourceException(string message, Exception? innerException = null)
    : Exception(message, innerException);

/// <summary>The Pokémon source (PokéAPI) did not answer in time.</summary>
public sealed class PokemonSourceTimeoutException(string message, Exception? innerException = null)
    : PokemonSourceException(message, innerException);
