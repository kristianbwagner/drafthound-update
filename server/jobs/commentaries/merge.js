const Postgres = require("../../../database/postgres/postgres.js");
const Database = new Postgres({
	connectionString: "postgres://arryqiptdswjdh:ba3dc52dcf2380392e9ef18a1bc86820d8523a30d6e759c5d63ea68768bbd8b2@ec2-79-125-117-53.eu-west-1.compute.amazonaws.com:5432/dv5o41fic7um5",
	ssl: true
});

const query = "SELECT * FROM commentaries WHERE fixture_id < '1711163'";
Database.query(query).then(data => {
	const rowData = data.rows || [];
	const output = {};
	rowData.forEach(row => {
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
	const queries = [];
	for (const fixturePlayerId in output) {
		const softMetrics = output[fixturePlayerId];
		let query = `UPDATE statistics SET`;
		query += ` possible_fouls=${softMetrics.possible_fouls},`;
		query += ` goals_wide=${softMetrics.goals_wide},`;
		query += ` goals_semi=${softMetrics.goals_semi},`;
		query += ` goals_close=${softMetrics.goals_close},`;
		query += ` assists_wide=${softMetrics.assists_wide},`;
		query += ` assists_semi=${softMetrics.assists_semi},`;
		query += ` assists_close=${softMetrics.assists_close}`;
		query += ` WHERE fixture_id=${softMetrics.fixtureId} AND`;
		query += ` player_id=${softMetrics.playerId}`;
		queries.push(query);
	}

	Database.queryAll(queries).then(() => {
		console.log("Successfully updated.");
	}).catch((err) => {
		console.log(err);
	});
}).catch(err => console.log(err));
