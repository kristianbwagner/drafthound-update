const Postgres = require("../../database/postgres/postgres.js");
const Database = new Postgres({
	connectionString: "postgres://gomhcbepfwkkeq:c12e3f58fd938bbbb0825806f1ac90a08cf415de754b2da8d1c4866cf2981faf@ec2-54-217-205-90.eu-west-1.compute.amazonaws.com:5432/dagkemjclktp71",
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

const queries = [
	"SELECT * FROM statistics WHERE fixture_id > 10332760",
	"SELECT * FROM players",
	"SELECT * FROM fixtures"
];

Database.queryAll(queries).then(data => {
	const statistics = data[0].rows || [];
	const players = data[1].rows || [];
	const fixtures = data[2].rows || [];

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

	const schema = new pgp.helpers.ColumnSet([
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

	insertData(updates, schema).then(() => {
		console.log("success");
	}).catch((error) => {
		console.log("error")
	});

}).catch(err => res.json({succes: false}));


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
