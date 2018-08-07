const axios = require("axios");
const getClosest = require("get-closest");
const Levenshtein = require("levenshtein");
const cheerio = require("cheerio");
const sportmonks = require("../../providers/sportmonks/sportmonks.js");
const premierLeague = sportmonks({
	seasonId: 12962,
	apiKey: "1jgYd5VzNwfv7uOMpESFmDYtsGUvHevpDjmLa3LBpzvA6OOfno9NnoG166C8"
});
const Postgres = require("../../database/postgres/postgres.js");
const Database = new Postgres({
	connectionString: "postgres://arryqiptdswjdh:ba3dc52dcf2380392e9ef18a1bc86820d8523a30d6e759c5d63ea68768bbd8b2@ec2-79-125-117-53.eu-west-1.compute.amazonaws.com:5432/dv5o41fic7um5",
	ssl: true
});

const pgp = require('pg-promise')({
	capSQL: true
});

// Create connection ref to database
const db = pgp({
	connectionString: "postgres://gomhcbepfwkkeq:c12e3f58fd938bbbb0825806f1ac90a08cf415de754b2da8d1c4866cf2981faf@ec2-54-217-205-90.eu-west-1.compute.amazonaws.com:5432/dagkemjclktp71",
	ssl: true
});

function getClosestMatch(testValue, inArray) {
	const closestIndex = getClosest.custom(testValue, inArray, (compareTo, baseItem) => {
		return new Levenshtein(compareTo, baseItem).distance;
	});
	return {
		index: closestIndex,
		closestValue: inArray[closestIndex]
	};
}

//console.log(new Levenshtein("João Mário Naval da Costa Eduardo", "João Mário Noval da Costa Eduardo").distance);

// Column schema for table
const playersSchema = new pgp.helpers.ColumnSet([
	{name: "id", def: null},
	{name: "season_id", def: null},
	{name: "created_at", def: null},
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

// 1. Get general player information from sportmonks
function getSportMonksPlayers() {
	return new Promise((resolve, reject) => {
		const timestamp = new Date().getTime();
		premierLeague.players.then((players) => {
			const allPlayers = [];
			players.forEach((player) => {
				const update = {
					id: player.player_id,
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
					weight: player.player.data.weight || ""
				};
				allPlayers.push(update);
			});
			resolve(allPlayers);
		}).catch(err => {
			reject(err);
		});
	});
}

getSportMonksPlayers().then(sportMonksPlayers => {
	getPlayerStatistics().then(holdetPlayers => {
		const holdetPlayerList = holdetPlayers.map(row => {return row.playerName;});
		const outputData = [];
		sportMonksPlayers.forEach(sportMonksPlayer => {
			const closestHoldetName = getClosestMatch(sportMonksPlayer.full_name, holdetPlayerList);
			const holdetPlayerData = holdetPlayers[closestHoldetName.index];

			if (sportMonksPlayer.id !== undefined) {
				const timestamp = new Date().getTime();
				const update = {
					id: sportMonksPlayer.id,
					season_id: sportMonksPlayer.season_id,
					created_at: timestamp,
					updated_at: timestamp,
					name: sportMonksPlayer.name,
					full_name: sportMonksPlayer.full_name,
					first_name: sportMonksPlayer.first_name,
					last_name: sportMonksPlayer.last_name,
					team_id: sportMonksPlayer.team_id,
					position: sportMonksPlayer.position,
					position_id: sportMonksPlayer.position_id,
					birth_date: sportMonksPlayer.birth_date,
					birth_place: sportMonksPlayer.birth_place,
					nationality: sportMonksPlayer.nationality,
					height: sportMonksPlayer.height,
					weight: sportMonksPlayer.weight,
					holdet_url: holdetPlayerData.playerUrl,
					holdet_id: holdetPlayerData.playerId,
					holdet_name: holdetPlayerData.playerName,
					holdet_value: holdetPlayerData.playerValue,
					holdet_team: holdetPlayerData.playerTeam,
					holdet_position: holdetPlayerData.playerPosition,
					holdet_popularity: holdetPlayerData.playerPopularity
				};

				// Make sure to only have one player in inserts
				if(outputData.filter(d => d.id === update.id).length === 0) {
					outputData.push(update);
				}
			}
		});

		//const output = outputData.slice(0,260);
		//console.log(output);

		return insertData(outputData, playersSchema);
	}).then(() => {
		console.log("success");
	}).catch((error) => {
		console.log(error);
	});
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

// 2. Get player information from holdet and merge into dataset
function getPlayerStatistics() {
	return new Promise((resolve, reject) => {
		getNumberOfStatisticsPages().then(page => {
			var statsUrls = [];
			for (let i = 0; i <= page; i++) {
				statsUrls.push("https://www.holdet.dk/da/premier-league-fantasy-fall-2018/statistics?page=" + i);
			}
			return Promise.all(statsUrls.map(url => {return getPlayerStatsFromHoldetPage(url);}));
		}).then(responses => {
			const allPlayers = [].concat.apply([], responses);
			resolve(allPlayers);
		}).catch(err => {
			reject(err);
		});
	});
}

function getNumberOfStatisticsPages() {
	return new Promise((resolve, reject) => {
		const firstStatsPage = "https://www.holdet.dk/da/premier-league-fantasy-fall-2018/statistics?page=0";
		axios.get(firstStatsPage).then(response => {
			const responseHtml = response.data;
			const $ = cheerio.load(responseHtml);
			const lastPage = $("#ctl00_ctl00_placeholder_placeholder_pager").find("li:not(.arrow) a").last().text();
			resolve(lastPage);
		}).catch(err => {
			reject(err);
		});
	});
}



function getPlayerStatsFromHoldetPage(holdetUrl) {
	return new Promise((resolve, reject) => {
		axios.get(holdetUrl).then(response => {
			const responseHtml = response.data;
			const $ = cheerio.load(responseHtml);
			const tableRows = $("table tbody tr");
			const playerStats = [];
			tableRows.each((index, row) => {
				const playerCol = $(row).find("td:nth-of-type(2)");
				const playerName = playerCol.find("strong a").text();
				const playerUrl = playerCol.find("strong a").attr("href");
				const playerTeamPosition = playerCol.find(".small.meta").text();
				const playerTeamPositionComponents = playerTeamPosition.split("-") || [];
				const playerTeam = playerTeamPositionComponents[0].trim();
				const playerPosition = playerTeamPositionComponents[1].trim();
				const playerValueString = $(row).find("td:nth-of-type(3) span").text().trim();
				const playerValue = +playerValueString.replace(/\./gm,"");
				const playerPopularityString = $(row).find("td:nth-of-type(13)").text().trim();
				const playerPopularity = +(playerPopularityString.replace(/(%|,)/gm,""))/1000;
				const playerUrlComponents = playerUrl.split("/") || [];
				const playerId = playerUrlComponents[playerUrlComponents.length-1];
				playerStats.push({playerName, playerUrl, playerTeam, playerPosition, playerValue, playerPopularity, playerId});
			});
			resolve(playerStats);
		}).catch(err => {
			reject(err);
		});
	});
}

// STATISTICS
// - Run through fixtures and get all that have not been processed.

// STATISTICS
// - Loop through all fixtures that haven't been processed.
// - Update fixtures in fixtures table, including odds
// - Get base stats per player per fixture
// - Run through comments with algorithm and add soft metrics to player
// - Update all data per player

// COMMENTARIES / COMMENTARY_PERMUTATIONS
// - Update all commentaries
// - Update all new commentary permutations

// PLAYERS
// - Get most recent statistics row per players
// - Merge in injury description into players table
