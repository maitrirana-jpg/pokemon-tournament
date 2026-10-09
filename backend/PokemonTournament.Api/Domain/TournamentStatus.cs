using System.Text.Json.Serialization;

namespace PokemonTournament.Api.Domain;

/// <summary>Whether a round-by-round Tournament still has Rounds to play.</summary>
[JsonConverter(typeof(JsonStringEnumConverter<TournamentStatus>))]
public enum TournamentStatus
{
    [JsonStringEnumMemberName("inProgress")] InProgress,
    [JsonStringEnumMemberName("complete")] Complete,
}
