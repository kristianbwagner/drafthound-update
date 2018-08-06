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
  app.get("/api/players", (req, res) => {

    // Measure execution time
    var execuionStart = process.hrtime();

    // queries for statistics
    const queries = [
    	"SELECT * FROM players"
    ];
    Database.queryAll(queries).then(data => {
    	const players = data[0].rows || [];
      const execuionTime = process.hrtime(execuionStart)[1] / 1000000;

      res.json({
        success: true,
        execution_time: `${execuionTime}ms`,
        data: players
      });
    }).catch(err => res.json({succes: false}));
  })

  app.get("/api/players/:playerId", (req, res) => {
    const playerId = req.params.playerId;
    if (playerId) {
      const queries = [`SELECT * FROM players where id=${playerId}`];
      Database.queryAll(queries).then(data => {
        const players = data[0].rows || [];
        res.json({
          success: true,
          data: players
        });
      }).catch(err => res.json({
        succes: false,
        message: "Couldn't find any data for this player id"
      }));
    } else {
      res.json({
        succes: false,
        message: "Please provide a valid player id"
      })
    }
  })

	app.post("/api/players/:playerId", (req, res) => {

		// Column schema for table
		const schema = new pgp.helpers.ColumnSet([
			{name: "id", def: null},
			{name: "holdet_id", def: null},
		], {table: "players"});

    const playerId = req.params.playerId;
		const executionStart = process.hrtime();
		const executionTime = process.hrtime(executionStart)[1] / 1000000;

		var execuionStart = process.hrtime();
		const body = req.body;

		if(body.data !== undefined) {
			const playerData = [{
				id: playerId,
				holdet_id: data.holdet_id
			}]
			insertData(playerData, schema).then(() => {
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
