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
premierLeague.teams.then((teams) => {
	const queries = [];
	teams.forEach((team) => {
		const update = {
			season_id: premierLeague.seasonId,
			created_at: timestamp,
			updated_at: timestamp,
			name: team.name,
			image_url: team.logo_path,
			holdet_name: ""
		};
		queries.push(Database.table("teams").find(team.id).update(update));
	});
	Database.queryAll(queries).then(() => {
		console.log("Successfully updated.");
	}).catch((err) => {
		console.log(err);
	});
});
