const Postgres = require("../../../database/postgres/postgres.js");
const Database = new Postgres({
  connectionString: "postgres://gomhcbepfwkkeq:c12e3f58fd938bbbb0825806f1ac90a08cf415de754b2da8d1c4866cf2981faf@ec2-54-217-205-90.eu-west-1.compute.amazonaws.com:5432/dagkemjclktp71",
  ssl: true
});

module.exports = (app) => {
  app.get("/api/fixtures", (req, res) => {

    // Measure execution time
    var execuionStart = process.hrtime();

    // queries for statistics
    const queries = [
    	"SELECT * FROM fixtures"
    ];
    Database.queryAll(queries).then(data => {
    	const fixtures = data[0].rows || [];
      const execuionTime = process.hrtime(execuionStart)[1] / 1000000;

      res.json({
        success: true,
        execution_time: `${execuionTime}ms`,
        data: fixtures
      });
    }).catch(err => res.json({succes: false}));
  })
}
