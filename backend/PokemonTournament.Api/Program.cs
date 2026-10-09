using PokemonTournament.Api.Domain;
using PokemonTournament.Api.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddSingleton<IContenderPicker, RandomContenderPicker>();
builder.Services.AddHttpClient<PokeApiClient>(http =>
    {
        http.BaseAddress = new Uri("https://pokeapi.co/api/v2/");
        http.Timeout = TimeSpan.FromSeconds(5);
    })
    // The cache below holds this client for the life of the process, so let connections recycle.
    .ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler { PooledConnectionLifetime = TimeSpan.FromMinutes(2) });
builder.Services.AddSingleton<IPokemonClient>(sp => new CachingPokemonClient(sp.GetRequiredService<PokeApiClient>()));
builder.Services.AddSingleton<BattleService>();
builder.Services.AddSingleton<RoundRobin>();
builder.Services.AddScoped<TournamentService>();

var app = builder.Build();

app.MapControllers();

app.Run();

// Exposed so integration tests can host the API in-process.
public partial class Program;
