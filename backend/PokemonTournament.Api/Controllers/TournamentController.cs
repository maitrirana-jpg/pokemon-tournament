using Microsoft.AspNetCore.Mvc;
using PokemonTournament.Api.Domain;

namespace PokemonTournament.Api.Controllers;

[ApiController]
[Route("pokemon/tournament")]
public sealed class TournamentController(TournamentService tournaments) : ControllerBase
{
    [HttpGet("statistics")]
    public async Task<ActionResult<IReadOnlyList<ContenderRecord>>> GetStatistics(
        [FromQuery] string? sortBy,
        [FromQuery] string? sortDirection,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(sortBy))
            return BadRequest(new { error = "sortBy parameter is required" });

        SortField? field = sortBy.ToLowerInvariant() switch
        {
            "wins" => SortField.Wins,
            "losses" => SortField.Losses,
            "ties" => SortField.Ties,
            "name" => SortField.Name,
            "id" => SortField.Id,
            _ => null,
        };
        if (field is null)
            return BadRequest(new { error = "sortBy parameter is invalid" });

        SortDirection? direction = sortDirection?.ToLowerInvariant() switch
        {
            null or "asc" => SortDirection.Asc,
            "desc" => SortDirection.Desc,
            _ => null,
        };
        if (direction is null)
            return BadRequest(new { error = "sortDirection parameter is invalid" });

        try
        {
            return Ok(await tournaments.PlayAsync(field.Value, direction.Value, cancellationToken));
        }
        catch (PokemonSourceTimeoutException)
        {
            return StatusCode(StatusCodes.Status504GatewayTimeout, new { error = "PokéAPI did not respond in time" });
        }
        catch (PokemonSourceException)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { error = "PokéAPI request failed" });
        }
    }
}
