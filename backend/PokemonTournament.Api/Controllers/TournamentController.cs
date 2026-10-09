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
        var records = await tournaments.PlayAsync(cancellationToken);

        // Only wins for now; the full sorting and validation contract comes with #3.
        var descending = string.Equals(sortDirection, "desc", StringComparison.OrdinalIgnoreCase);
        return Ok(descending
            ? records.OrderByDescending(r => r.Wins).ToList()
            : records.OrderBy(r => r.Wins).ToList());
    }
}
