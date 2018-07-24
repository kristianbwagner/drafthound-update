const Postgres = require("../../../database/postgres/postgres.js");
const Database = new Postgres({
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
    // Measure execution time
    var execuionStart = process.hrtime();
    const execuionTime = process.hrtime(execuionStart)[1] / 1000000;
    res.json({
      success: true,
      execution_time: `${execuionTime}ms`,
      message: "Succesfully updated"
    })
  })
}
