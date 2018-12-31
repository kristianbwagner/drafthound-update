// Create reference to postgres
const postgres = require("../../../providers/postgres");
const config = require("../../../server/config/config.json");

// Sportsmonks Instance
const Sportmonks = require("../../../providers/sportmonks/sportmonks.js");
const premierLeagueSportmonks = Sportmonks({
	seasonId: config.sportMonksSeasonId, 
	apiKey: config.sportMonksApiKey
});

function updateFixtures() {
	return new Promise((resolve, reject) => {

		console.log("> Fetching fixtures...");
		const timestamp = new Date().getTime();
		premierLeagueSportmonks.fixtures.then((fixtures) => {
			let outputData = fixtures.map((fixture) => {
				return {
					id: fixture.id,
					season_id: premierLeagueSportmonks.seasonId,
					created_at: timestamp,
					updated_at: timestamp,
					is_processed: false,
					date: fixture.time.starting_at.date,
					round_id: fixture.round_id,
					status: fixture.time.status,
					home_team_id: fixture.localteam_id,
					away_team_id: fixture.visitorteam_id,
					home_team_score: fixture.scores.localteam_score,
					away_team_score: fixture.scores.visitorteam_score,
					home_team_odds: 0,
					away_team_odds: 0
				};
			});

			// Column schema for table
			const fixturesSchema = new postgres.helpers.ColumnSet([
				{name: "id", def: null},
				{name: "updated_at", def: null},
				{name: "status", def: null},
				{name: "home_team_score", def: null},
				{name: "away_team_score", def: null}
			], {table: "fixtures"});

			console.log("> Updating fixtures...");
			return postgres.insertData(outputData, fixturesSchema);
		}).then(() => {
			console.log("> Done.");
			resolve();
		}).catch((error) => {
			reject(error);
		});
	})
}

//updateFixtures();
module.exports = updateFixtures;
