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
console.time("players");
premierLeague.players.then((players) => {
	const queries = [];
	players.forEach((player) => {
		const update = {
			season_id: premierLeague.seasonId,
			created_at: timestamp,
			updated_at: timestamp,
			name: player.player.data.common_name,
			full_name: player.player.data.fullname,
			first_name: player.player.data.firstname,
			last_name: player.player.data.lastname,
			team_id: player.player.data.team_id,
			position: player.position.data.name,
			position_id: player.position.data.id,
			birth_date: player.player.data.birthdate || "",
			birth_place: player.player.data.birthcountry || "",
			nationality: player.player.data.nationality || "",
			height: player.player.data.height || "",
			weight: player.player.data.weight || "",
			is_injured: player.injured
		};
		queries.push(Database.table("players").find(player.player_id).update(update));
	});

	Database.queryAll(queries).then(() => {
		console.timeEnd("players");
		console.log("Successfully updated.");
	}).catch((err) => {
		console.log(err);
	});
});
