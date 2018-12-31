// Create reference to postgres
const postgres = require("../../../providers/postgres");
const config = require("../../../server/config/config.json");

// Sportsmonks Instance
const Sportmonks = require("../../../providers/sportmonks/sportmonks.js");
const premierLeagueSportmonks = Sportmonks({
	seasonId: config.sportMonksSeasonId,
	apiKey: config.sportMonksApiKey
});

function updateStatistics() {
	return new Promise((resolve, reject) => {
		console.log("> Fetching statistics...");
		premierLeagueSportmonks.statistics.then((players) => {
			const timestamp = new Date().getTime();
			const statisticsUpdates = [];
			players.forEach((player) => {
				if (player.player_id) {
					const update = {
						id: player.fixture_id + "-" + player.player_id,
						fixture_id: player.fixture_id,
						player_id: player.player_id,
						created_at: timestamp,
						updated_at: timestamp,
						goals: player.stats.goals.scored || 0,
						assists: player.stats.other.assists || 0,
						red_cards: player.stats.cards.redcards || 0,
						yellow_cards: player.stats.cards.yellowcards || 0,
						fouls_committed: player.stats.fouls.committed || 0,
						fouls_drawn: player.stats.fouls.drawn || 0,
						shots: player.stats.shots.shots_total || 0,
						shots_on_goal: player.stats.shots.shots_on_goal || 0,
						crosses: player.stats.passing.total_crosses || 0,
						crosses_accuracy: player.stats.passing.crosses_accuracy || 0,
						passes: player.stats.passing.passes || 0,
						passes_accuracy: player.stats.passing.passes_accuracy || 0,
						offsides: player.stats.other.offsides || 0,
						saves: player.stats.other.saves || 0,
						penalties_scored: player.stats.other.pen_scored || 0,
						penalties_missed: player.stats.other.pen_missed || 0,
						penalties_saved: player.stats.other.pen_saved || 0,
						tackles: player.stats.other.tackles || 0,
						blocks: player.stats.other.blocks || 0,
						interceptions: player.stats.other.interceptions || 0,
						clearances: player.stats.other.clearances || 0,
						minutes_played: player.stats.other.minutes_played || 0,
						home_away: null,
						favorite_underdog: null,
					};
					statisticsUpdates.push(update);
				}
			});
		
			const updateSchema = new postgres.helpers.ColumnSet([
				{name: "id", def: null},
				{name: "fixture_id", def: null},
				{name: "player_id", def: null},
				{name: "created_at", def: null},
				{name: "updated_at", def: null},
				{name: "goals", def: null},
				{name: "assists", def: null},
				{name: "red_cards", def: null},
				{name: "yellow_cards", def: null},
				{name: "fouls_committed", def: null},
				{name: "fouls_drawn", def: null},
				{name: "shots", def: null},
				{name: "shots_on_goal", def: null},
				{name: "crosses", def: null},
				{name: "crosses_accuracy", def: null},
				{name: "passes", def: null},
				{name: "passes_accuracy", def: null},
				{name: "offsides", def: null},
				{name: "saves", def: null},
				{name: "penalties_scored", def: null},
				{name: "penalties_missed", def: null},
				{name: "penalties_saved", def: null},
				{name: "tackles", def: null},
				{name: "blocks", def: null},
				{name: "interceptions", def: null},
				{name: "clearances", def: null},
				{name: "minutes_played", def: null},
			], {table: "statistics"});

			console.log("> Updating statistics...");
			return postgres.insertData(statisticsUpdates, updateSchema);
		}).then(() => {
			console.log("> Done.");
			resolve()
		}).catch((error) => {
			reject(error);
		});
	})
}

module.exports = updateStatistics;