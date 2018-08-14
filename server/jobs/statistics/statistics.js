// Sportsmonks Instance
const Sportmonks = require("../../../providers/sportmonks/sportmonks.js");
const premierLeagueSportmonks = Sportmonks({seasonId: 12962, apiKey: "1jgYd5VzNwfv7uOMpESFmDYtsGUvHevpDjmLa3LBpzvA6OOfno9NnoG166C8"});

// Create postgres instance
const pgp = require('pg-promise')({capSQL: true});
const db = pgp({connectionString: "postgres://gomhcbepfwkkeq:c12e3f58fd938bbbb0825806f1ac90a08cf415de754b2da8d1c4866cf2981faf@ec2-54-217-205-90.eu-west-1.compute.amazonaws.com:5432/dagkemjclktp71",ssl: true});

const Postgres = require("../../../database/postgres/postgres.js");
const Database = new Postgres({
	connectionString: "postgres://gomhcbepfwkkeq:c12e3f58fd938bbbb0825806f1ac90a08cf415de754b2da8d1c4866cf2981faf@ec2-54-217-205-90.eu-west-1.compute.amazonaws.com:5432/dagkemjclktp71",
	ssl: true
});

const timestamp = new Date().getTime();
console.log("> Updating statistics...");
premierLeagueSportmonks.statistics.then((players) => {
	const statisticsUpdates = [];
	players.forEach((player) => {
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
	});

	const updateSchema = new pgp.helpers.ColumnSet([
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

	return insertData(statisticsUpdates, updateSchema);
}).then(() => {
	console.log("> Successfully updated!");
}).catch((error) => {
	console.log(error);
});

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
