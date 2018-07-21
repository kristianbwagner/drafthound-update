const sportmonks = require("../../../providers/sportmonks/sportmonks.js");
const premierLeague = sportmonks({
	seasonId: 6397,
	apiKey: "1jgYd5VzNwfv7uOMpESFmDYtsGUvHevpDjmLa3LBpzvA6OOfno9NnoG166C8"
});

const Postgres = require("../../../database/postgres/postgres.js");
const Database = new Postgres({
	connectionString: "postgres://arryqiptdswjdh:ba3dc52dcf2380392e9ef18a1bc86820d8523a30d6e759c5d63ea68768bbd8b2@ec2-79-125-117-53.eu-west-1.compute.amazonaws.com:5432/dv5o41fic7um5",
	ssl: true
});

const timestamp = new Date().getTime();
premierLeague.fixtures.then((fixtures) => {
	const queries = [];
	fixtures.forEach((fixture) => {
		const update = {
			season_id: premierLeague.seasonId,
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
			odds: 0
		};
		queries.push(Database.table("fixtures").find(fixture.id).update(update));
	});
	Database.queryAll(queries).then(() => {
		console.log("Successfully updated.");
	}).catch((err) => {
		console.log(err);
	});
});
