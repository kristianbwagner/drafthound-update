// Sportsmonks Instance
const Sportmonks = require("../../../providers/sportmonks/sportmonks.js");
const premierLeagueSportmonks = Sportmonks({seasonId: 12962, apiKey: "1jgYd5VzNwfv7uOMpESFmDYtsGUvHevpDjmLa3LBpzvA6OOfno9NnoG166C8"});

// Holdetdk Instance
const Holdet = require("../../../providers/holdet-dk/holdet-dk.js");
const premierLeagueHoldet = Holdet(12962);

// Create postgres instance
const pgp = require('pg-promise')({capSQL: true});
const db = pgp({connectionString: "postgres://gomhcbepfwkkeq:c12e3f58fd938bbbb0825806f1ac90a08cf415de754b2da8d1c4866cf2981faf@ec2-54-217-205-90.eu-west-1.compute.amazonaws.com:5432/dagkemjclktp71",ssl: true});

// Utilities
const getClosest = require("get-closest");
const Levenshtein = require("levenshtein");

// Log start of execution
console.log("> Fetching existing players...");
const timestamp = new Date().getTime();

// Store players from request
let existingPlayers = [];
let sportsMonksPlayers = [];
let holdetPlayers = [];

// 1. Get all players from players table
db.query("SELECT * FROM players").then((players) => {

	existingPlayers = players
	// 2. Get players from sportsmonks
	console.log("> Fetching Sportmonks players...");
	return premierLeagueSportmonks.players;

}).then((players) => {

	sportsMonksPlayers = players;
	// 3. Get number of pages from holdet dk
	console.log("> Fetching Holdet players...");
	return premierLeagueHoldet.players;

}).then((players) => {

	holdetPlayers = players;

	// 4. Create merge objects
	// If player exists do not update holdet data
	// If player does not exist update all
	console.log("> Merging and updating players...");
	const holdetPlayerList = holdetPlayers.map(d => d.playerName);
	const existingPlayersList = existingPlayers.map(d => d.id);
	const playerUpdates = [];

	sportsMonksPlayers.forEach(sportMonksPlayer => {
		const playerId = sportMonksPlayer.player_id
		const playerExists = existingPlayersList.indexOf(playerId) > -1;
		const playerData = ((sportMonksPlayer || {}).player || {}).data || {};
		const positionData = ((sportMonksPlayer || {}).position || {}).data || {};
		const fullName = playerData.fullname;

		// 5. For each player, get closes match in holdet
		let holdetPlayerData = {};
		if (playerExists) {
			const existingPlayer = (existingPlayers.filter(d => d.id === playerId)[0]) || {};
			const holdetId = existingPlayer.holdet_id;
			holdetPlayerData = (holdetPlayers.filter(d => d.playerId === holdetId)[0]) || {}
		} else {
			const closestPlayerIndex = getClosest.custom(fullName, holdetPlayerList, (compareTo, baseItem) => {return new Levenshtein(compareTo, baseItem).distance;});
			holdetPlayerData = holdetPlayers[closestPlayerIndex] || {};
		}

		playerUpdates.push({
			id: playerId,
			season_id: premierLeagueSportmonks.seasonId,
			updated_at: timestamp,
			name: playerData.common_name,
			full_name: playerData.fullname,
			first_name: playerData.firstname,
			last_name: playerData.lastname,
			team_id: playerData.team_id,
			position: positionData.name,
			position_id: positionData.id,
			birth_date: playerData.birthdate,
			birth_place: playerData.birthplace,
			nationality: playerData.nationality,
			height: playerData.height,
			weight: playerData.weight,
			holdet_url: holdetPlayerData.playerUrl,
			holdet_id: holdetPlayerData.playerId,
			holdet_name: holdetPlayerData.playerName,
			holdet_value: holdetPlayerData.playerValue,
			holdet_team: holdetPlayerData.playerTeam,
			holdet_position: holdetPlayerData.playerPosition,
			holdet_popularity: holdetPlayerData.playerPopularity
		});
	})

	// 6. Create schema for update
	const updateSchema = new pgp.helpers.ColumnSet([
		{name: "id", def: null},
		{name: "season_id", def: null},
		{name: "updated_at", def: null},
		{name: "name", def: null},
		{name: "full_name", def: null},
		{name: "first_name", def: null},
		{name: "last_name", def: null},
		{name: "team_id", def: null},
		{name: "position", def: null},
		{name: "position_id", def: null},
		{name: "birth_date", def: null},
		{name: "birth_place", def: null},
		{name: "nationality", def: null},
		{name: "height", def: null},
		{name: "weight", def: null},
		{name: "is_injured", def: null},
		{name: "holdet_url", def: null},
		{name: "holdet_id", def: null},
		{name: "holdet_name", def: null},
		{name: "holdet_value", def: null},
		{name: "holdet_team", def: null},
		{name: "holdet_position", def: null},
		{name: "holdet_popularity", def: null},
	], {table: "players"});

	return insertData(playerUpdates, updateSchema);
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
