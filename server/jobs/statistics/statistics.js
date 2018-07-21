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
premierLeague.statistics.then((players) => {
	const queries = [];
	players.forEach((player) => {
		const update = {
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
		};

		queries.push(Database.table("statistics").find(player.fixture_id + "-" + player.player_id).update(update));
	});

	Database.queryAll(queries).then(() => {
		console.log("Successfully updated.");
	}).catch((err) => {
		console.log(err);
	});
}).catch(err => {
	console.log(err);
});
