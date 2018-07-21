module.exports = function(app){
  require("./api/players")(app);
  require("./api/statistics")(app);
  require("./api/teams")(app);
}
