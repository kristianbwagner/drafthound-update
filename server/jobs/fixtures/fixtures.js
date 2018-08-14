// Sportsmonks Instance
const Sportmonks = require("../../../providers/sportmonks/sportmonks.js");
const premierLeagueSportmonks = Sportmonks({seasonId: 12962, apiKey: "1jgYd5VzNwfv7uOMpESFmDYtsGUvHevpDjmLa3LBpzvA6OOfno9NnoG166C8"});

// Create postgres instance
const pgp = require('pg-promise')({capSQL: true});
const db = pgp({connectionString: "postgres://gomhcbepfwkkeq:c12e3f58fd938bbbb0825806f1ac90a08cf415de754b2da8d1c4866cf2981faf@ec2-54-217-205-90.eu-west-1.compute.amazonaws.com:5432/dagkemjclktp71", ssl: true});

const timestamp = new Date().getTime();
console.log("> Updating fixtures...");
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
	const fixturesSchema = new pgp.helpers.ColumnSet([
		{name: "id", def: null},
		{name: "updated_at", def: null},
		{name: "status", def: null},
		{name: "home_team_score", def: null},
		{name: "away_team_score", def: null},
		//{name: "season_id", def: null},
		//{name: "created_at", def: null},
		//{name: "is_processed", def: null},
		//{name: "date", def: null},
		//{name: "round_id", def: null},
		//{name: "home_team_id", def: null},
		//{name: "away_team_id", def: null},
		//{name: "home_team_odds", def: null},
		//{name: "away_team_odds", def: null}
	], {table: "fixtures"});

	return insertData(outputData, fixturesSchema);
}).then(() => {
	console.log("> Successfully updated!");
}).catch((error) => {
	console.log(error);
});

// Create reusable function for upsert-like insert
function insertData(data, cs) {
	const conflictQuery = " ON CONFLICT (id) DO UPDATE SET " + cs.columns.map(x => {
		return `${x.name} = EXCLUDED.${x.name}`;
	}).join(', ');
	const insert = pgp.helpers.insert(data, cs) + conflictQuery;
	return new Promise((resolve, reject) => {
		db.none(insert).then(() => {
			resolve();
		}).catch(err => {
			reject(err);
		});
	});
}
