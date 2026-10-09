using System.Text.Json.Serialization;
using PokemonTournament.Api.Domain;

namespace PokemonTournament.Api.Infrastructure;

/// <summary>Fetches Pokémon from PokéAPI and maps them to the Tournament's view of a Pokémon.</summary>
public sealed class PokeApiClient(HttpClient http) : IPokemonClient
{
    public async Task<Pokemon> GetAsync(int id, CancellationToken cancellationToken)
    {
        var dto = await http.GetFromJsonAsync<PokemonDto>($"pokemon/{id}", cancellationToken)
            ?? throw new InvalidOperationException($"PokéAPI returned no body for Pokémon {id}.");

        var primaryType = dto.Types.OrderBy(t => t.Slot).First().Type.Name;
        return new Pokemon(dto.Id, dto.Name, primaryType, dto.BaseExperience ?? 0);
    }

    private sealed record PokemonDto(
        int Id,
        string Name,
        [property: JsonPropertyName("base_experience")] int? BaseExperience,
        IReadOnlyList<TypeSlotDto> Types);

    private sealed record TypeSlotDto(int Slot, NamedResourceDto Type);

    private sealed record NamedResourceDto(string Name);
}
