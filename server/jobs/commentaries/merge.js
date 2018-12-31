const config = require("../../../server/config/config.json");
const postgres = require("../../../providers/postgres");
const database = postgres.database;

function mergeCommentaries() {

	return new Promise((resolve, reject) => {
		const startFixtureId = config.roundStart;
		const endFixtureId = config.roundStop;
		const filterStrings = [];
		for (var i = startFixtureId; i <= endFixtureId; i++) {
			filterStrings.push("fixture_id = '" + i + "'");
		}
		const whereFilter = filterStrings.join(" OR ");
		const query = "SELECT * FROM commentaries WHERE " + whereFilter;

		console.log("> Fetching commentaries...");
		database.query(query).then(commentaries => {
			const commentaryRows = commentaries || [];
			const output = {};
			commentaryRows.forEach(row => {
				const fixtureId = row.fixture_id;
				const playerIds = row.player_ids;
				const playerEvents = row.player_events;
				if (playerIds !== "" && playerEvents !== "") {
					const players = playerIds.split("|");
					const events = playerEvents.split("|");
					players.forEach((playerId, index) => {
						const fixturePlayerId = `${fixtureId}-${playerId}`;
						const event = events[index];
						if (!output.hasOwnProperty(fixturePlayerId)) {
							output[fixturePlayerId] = {
								possible_fouls: 0,
								goals_wide: 0,
								goals_semi: 0,
								goals_close: 0,
								assists_wide: 0,
								assists_semi: 0,
								assists_close: 0,
								fixtureId,
								playerId
							};
						}
						if (event === "FoulPossible") {output[fixturePlayerId].possible_fouls += 1;}
						if (event === "GoalWide") {output[fixturePlayerId].goals_wide += 1;}
						if (event === "GoalSemi") {output[fixturePlayerId].goals_semi += 1;}
						if (event === "GoalClose") {output[fixturePlayerId].goals_close += 1;}
						if (event === "AssistWide") {output[fixturePlayerId].assists_wide += 1;}
						if (event === "AssistSemi") {output[fixturePlayerId].assists_semi += 1;}
						if (event === "AssistClose") {output[fixturePlayerId].assists_close += 1;}
					});
				}
			});

			// console.log(output);
			const statisticsUpdates = [];
			for (const fixturePlayerId in output) {
				const softMetrics = output[fixturePlayerId];
				statisticsUpdates.push({
					id: `${softMetrics.fixtureId}-${softMetrics.playerId}`,
					fixture_id: softMetrics.fixtureId,
					player_id: softMetrics.playerId,
					possible_fouls: softMetrics.possible_fouls,
					goals_wide: softMetrics.goals_wide,
					goals_semi: softMetrics.goals_semi,
					goals_close: softMetrics.goals_close,
					assists_wide: softMetrics.assists_wide,
					assists_semi: softMetrics.assists_semi,
					assists_close: softMetrics.assists_close
				})				
			}

			const updateSchema = new postgres.helpers.ColumnSet([
				{name: "id", def: null},
				{name: "fixture_id", def: null},
				{name: "player_id", def: null},
				{name: "possible_fouls", def: null},
				{name: "goals_wide", def: null},
				{name: "goals_semi", def: null},
				{name: "goals_close", def: null},
				{name: "assists_wide", def: null},
				{name: "assists_semi", def: null},
				{name: "assists_close", def: null},
			], {table: "statistics"});

			console.log("> Merging into statistics...");
			return postgres.insertData(statisticsUpdates, updateSchema);
		}).then(() => {
			console.log("> Done.");
			resolve()
		}).catch(err => reject(err));
	})
}

module.exports = mergeCommentaries;