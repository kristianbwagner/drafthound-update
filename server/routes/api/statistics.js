const Postgres = require("../../../database/postgres/postgres.js");
const db_dev  = "postgres://arryqiptdswjdh:ba3dc52dcf2380392e9ef18a1bc86820d8523a30d6e759c5d63ea68768bbd8b2@ec2-79-125-117-53.eu-west-1.compute.amazonaws.com:5432/dv5o41fic7um5";
const db_prod = "postgres://gomhcbepfwkkeq:c12e3f58fd938bbbb0825806f1ac90a08cf415de754b2da8d1c4866cf2981faf@ec2-54-217-205-90.eu-west-1.compute.amazonaws.com:5432/dagkemjclktp71";
const Database = new Postgres({
  connectionString: db_prod,
  ssl: true
});
const drafthoundScoreWeights = require("../../config/dh-score-weights.json");
const cleansheetScoreWeights = require("../../config/cs-score-weights.json");
const NodeCache = require( "node-cache" );
const statsCache = new NodeCache();

module.exports = (app) => {
  app.get("/api/statistics", (req, res) => {

    // Measure execution time
    var executionStart = process.hrtime();

    const path = req.path;
    const config = {
      gamesRequested: parseInt(req.query.games) || 5,
      oddsRequested: parseInt(req.query.odds) || 3,
      homeAway: req.query.home_away,
      favoriteUnderdog: req.query.favorite_underdog
    }

    const cacheKey = `${path}?games=${config.gamesRequested}&odds=${config.oddsRequested}&home_away=${config.homeAway}&favorite_underdog=${config.favoriteUnderdog}`;
    statsCache.get(cacheKey, function( err, data ){
      if (!err && data !== undefined){
        const executionTime = process.hrtime(executionStart)[1] / 1000000;
        res.json({
          success: true,
          games_requested: config.gamesRequested,
          odds_requested: config.oddsRequested,
          execution_time: `${executionTime}ms`,
          data: queryStatistics(req, data)
        });
      } else {
        getStatistics(config).then(data => {
          statsCache.set(cacheKey, data, function( err, success ){
            if (!err && success){
              const executionTime = process.hrtime(executionStart)[1] / 1000000;
              res.json({
                success: true,
                games_requested: config.gamesRequested,
                odds_requested: config.oddsRequested,
                execution_time: `${executionTime}ms`,
                data: queryStatistics(req, data)
              });
            }
          });
        }).catch(err => res.json({
          success: false
        }))
      }
    });
  })

	app.get("/api/statistics/clear-cache", (req, res) => {
		const cacheKeys = statsCache.keys();
		statsCache.del(cacheKeys, function( err, success ){
			res.json({
				deleted: cacheKeys
			})
		})
	})
}

function queryStatistics(req, data){
  const includeQuery = req.query.include;
  const includes = includeQuery !== undefined ? includeQuery.split(",") : ["statistics"];
  let mapData = data.map(player => {

    const statistics = player.statistics || {};
    const playerOutput = {
      player_id: statistics.id,
      games_available: player.gamesAvailableForStatistics,
    };
    includes.forEach(include => {
      playerOutput[include] = player[include];
    })
    return playerOutput;
  })

  // Player query
  const playerQuery = req.query.player_id;
  if (playerQuery !== undefined) {
    mapData = mapData.filter(d => d.player_id === playerQuery);
  }

  return mapData
}


