using Microsoft.AspNetCore.Mvc;
using PokemonTournament.Api.Domain;

namespace PokemonTournament.Api.Controllers;

[ApiController]
[Route("pokemon/tournament")]
public sealed class TournamentController(TournamentService tournaments, RoundByRoundService roundByRound) : ControllerBase
{
    /// <summary>Starts a round-by-round Tournament with 16 Contenders and no Rounds played.</summary>
    [HttpPost]
    public Task<ActionResult> Start(CancellationToken cancellationToken) =>
        WhenPokeApiAnswers(async () =>
        {
            var tournament = await roundByRound.StartAsync(cancellationToken);
            return Created($"/pokemon/tournament/{tournament.Id}", TournamentView.From(tournament));
        });

    /// <summary>A round-by-round Tournament's current state.</summary>
    [HttpGet("{id:guid}")]
    public ActionResult<TournamentView> GetTournament(Guid id) =>
        roundByRound.Find(id) is { } tournament
            ? TournamentView.From(tournament)
            : NotFound(new { error = "tournament not found" });

    /// <summary>Plays the next Round of a round-by-round Tournament.</summary>
    [HttpPost("{id:guid}/rounds")]
    public ActionResult<RoundPlayed> PlayNextRound(Guid id)
    {
        try
        {
            return roundByRound.PlayNextRound(id) is { } played
                ? played
                : NotFound(new { error = "tournament not found" });
        }
        catch (TournamentCompleteException)
        {
            return Conflict(new { error = "tournament is complete" });
        }
    }

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

        return await WhenPokeApiAnswers(async () => Ok(await tournaments.PlayAsync(field.Value, direction.Value, cancellationToken)));
    }

    /// <summary>Runs an action that fetches from PokéAPI, mapping a timeout to 504 and any other failure to 502.</summary>
    private async Task<ActionResult> WhenPokeApiAnswers(Func<Task<ActionResult>> action)
    {
        try
        {
            return await action();
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
