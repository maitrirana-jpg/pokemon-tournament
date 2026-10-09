using System.Text.Json;
using System.Text.Json.Serialization;
using PokemonTournament.Api.Domain;

namespace PokemonTournament.Api.Infrastructure;

/// <summary>Fetches Pokémon from PokéAPI and maps them to the Tournament's view of a Pokémon.</summary>
public sealed class PokeApiClient(HttpClient http) : IPokemonClient
{
    public async Task<Pokemon> GetAsync(int id, CancellationToken cancellationToken)
    {
        PokemonDto? dto;
        try
        {
            dto = await http.GetFromJsonAsync<PokemonDto>($"pokemon/{id}", cancellationToken);
        }
        // HttpClient.Timeout surfaces as a cancellation the caller did not ask for.
        catch (OperationCanceledException e) when (!cancellationToken.IsCancellationRequested)
        {
            throw new PokemonSourceTimeoutException($"PokéAPI did not respond in time for Pokémon {id}.", e);
        }
        catch (Exception e) when (e is HttpRequestException or IOException or JsonException or NotSupportedException)
        {
            throw new PokemonSourceException($"PokéAPI request for Pokémon {id} failed.", e);
        }

        if (dto is null || dto.Types is not { Count: > 0 })
            throw new PokemonSourceException($"PokéAPI returned no usable body for Pokémon {id}.");

        var primaryType = dto.Types.OrderBy(t => t.Slot).First().Type.Name;
        return new Pokemon(dto.Id, dto.Name, primaryType, dto.BaseExperience ?? 0);
    }

    private sealed record PokemonDto(
        int Id,
        string Name,
        [property: JsonPropertyName("base_experience")] int? BaseExperience,
        IReadOnlyList<TypeSlotDto>? Types);

    private sealed record TypeSlotDto(int Slot, NamedResourceDto Type);

    private sealed record NamedResourceDto(string Name);
}
