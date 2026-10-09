using PokemonTournament.Api.Domain;
using PokemonTournament.Api.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddSingleton<IContenderPicker, RandomContenderPicker>();
builder.Services.AddHttpClient<IPokemonClient, PokeApiClient>(http =>
    http.BaseAddress = new Uri("https://pokeapi.co/api/v2/"));
builder.Services.AddSingleton<BattleService>();
builder.Services.AddSingleton<RoundRobin>();
builder.Services.AddScoped<TournamentService>();

var app = builder.Build();

app.MapControllers();

app.Run();

// Exposed so integration tests can host the API in-process.
public partial class Program;
