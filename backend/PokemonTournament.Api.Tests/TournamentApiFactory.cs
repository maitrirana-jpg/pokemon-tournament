using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using PokemonTournament.Api.Domain;

namespace PokemonTournament.Api.Tests;

/// <summary>Runs the real API in-process, swapping only the system boundaries: randomness and PokéAPI.</summary>
public sealed class TournamentApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IContenderPicker>();
            services.RemoveAll<IPokemonClient>();
            services.AddSingleton<IContenderPicker>(new FixedContenderPicker(SampleContenders.Ids));
            services.AddSingleton<IPokemonClient>(new FakePokemonClient(SampleContenders.Sixteen));
        });
    }
}
