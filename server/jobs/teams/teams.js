const sportmonks = require("../../../providers/sportmonks/sportmonks.js");
const premierLeague = sportmonks({
	seasonId: 12962, //6397 // 12962
	apiKey: "1jgYd5VzNwfv7uOMpESFmDYtsGUvHevpDjmLa3LBpzvA6OOfno9NnoG166C8"
});

const pgp = require('pg-promise')({
	capSQL: true
});

// Create connection ref to database
const db = pgp({
	connectionString: "postgres://gomhcbepfwkkeq:c12e3f58fd938bbbb0825806f1ac90a08cf415de754b2da8d1c4866cf2981faf@ec2-54-217-205-90.eu-west-1.compute.amazonaws.com:5432/dagkemjclktp71",
	ssl: true
});

// Column schema for table
const teamsSchema = new pgp.helpers.ColumnSet([
	{name: "id", def: null},
	{name: "season_id", def: null},
	{name: "created_at", def: null},
	{name: "updated_at", def: null},
	{name: "name", def: null},
	{name: "image_url", def: null},
	{name: "holdet_name", def: null}
], {table: "teams"});

const timestamp = new Date().getTime();
premierLeague.teams.then((teams) => {
	const queries = [];
	const outputData = teams.map((team) => {
		return {
			id: team.id,
			season_id: premierLeague.seasonId,
			created_at: timestamp,
			updated_at: timestamp,
			name: team.name,
			image_url: team.logo_path,
			holdet_name: ""
		};
	});
	return insertData(outputData, teamsSchema);
}).then(() => {
	console.log("success");
}).catch((error) => {
	console.log(error);
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
