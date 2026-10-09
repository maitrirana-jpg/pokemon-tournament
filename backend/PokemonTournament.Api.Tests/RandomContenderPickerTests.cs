using PokemonTournament.Api.Domain;

namespace PokemonTournament.Api.Tests;

public class RandomContenderPickerTests
{
    [Fact]
    public void Picks_sixteen_distinct_ids_from_the_original_151()
    {
        var picker = new RandomContenderPicker();

        // Randomness can hide a bug for a while, so check many draws.
        for (var draw = 0; draw < 200; draw++)
        {
            var ids = picker.Pick();

            Assert.Equal(16, ids.Count);
            Assert.Equal(16, ids.Distinct().Count());
            Assert.All(ids, id => Assert.InRange(id, 1, 151));
        }
    }
}