// Main stats function
function getStatistics(rollupConfig) {
  return new Promise((resolve, reject) => {
    const queries = [
      "SELECT * FROM fixtures WHERE status='FT'",
      "SELECT * FROM players",
      "SELECT * FROM statistics",
			"SELECT * FROM teams"
    ];

    Database.queryAll(queries).then(data => {

      // Fixtures rollup
      const fixtures = data[0].rows || [];
      const fixturesPerTeam = rollupFixtures(fixtures);

      // Players rollup
      const players = data[1].rows || [];
      const playersPerId = rollupPlayers(players);

			//console.log(playersPerId);

			// Teams rollup
			const teams = data[3].rows || [];
			const teamsPerId = rollupTeams(teams);

      // Statistics rollup
      const statistics = data[2].rows || [];
      const statisticsPerPlayer = rollupStatistics(statistics, fixtures, teams, playersPerId, rollupConfig);

			// Add any players that dont have any statistics
			// TO-DO put this logic into rollupStatistics instead
			players.forEach(p => {
				if(!statisticsPerPlayer.hasOwnProperty(p.id)){
					statisticsPerPlayer[p.id] = {
						playerId: p.id,
						games: [],
						statistics: {
							goals: 0,
							goals_wide: 0,
							goals_semi: 0,
							goals_close: 0,
							assists: 0,
							assists_wide: 0,
							assists_semi: 0,
							assists_close: 0,
							red_cards: 0,
							yellow_cards: 0,
							fouls_committed: 0,
							fouls_drawn: 0,
							shots: 0,
							shots_on_goal: 0,
							crosses: 0,
							crosses_accuracy: 0,
							passes: 0,
							passes_accuracy: 0,
							offsides: 0,
							saves: 0,
							penalties_scored: 0,
							penalties_missed: 0,
							penalties_saved: 0,
							tackles: 0,
							blocks: 0,
							interceptions: 0,
							clearances: 0,
							minutes_played: 0,
							possible_fouls: 0,
							minutes_played_avg: 0,
							penalty_opportunities: 0,
							penalty_success_rate: 0,
							possible_assists: 0
						},
						gamesIncludedInStatistics: 0,
						gamesAvailableForStatistics: 0
					}
				};
			})

      // Calculate drafthound score
      const outputArray = [];
      for (const playerId in statisticsPerPlayer) {
        const playerData = playersPerId[playerId] || {};
        const teamId = playerData.team_id;
        if (teamId) {
          const teamObject = fixturesPerTeam[teamId] || {};
          const teamStatistics = teamObject.statistics || {};
          const avgGoalsConceded = teamStatistics.goals_conceded_avg;
          const fullName = (playerData.full_name || "").replace(/\s\s/g, " ");
          statisticsPerPlayer[playerId].statistics.team_goals_conceded_0 = avgGoalsConceded < 1 ? 1 : 0;
          statisticsPerPlayer[playerId].statistics.team_goals_conceded_1 = avgGoalsConceded >= 1 && avgGoalsConceded < 2 ? 1 : 0;
          statisticsPerPlayer[playerId].statistics.team_goals_conceded_2 = avgGoalsConceded > 2 ? 1 : 0;
          statisticsPerPlayer[playerId].statistics.team_goals_conceded_avg = teamStatistics.goals_conceded_avg || 0;
          statisticsPerPlayer[playerId].statistics.team_goals_scored_avg = teamStatistics.goals_scored_avg || 0;
          statisticsPerPlayer[playerId].statistics.name = fullName || null;
          statisticsPerPlayer[playerId].statistics.short_name = playerData.name || null;
          statisticsPerPlayer[playerId].statistics.id = playerId || null;
          statisticsPerPlayer[playerId].statistics.height = playerData.height || null;
          statisticsPerPlayer[playerId].statistics.weight = playerData.weight || null;
          statisticsPerPlayer[playerId].statistics.weight = playerData.weight || null;
          statisticsPerPlayer[playerId].statistics.position_id = playerData.position_id || null;
          statisticsPerPlayer[playerId].statistics.positon = playerData.position || null;
          statisticsPerPlayer[playerId].statistics.team_id = playerData.team_id || null;
          statisticsPerPlayer[playerId].statistics.is_injured = playerData.is_injured || null;
          statisticsPerPlayer[playerId].statistics.injury_description = playerData.injury_description || null;
          statisticsPerPlayer[playerId].statistics.holdet_value = isNaN(playerData.holdet_value) ? null : +playerData.holdet_value;
          statisticsPerPlayer[playerId].statistics.holdet_popularity = isNaN(playerData.holdet_popularity) ? null : +playerData.holdet_popularity;
          statisticsPerPlayer[playerId].statistics.holdet_id = playerData.holdet_id || null;
          statisticsPerPlayer[playerId].statistics.holdet_team = playerData.holdet_team || null;
          statisticsPerPlayer[playerId].statistics.is_penalty_shooter = playerData.is_penalty_shooter === true ? 1 : 0;
        } else {
          // If they do not have a team id we discard them from the sample
          statisticsPerPlayer[playerId].statistics.name = "Player unknown";
          statisticsPerPlayer[playerId].statistics.id = playerId;
          statisticsPerPlayer[playerId].statistics.team_id = null;
        }

        const playerStatistics = statisticsPerPlayer[playerId].statistics || {};
        const positionId = playerStatistics.position_id;
        const avgMinutesPlayed = playerStatistics.minutes_played_avg;

        // Calculate cleansheet score
        let cleansheetScore = 0;
        if (positionId && avgMinutesPlayed >= 60) {
          const positionWeights = cleansheetScoreWeights[positionId] || {};
          for (const key in positionWeights) {
            const keyWeight = positionWeights[key] || 0;
            const keyEvents = playerStatistics[key] || 0;
            cleansheetScore += keyEvents * keyWeight;
          }
        }
        statisticsPerPlayer[playerId].statistics.cleansheet_score = cleansheetScore;

        // Calculate drafthound score
        let drafthoundScore = cleansheetScore;
        if (positionId) {
          const positionWeights = drafthoundScoreWeights[positionId] || {};
          for (const key in positionWeights) {
            const keyWeight = positionWeights[key] || 0;
            const keyEvents = playerStatistics[key] || 0;
            drafthoundScore += keyEvents * keyWeight;
          }
        }


				let gameDrafthoundScoreSum = 0;

				// Drafthound score per game
				const playerGames = statisticsPerPlayer[playerId].games || [];
				playerGames.forEach(g => {
					let gameCleansheetScore = 0;
	        if (positionId && g.minutes_played >= 60) {
	          const positionWeights = cleansheetScoreWeights[positionId] || {};
	          for (const key in positionWeights) {
	            const keyWeight = positionWeights[key] || 0;
	            const keyEvents = g[key] || 0;
	            gameCleansheetScore += keyEvents * keyWeight;
	          }
	        }
					g.cleansheet_score = gameCleansheetScore
					let gameDrafthoundScore = gameCleansheetScore;
	        if (positionId) {
	          const positionWeights = drafthoundScoreWeights[positionId] || {};
	          for (const key in positionWeights) {
	            const keyWeight = positionWeights[key] || 0;
	            const keyEvents = g[key] || 0;
	            gameDrafthoundScore += keyEvents * keyWeight;
	          }
	        }
					g.drafthound_score = gameDrafthoundScore
					gameDrafthoundScoreSum += gameDrafthoundScore;
				})

				const gamesRequested = (rollupConfig || {}).gamesRequested || 0;
				const numberOfGames = (statisticsPerPlayer[playerId].games || []).length;
				statisticsPerPlayer[playerId].statistics.drafthound_score = isNaN(gameDrafthoundScoreSum / numberOfGames) ? 0 : (gameDrafthoundScoreSum / numberOfGames);//drafthoundScore
				if (gamesRequested > numberOfGames) {
					statisticsPerPlayer[playerId].statistics.games_enough = false;
				} else {
					statisticsPerPlayer[playerId].statistics.games_enough = true;
				}
        outputArray.push(statisticsPerPlayer[playerId]);
      }

      // Sort outputArray by drafthound score
      const sortedOutput = outputArray.sort((a, b) => b.statistics.drafthound_score - a.statistics.drafthound_score);
      const filteredOutput = sortedOutput.filter(d => d.statistics.team_id !== null && d.statistics.team_id !== undefined);
      const maxDrafthoundScore = filteredOutput[0].statistics.drafthound_score;
      const minDrafthoundScore = filteredOutput[filteredOutput.length-1].statistics.drafthound_score;
      const absMin = Math.abs(minDrafthoundScore);
      const drafthoundDelta = maxDrafthoundScore - minDrafthoundScore;

      filteredOutput.forEach((player, index) => {
        const baseZero = player.statistics.drafthound_score + absMin;
        const weightedScore = (baseZero / drafthoundDelta) * 100;
        player.statistics.drafthound_score_weighted = Math.round(weightedScore * 100) / 100;
      });

      resolve(filteredOutput)
    }).catch(err => reject(err));
  })
}

