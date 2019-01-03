// Create reference to postgres
const postgres = require("../../providers/postgres");
const database = postgres.database;
const getClosest = require("get-closest");
const Levenshtein = require("levenshtein");
const Sportmonks = require("../../providers/sportmonks/sportmonks.js");

function getClosestMatch(testValue, inArray) {
	const closestIndex = getClosest.custom(testValue, inArray, (compareTo, baseItem) => {
		return new Levenshtein(compareTo, baseItem).distance;
	});
	return {
		index: closestIndex,
		closestValue: inArray[closestIndex]
	};
}

function getPermutations() {
	return new Promise((resolve, reject) => {
		console.log("> Fetching permutations...");
		database.query("SELECT * FROM commentary_permutations").then(commentaryPermutations => {
			const permutationObjects = commentaryPermutations.map(row => {
				const cleanString = row.commentary_match_string.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&").replace(/\d+/g,".*");
				const matchString = "^" + cleanString.replace(/\\{\\{(PLAYERNAME|TEAMNAME)\\}\\}/gm,".*") + "$";
				const matchPlayersString = "^" + cleanString.replace(/\\{\\{(PLAYERNAME)\\}\\}/gm,"(.*)").replace(/\\{\\{(TEAMNAME)\\}\\}/gm,".*") + "$";
				return {
					permutationId: row.id,
					playerEvents: row.player_events,
					stringLength: row.commentary_match_string.length,
					rawString: row.commentary_match_string,
					matchRegex: new RegExp(matchString),
					matchPlayersString: new RegExp(matchPlayersString)
				};
			});
			resolve(permutationObjects);
		}).catch(err => {
			reject(err);
		});
	});
}

function getPlayers() {
	return new Promise((resolve, reject) => {
		console.log("> Fetching players...");
		database.query("SELECT id, name, full_name, holdet_name FROM PLAYERS").then(players => {
			const playerData = players || [];
			resolve(playerData);
		}).catch(err => {
			reject(err);
		});
	});
}

function updateCommentaries(config) {
	return new Promise((resolve, reject) => {

		// Create instance
		const premierLeagueSportmonks = Sportmonks({
			seasonId: config.sportMonksSeasonId,
			apiKey: config.sportMonksApiKey,
			roundStart: config.roundStart,
			roundStop: config.roundStop,
		});

		let allPlayers = [];
		let playerList = [];
		let playerList2 = [];
		let permutations = [];
		let commentaryUpdates = [];

		getPermutations().then(commentaryPermutations => {
			permutations = commentaryPermutations;
			return getPlayers();
		}).then((players) => {
			allPlayers = players;
			playerList = allPlayers.map(d => d.holdet_name || '');
			playerList2 = allPlayers.map(d => d.name || '');
			console.log("> Fetching commentaries...");
			return premierLeagueSportmonks.commentaries;
		}).then((commentObjects) => {

			console.log("> Processing commentaries...");
			commentObjects.forEach(commentObject => {
				const commentString = commentObject.comment;
				const fixtureId = commentObject.fixture_id;
				const matchedPermutations = permutations.filter(p => {
					return commentString.match(p.matchRegex) !== null;
				}) || [];
				const bestMatch = matchedPermutations[0] || {};
				const matchedPlayers = commentString.match(bestMatch.matchPlayersString);

				// Remove first element from players list
				const playerMatches = matchedPlayers.slice(1);
				const playerNames = playerMatches.map(p => {
					const test1 = getClosestMatch(p, playerList).closestValue;
					const test2 = getClosestMatch(p, playerList2).closestValue;
					const testOverall = getClosestMatch(p, [test1, test2]).closestValue;
					return testOverall;
				});

				const playerIds = playerMatches.map(p => {
					const matchedIndex = getClosestMatch(p, playerList).index;
					return allPlayers[matchedIndex].id;
				});

				const playerEvents = bestMatch.playerEvents !== undefined ? bestMatch.playerEvents.split("|") : "";

				commentaryUpdates.push({
					id: `${fixtureId}-${commentObject.order}`,
					fixture_id: fixtureId,
					commentary: commentString,
					permutation_id: (bestMatch || {}).permutationId || 0,
					player_ids: (playerIds || []).join("|"),
					player_names: (playerNames || []).join("|"),
					player_events: (playerEvents || []).join("|")
				})
			});

			const updateSchema = new postgres.helpers.ColumnSet([
				{name: "id", def: null},
				{name: "fixture_id", def: null},
				{name: "commentary", def: null},
				{name: "permutation_id", def: null},
				{name: "player_ids", def: null},
				{name: "player_names", def: null},
				{name: "player_events", def: null}
			], {table: "commentaries"});

			console.log("> Updating commentaries...");
			return postgres.insertData(commentaryUpdates, updateSchema);
		}).then(() => {
			console.log("> Done.");
			resolve();
		}).catch(err => {
			reject(err);
		});
	});
}

module.exports = updateCommentaries;
