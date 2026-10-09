using Microsoft.AspNetCore.Mvc;
using PokemonTournament.Api.Domain;

namespace PokemonTournament.Api.Controllers;

[ApiController]
[Route("pokemon/tournament")]
public sealed class TournamentController(TournamentService tournaments) : ControllerBase
{
    // Names compare by code point, not by the server's culture.
    private static readonly Comparer<IComparable> OrdinalComparer = Comparer<IComparable>.Create((a, b) =>
        a is string x && b is string y ? string.CompareOrdinal(x, y) : a.CompareTo(b));

    [HttpGet("statistics")]
    public async Task<ActionResult<IReadOnlyList<ContenderRecord>>> GetStatistics(
        [FromQuery] string? sortBy,
        [FromQuery] string? sortDirection,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(sortBy))
            return BadRequest(new { error = "sortBy parameter is required" });

        Func<ContenderRecord, IComparable>? sortKey = sortBy.ToLowerInvariant() switch
        {
            "wins" => r => r.Wins,
            "losses" => r => r.Losses,
            "ties" => r => r.Ties,
            "name" => r => r.Name,
            "id" => r => r.Id,
            _ => null,
        };
        if (sortKey is null)
            return BadRequest(new { error = "sortBy parameter is invalid" });

        bool? descending = sortDirection?.ToLowerInvariant() switch
        {
            null or "asc" => false,
            "desc" => true,
            _ => null,
        };
        if (descending is null)
            return BadRequest(new { error = "sortDirection parameter is invalid" });

        IReadOnlyList<ContenderRecord> records;
        try
        {
            records = await tournaments.PlayAsync(cancellationToken);
        }
        catch (PokemonSourceTimeoutException)
        {
            return StatusCode(StatusCodes.Status504GatewayTimeout, new { error = "PokéAPI did not respond in time" });
        }
        catch (PokemonSourceException)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { error = "PokéAPI request failed" });
        }

        var sorted = descending.Value ? records.OrderByDescending(sortKey, OrdinalComparer) : records.OrderBy(sortKey, OrdinalComparer);
        return Ok(sorted.ThenBy(r => r.Id).ToList());
    }
}