// Helper - rollup players
function rollupPlayers(players) {
	const playersRollup = {};
	players.forEach(player => {
		playersRollup[player.id] = player;
	});
	return playersRollup;
}

// Helper - rollup teams
function rollupTeams(teams) {
	const teamsRollup = {};
	teams.forEach(team => {
		teamsRollup[team.id] = team;
	});
	return teamsRollup;
}

// Helper - rollup statistics
function rollupStatistics(statistics, fixtures, teams, players, rollupConfig) {
  const config = rollupConfig || {};
  const gamesIncludedInStatistics = config.gamesRequested;
  const homeAway = config.homeAway;
  const favoriteUnderdog = config.favoriteUnderdog;
	const playerRollup = {};
	const statisticsMetrics = [
		"goals",
		"goals_wide",
		"goals_semi",
		"goals_close",
		"assists",
		"assists_wide",
		"assists_semi",
		"assists_close",
		"red_cards",
		"yellow_cards",
		"fouls_committed",
		"fouls_drawn",
		"shots",
		"shots_on_goal",
		"crosses",
		"crosses_accuracy",
		"passes",
		"passes_accuracy",
		"offsides",
		"saves",
		"penalties_scored",
		"penalties_missed",
		"penalties_saved",
		"tackles",
		"blocks",
		"interceptions",
		"clearances",
		"minutes_played",
		"possible_fouls"
	];

	// rollup by player
	statistics.forEach(row => {
		if (!playerRollup.hasOwnProperty(row.player_id)) {
			playerRollup[row.player_id] = {
				playerId: row.player_id,
				games: [],
				statistics: {},
				gamesIncludedInStatistics,
				gamesAvailableForStatistics: 0
			};
			statisticsMetrics.forEach(metric => {
				playerRollup[row.player_id].statistics[metric] = 0;
			});
		}
		playerRollup[row.player_id].games.push(row);
	});

	// Loop over every player and rollup their data
	for (const playerId in playerRollup) {
		const player = playerRollup[playerId];

		player.games.forEach(game => {
			const fixtureId = game.fixture_id;
			const findFixture = fixtures.filter(d => d.id === fixtureId) || [];
			const fixture = findFixture[0] || {};
			const fixtureDate = fixture.date;
			const homeTeamId = fixture.home_team_id;
			const awayTeamId = fixture.away_team_id;
			const findHomeTeam = teams.filter(d => d.id === homeTeamId) || [];
			const findAwayTeam = teams.filter(d => d.id === awayTeamId) || [];
			const homeTeam = findHomeTeam[0] || {};
			const awayTeam = findAwayTeam[0] || {};
			const findPlayer = players[playerId] || {}

			game.clean_date = +fixtureDate.replace(/-/g,"");
			game.home_team_id = fixture.home_team_id;
			game.away_team_id = fixture.away_team_id;
			game.home_team_name = homeTeam.name;
			game.away_team_name = awayTeam.name;
			game.home_team_score = fixture.home_team_score;
			game.away_team_score = fixture.away_team_score;
			game.outcome = fixture.home_team_score === fixture.away_team_score
				? "draw"
				: fixture.home_team_score > fixture.away_team_score
					? "home team win"
					: fixture.away_team_score > fixture.home_team_score
					 	? "away team win"
						: null

			game.player_outcome = game.outcome === "draw"
				? "draw"
				: game.outcome === "home team win" && game.home_away === "home"
					? "win"
					: game.outcome === "away team win" && game.home_away === "away"
						? "win"
						: "loss"
		});

		let games = player.games.sort((a, b) => a.clean_date - b.clean_date);

    // Home away filter
    if (homeAway === "away" || homeAway === "home") {
      games = games.filter(d => d.home_away === homeAway);
    }

    // Favorite underdog filter
    if (favoriteUnderdog === "favorite" || favoriteUnderdog === "underdog") {
      games = games.filter(d => d.favorite_underdog === favoriteUnderdog);
    }

		games = gamesIncludedInStatistics >= games.length
			? games
			: games.slice(games.length - gamesIncludedInStatistics);

		player.gamesAvailableForStatistics = games.length;

		// Aggregate metrics
		games.forEach(game => {
			statisticsMetrics.forEach(metric => {
				player.statistics[metric] += isNaN(game[metric]) ? 0 : game[metric] ;
			});
		});

		// Add calculated metrics
		const avgMinutesPlayed = (player.statistics.minutes_played / games.length) || 0;
		const passesAccuracy = (player.statistics.passes_accuracy / games.length) || 0;
		const crossesAccuracy = ((player.statistics.crosses_accuracy / player.statistics.crosses) * 100) || 0;
		const penaltyOpportunities = (player.statistics.penalties_scored + player.statistics.penalties_missed) || 0;
		const penalitySuccessRate = (player.statistics.penalties_scored / penaltyOpportunities) || 0;
		const possibleAssists = (player.statistics.crosses * (crossesAccuracy / 100)) || 0;
		player.statistics["minutes_played_avg"] = Math.round(avgMinutesPlayed * 100) / 100;
		player.statistics["passes_accuracy"] = Math.round(passesAccuracy * 100) / 100;
		player.statistics["crosses_accuracy"] = Math.round(crossesAccuracy * 100) / 100;
		player.statistics["penalty_opportunities"] = penaltyOpportunities;
		player.statistics["penalty_success_rate"] = Math.round(penalitySuccessRate * 100) / 100;
		player.statistics["possible_assists"] = Math.round(possibleAssists * 100) / 100;
    player.games = games;
	}
	return playerRollup;
}

