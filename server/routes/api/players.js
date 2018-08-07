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
			{name: "is_injured", def: null},
			{name: "injury_description", def: null},
			{name: "holdet_url", def: null},
			{name: "holdet_name", def: null},
			{name: "holdet_position", def: null},
			{name: "holdet_value", def: null},
			{name: "holdet_popularity", def: null},
			{name: "holdet_team", def: null},
		], {table: "players"});

    const playerId = req.params.playerId;
		const executionStart = process.hrtime();
		const executionTime = process.hrtime(executionStart)[1] / 1000000;

		var execuionStart = process.hrtime();
		const body = req.body;

		if(body.data !== undefined) {

			if (body.data.holdet_id === "") {

				const playerData = [{
					id: playerId,
					holdet_id: body.data.holdet_id,
					is_injured: body.data.is_injured,
					injury_description: body.data.injury_description,
					holdet_url: null,
					holdet_name: null,
					holdet_position: null,
					holdet_value: null,
					holdet_popularity: null,
					holdet_team: null,
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
				getPlayerStatistics().then(playerStats => {

					const findPlayers = playerStats.filter(d => d.playerId === body.data.holdet_id) || [];
					const holdetPlayer = findPlayers[0];

					const playerData = [{
						id: playerId,
						holdet_id: body.data.holdet_id,
						is_injured: body.data.is_injured,
						injury_description: body.data.injury_description,
						holdet_url: holdetPlayer.playerUrl || null,
						holdet_name: holdetPlayer.playerName || null,
						holdet_position: holdetPlayer.playerPosition || null,
						holdet_value: holdetPlayer.playerValue || null,
						holdet_popularity: holdetPlayer.playerPopularity || null,
						holdet_team: holdetPlayer.playerTeam || null,
					}]

					console.log(playerData);

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
				}).catch(err => {
					const execuionTime = process.hrtime(execuionStart)[1] / 1000000;
					res.json({
						success: false,
						execution_time: `${execuionTime}ms`,
						message: "Couln't update odds data"
					})
				})
			}

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

const axios = require("axios");
const cheerio = require("cheerio");

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

function getPlayerStatistics() {
	return new Promise((resolve, reject) => {
		getNumberOfStatisticsPages().then(page => {
			var statsUrls = [];
			for (let i = 0; i <= page; i++) {
				statsUrls.push("https://www.holdet.dk/da/premier-league-fantasy-fall-2018/statistics?page=" + i);
			}
			return Promise.all(statsUrls.map(url => {return getPlayerStatsFromHoldetPage(url);}));
		}).then(responses => {
			const allPlayers = [].concat.apply([], responses);
			resolve(allPlayers);
		}).catch(err => {
			reject(err);
		});
	});
}

function getNumberOfStatisticsPages() {
	return new Promise((resolve, reject) => {
		const firstStatsPage = "https://www.holdet.dk/da/premier-league-fantasy-fall-2018/statistics?page=0";
		axios.get(firstStatsPage).then(response => {
			const responseHtml = response.data;
			const $ = cheerio.load(responseHtml);
			const lastPage = $("#ctl00_ctl00_placeholder_placeholder_pager").find("li:not(.arrow) a").last().text();
			resolve(lastPage);
		}).catch(err => {
			reject(err);
		});
	});
}

function getPlayerStatsFromHoldetPage(holdetUrl) {
	return new Promise((resolve, reject) => {
		axios.get(holdetUrl).then(response => {
			const responseHtml = response.data;
			const $ = cheerio.load(responseHtml);
			const tableRows = $("table tbody tr");
			const playerStats = [];
			tableRows.each((index, row) => {
				const playerCol = $(row).find("td:nth-of-type(2)");
				const playerName = playerCol.find("strong a").text();
				const playerUrl = playerCol.find("strong a").attr("href");
				const playerTeamPosition = playerCol.find(".small.meta").text();
				const playerTeamPositionComponents = playerTeamPosition.split("-") || [];
				const playerTeam = playerTeamPositionComponents[0].trim();
				const playerPosition = playerTeamPositionComponents[1].trim();
				const playerValueString = $(row).find("td:nth-of-type(3) span").text().trim();
				const playerValue = +playerValueString.replace(/\./gm,"");
				const playerPopularityString = $(row).find("td:nth-of-type(13)").text().trim();
				const playerPopularity = +(playerPopularityString.replace(/(%|,)/gm,""))/1000;
				const playerUrlComponents = playerUrl.split("/") || [];
				const playerId = playerUrlComponents[playerUrlComponents.length-1];
				playerStats.push({playerName, playerUrl, playerTeam, playerPosition, playerValue, playerPopularity, playerId});
			});
			resolve(playerStats);
		}).catch(err => {
			reject(err);
		});
	});
}
