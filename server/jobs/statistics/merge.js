const config = require("../../../server/config/config.json");
const postgres = require("../../../providers/postgres");
const database = postgres.database;

function mergeHomeAway(){
	return new Promise((resolve, reject) => {
		console.log("> Fetching statistics...");
		Promise.all([
			database.query("SELECT * FROM statistics WHERE fixture_id >= " + config.roundStart),
			database.query("SELECT * FROM players"),
			database.query("SELECT * FROM fixtures")	
		]).then(data => {
			const statistics = data[0] || [];
			const players = data[1] || [];
			const fixtures = data[2] || [];
		
			const playersPerId = {};
			players.forEach(p => {
				if(p.id !== undefined) {
					playersPerId[p.id] = p;
				}
			})
		
			const fixturesPerId = {};
			fixtures.forEach(f => {
				if(f.id !== undefined) {
					fixturesPerId[f.id] = f;
				}
			})
		
			const schema = new postgres.helpers.ColumnSet([
				{name: "id", def: null},
				{name: "home_away", def: null},
				{name: "favorite_underdog", def: null},
			], {table: "statistics"});
		
			const updates = [];
		
			statistics.forEach(s => {
				const fixtureId = s.fixture_id;
				const playerId = s.player_id;
				const playerStats = playersPerId[playerId] || {};
				const playerTeamId = playerStats.team_id;
				const fixtureStats = fixturesPerId[fixtureId] || {};
				const homeTeamId = fixtureStats.home_team_id;
				const awayTeamId = fixtureStats.away_team_id;
				const homeTeamOdds = fixtureStats.home_team_odds;
				const awayTeamOdds = fixtureStats.away_team_odds;
				const homeAway = playerTeamId === homeTeamId ? "home" : playerTeamId === awayTeamId ? "away" : null;
				let favUnderdog = null;
		
				if (homeAway === "home" && homeTeamOdds < awayTeamOdds) {
					favUnderdog = "favorite";
				}
		
				if (homeAway === "home" && homeTeamOdds > awayTeamOdds) {
					favUnderdog = "underdog";
				}
		
				if (homeAway === "away" && awayTeamOdds < homeTeamOdds) {
					favUnderdog = "favorite";
				}
		
				if (homeAway === "away" && awayTeamOdds > homeTeamOdds) {
					favUnderdog = "underdog";
				}
		
				if (homeAway !== null) {
					updates.push({
						id: s.id,
						home_away: homeAway,
						favorite_underdog: favUnderdog
					})
				}
			})
		
			console.log("> Merging into statistics...");
			return postgres.insertData(updates, schema)
		}).then(() => {
			console.log("> Done.");
			resolve();
		}).catch(err => reject(err));
	})
}

module.exports = mergeHomeAway;