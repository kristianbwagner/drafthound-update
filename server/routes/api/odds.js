const Postgres = require("../../../database/postgres/postgres.js");
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

module.exports = (app) => {
  app.get("/api/odds", (req, res) => {

    // Measure execution time
    var execuionStart = process.hrtime();

    // queries for statistics
    const queries = [
    	"SELECT * FROM fixtures",
      "SELECT * FROM teams"
    ];
    Database.queryAll(queries).then(data => {
    	const fixtures = data[0].rows || [];
      const teams = data[1].rows || [];
      const teamsPerId = {};
      teams.forEach(t => {
        teamsPerId[t.id] = t
      })
      const oddsFixtures = fixtures.map(f => {
        const homeTeam = teamsPerId[f.home_team_id] || {};
        const awayTeam = teamsPerId[f.away_team_id] || {};
        return {
          fixture_id: f.id,
          date: f.date,
          home_team_id: f.home_team_id,
          away_team_id: f.away_team_id,
          home_team_name: homeTeam.name || "n/a",
          away_team_name: awayTeam.name || "n/a",
          home_team_odds: f.home_team_odds || 0,
          away_team_odds: f.away_team_odds || 0
        }
      })

      const execuionTime = process.hrtime(execuionStart)[1] / 1000000;

      res.json({
        success: true,
        execution_time: `${execuionTime}ms`,
        data: oddsFixtures
      });
    }).catch(err => res.json({succes: false}));
  })

  app.post("/api/odds", (req, res) => {

		// Column schema for table
		const schema = new pgp.helpers.ColumnSet([
			{name: "id", def: null},
			{name: "home_team_odds", def: null},
			{name: "away_team_odds", def: null}
		], {table: "fixtures"});

		var execuionStart = process.hrtime();
		const body = req.body;

		if(body.data !== undefined) {
			const oddsData = (body.data || []).map(d => {
				return {
					id: d.fixture_id,
					home_team_odds: d.home_team_odds,
					away_team_odds: d.away_team_odds
				}
			})
			insertData(oddsData, schema).then(() => {
		    const execuionTime = process.hrtime(execuionStart)[1] / 1000000;
		    res.json({
		      success: true,
		      execution_time: `${execuionTime}ms`,
		      message: "Succesfully updated"
		    })
			}).catch((error) => {
				const execuionTime = process.hrtime(execuionStart)[1] / 1000000;
				res.json({
		      success: false,
		      execution_time: `${execuionTime}ms`,
		      message: "Couln't update odds data"
		    })
			});
		} else {
			const execuionTime = process.hrtime(execuionStart)[1] / 1000000;
			res.json({
				success: false,
				execution_time: `${execuionTime}ms`,
				message: "Please provide a valid data body"
			})
		}
  })

}


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
