const getClosest = require("get-closest");
const Levenshtein = require("levenshtein");
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
		Database.query(Database.table("commentary_permutations").select()).then(data => {
			const permutations = data.rows;
			const permutationObjects = permutations.map(row => {
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
		Database.query(Database.table("players").columns(["id", "name", "full_name"]).select()).then(data => {
			const rowData = data.rows || [];
			resolve(rowData);
		}).catch(err => {
			reject(err);
		});
	});
}

function getCommentaryStatistics() {
	return new Promise((resolve, reject) => {
		getPermutations().then(permutations => {
			getPlayers().then((allPlayers) => {
				const playerList = allPlayers.map(d => {return d.name;});
				premierLeague.commentaries.then((commentObjects) => {
					const commentaries = [];
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
							return getClosestMatch(p, playerList).closestValue;
						});
						const playerIds = playerMatches.map(p => {
							const matchedIndex = getClosestMatch(p, playerList).index;
							return allPlayers[matchedIndex].id;
						});
						const playerEvents = bestMatch.playerEvents !== undefined ? bestMatch.playerEvents.split("|") : "";
						commentaries.push({
							order: commentObject.order,
							id: fixtureId + "-" + commentObject.order,
							fixtureId: fixtureId,
							commentString,
							bestMatch,
							playerMatches,
							playerEvents,
							playerNames,
							playerIds
						});
					});
					resolve(commentaries);
				});
			});
		}).catch(err => {
			reject(err);
		});
	});
}

getCommentaryStatistics().then(commentaries => {
	const queries = [];
	commentaries.forEach(commentary => {
		const update = {
			fixture_id: commentary.fixtureId,
			commentary: commentary.commentString,
			permutation_id: (commentary.bestMatch || {}).permutationId || 0,
			player_ids: (commentary.playerIds || []).join("|"),
			player_names: (commentary.playerNames || []).join("|"),
			player_events: (commentary.playerEvents || []).join("|")
		};
		queries.push(Database.table("commentaries").find(commentary.id).update(update));
	});
	Database.queryAll(queries).then(() => {
		console.log("Successfully updated.");
	}).catch((err) => {
		console.log(err);
	});
}).catch(err => console.log(err));
