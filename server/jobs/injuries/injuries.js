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
premierLeague.injuries.then((response) => {
	const teams = response.teams;
	const whereStatement = "team_id=" + teams.join(" OR team_id=");
	const query = "UPDATE players SET is_injured=false, injury_description=NULL WHERE " + whereStatement;

	// Injuries queries
	const injuryQueries = [];
	const injuries = response.injuries;
	injuries.forEach((injury) => {
		const update = {
			updated_at: timestamp,
			is_injured: true,
			injury_description: injury.reason
		};
		injuryQueries.push(Database.table("players").find(injury.player_id).in("id").update(update));
	});

	// Reset statuses for teams
	Database.query(query).then(() => {
		console.log("Successfully reset teams.");
		console.log("Updating injury descriptions.");
		Database.queryAll(injuryQueries).then(() => {
			console.log("Successfully updated.");
		}).catch((err) => {
			console.log(err);
		});
	}).catch((err) => {
		console.log(err);
	});
}).catch(err => {
	console.log(err);
});