// Helper - rollup fixtures
function rollupFixtures(fixtures, rollupConfig) {
  const config = rollupConfig || {};
  const gamesIncludedInStatistics = config.gamesRequested;
	const fixturesTeamRollup = {};
	fixtures.forEach(fixture => {
		const homeTeamId = fixture.home_team_id;
		const awayTeamId = fixture.away_team_id;
		if (!fixturesTeamRollup.hasOwnProperty(homeTeamId)){
			fixturesTeamRollup[homeTeamId] = {
				games: [],
				statistics: {
					goals_conceded: 0,
					goals_scored: 0
				},
				gamesAvailableForStatistics: 0
			};
		}
		if (!fixturesTeamRollup.hasOwnProperty(awayTeamId)){
			fixturesTeamRollup[awayTeamId] = {
				games: [],
				statistics: {
					goals_conceded: 0,
					goals_scored: 0
				},
				gamesAvailableForStatistics: 0
			};
		}
		fixturesTeamRollup[homeTeamId].games.push(fixture);
		fixturesTeamRollup[awayTeamId].games.push(fixture);
	});

	// Loop over every player and rollup their data
	for (const teamId in fixturesTeamRollup) {
		const team = fixturesTeamRollup[teamId];
		team.games.forEach(game => game.cleanDate = +game.date.replace(/-/g,""));
		const sortedGames = team.games.sort((a, b) => a.cleanDate - b.cleanDate);


		const games = gamesIncludedInStatistics >= sortedGames
			? sortedGames
			: sortedGames.slice(sortedGames.length - gamesIncludedInStatistics);

		team.gamesAvailableForStatistics = games.length;

		games.forEach(game => {
			if (`${game.home_team_id}` === `${teamId}`) {
				team.statistics.goals_scored += game.home_team_score || 0;
				team.statistics.goals_conceded += game.away_team_score || 0;
			}
			if (`${game.away_team_id}` === `${teamId}`) {
				team.statistics.goals_scored += game.away_team_score || 0;
				team.statistics.goals_conceded += game.home_team_score || 0;
			}
		});

		// Add calculated metrics
		const avgGoalsConceded = (team.statistics.goals_conceded / team.gamesAvailableForStatistics) || 0;
		const avgGoalsScores = (team.statistics.goals_scored / team.gamesAvailableForStatistics) || 0;
		team.statistics.goals_conceded_avg = Math.round(avgGoalsConceded * 100) / 100;
		team.statistics.goals_scored_avg = Math.round(avgGoalsScores * 100) / 100;
	}
	return fixturesTeamRollup;
}
