const axios = require("axios");
const cheerio = require("cheerio");

module.exports = (config) => {
	return new HoldetDk({
		url: config.url
	});
};

class HoldetDk {
	
	// Constructor
	constructor(config) {
		this.url = config.url;
	}

	// Getters
	get players() {
		return new Promise((resolve, reject) => {
			const firstStatsPage = `${this.url}/statistics?page=0`;
			axios.get(firstStatsPage).then(response => {
				const responseHtml = response.data;
				const $ = cheerio.load(responseHtml);
				const lastPage = $("#ctl00_ctl00_placeholder_placeholder_pager").find("li:not(.arrow) a").last().text();
				var statsUrls = [];
				for (let i = 0; i <= lastPage; i++) {
					statsUrls.push(`${this.url}/statistics?page=${i}`);
				}

				Promise.all(statsUrls.map(holdetUrl => {
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
								const playerGrowth = $(row).find("td:nth-of-type(5) span").text().trim();
								const playerGoals = $(row).find("td:nth-of-type(6) span").text().trim();
								const playerAssists = $(row).find("td:nth-of-type(7) span").text().trim();
								const playerRed = $(row).find("td:nth-of-type(8) span").text().trim();
								const playerYellow = $(row).find("td:nth-of-type(9) span").text().trim();
								const playerShots = $(row).find("td:nth-of-type(10) span").text().trim();
								const playerSaves = $(row).find("td:nth-of-type(11)").text().trim();
								const playerGamesPlayed = $(row).find("td:nth-of-type(12)").text().trim();
								const playerTrend = $(row).find("td:nth-of-type(13)").text().trim();
								const playerIndex = $(row).find("td:nth-of-type(14)").text().trim();
								playerStats.push({playerName, playerUrl, playerTeam, playerPosition, playerValue, playerPopularity, playerId, playerGrowth, playerGoals, playerAssists, playerRed, playerYellow, playerShots, playerSaves, playerGamesPlayed, playerTrend, playerIndex});
							});
							resolve(playerStats);
						}).catch(err => {
							reject(err);
						});
					})
				})).then((responses) => {
					const allPlayers = [].concat.apply([], responses);
					resolve(allPlayers);
				}).catch(err => reject(err))
			}).catch(err => {
				reject(err);
			});
		});
	}

}
