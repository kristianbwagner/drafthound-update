const Postgres = require("../../../database/postgres/postgres.js");
const Database = new Postgres({
  connectionString: "postgres://arryqiptdswjdh:ba3dc52dcf2380392e9ef18a1bc86820d8523a30d6e759c5d63ea68768bbd8b2@ec2-79-125-117-53.eu-west-1.compute.amazonaws.com:5432/dv5o41fic7um5",
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
}
