using System.Text.Json.Serialization;

namespace PokemonTournament.Api.Domain;

/// <summary>Which Battle rule settled a Battle.</summary>
[JsonConverter(typeof(JsonStringEnumConverter<BattleReason>))]
public enum BattleReason
{
    [JsonStringEnumMemberName("typeAdvantage")] TypeAdvantage,
    [JsonStringEnumMemberName("baseExperience")] BaseExperience,
    [JsonStringEnumMemberName("equalBaseExperience")] EqualBaseExperience,
}
