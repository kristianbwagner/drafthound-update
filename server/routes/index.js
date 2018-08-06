module.exports = function(app){
  require("./api/odds")(app);
  require("./api/fixtures")(app);
  require("./api/players")(app);
  require("./api/statistics")(app);
  require("./api/teams")(app);
	require("./api/check-players")(app);
}
