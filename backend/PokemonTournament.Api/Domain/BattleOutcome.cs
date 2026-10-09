using System.Text.Json.Serialization;

namespace PokemonTournament.Api.Domain;

/// <summary>How a Battle ended, from the point of view of the first Contender passed in.</summary>
[JsonConverter(typeof(JsonStringEnumConverter<BattleOutcome>))]
public enum BattleOutcome
{
    [JsonStringEnumMemberName("firstWins")] FirstWins,
    [JsonStringEnumMemberName("secondWins")] SecondWins,
    [JsonStringEnumMemberName("tie")] Tie,
}
