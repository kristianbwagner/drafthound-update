// Create reference to postgres
const config = require("../../../server/config/config.json");
const postgres = require("../../../providers/postgres");
const database = postgres.database;

// Sportsmonks Instance
const Sportmonks = require("../../../providers/sportmonks/sportmonks.js");
const premierLeagueSportmonks = Sportmonks({
	seasonId: config.sportMonksSeasonId,
	apiKey: config.sportMonksApiKey
});

// Holdetdk Instance
const Holdet = require("../../../providers/holdet-dk/holdet-dk.js");
const premierLeagueHoldet = Holdet({
	url: config.holdetUrl
});

// Utilities
const getClosest = require("get-closest");
const Levenshtein = require("levenshtein");

// Log start of execution
function updatePlayers() {
	return new Promise((resolve, reject) => {
		const timestamp = new Date().getTime();
		let existingPlayers = [];
		let sportsMonksPlayers = [];
		let holdetPlayers = [];
		
		// 1. Get all players from players table
		console.log("> Fetching existing players...");
		database.query("SELECT * FROM players").then((players) => {
			existingPlayers = players
			console.log("> Fetching Sportmonks players...");
			return premierLeagueSportmonks.players;
		}).then((players) => {
			sportsMonksPlayers = players;
			console.log("> Fetching Holdet players...");
			return premierLeagueHoldet.players;
		}).then((players) => {
			holdetPlayers = players;
			console.log("> Merging players...");
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
			const updateSchema = new postgres.helpers.ColumnSet([
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
				{name: "holdet_url", def: null},
				{name: "holdet_id", def: null},
				{name: "holdet_name", def: null},
				{name: "holdet_value", def: null},
				{name: "holdet_team", def: null},
				{name: "holdet_position", def: null},
				{name: "holdet_popularity", def: null},
			], {table: "players"});

			console.log("> Updating players...");
			return postgres.insertData(playerUpdates, updateSchema);
		}).then(() => {
			console.log("> Done.");
			resolve();
		}).catch((error) => {
			reject(error);
		});
	})
}

module.exports = updatePlayers;