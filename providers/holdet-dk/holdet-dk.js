const axios = require("axios");
const cheerio = require("cheerio");

module.exports = (seasonId) => {
	return new HoldetDk(seasonId);
};

class HoldetDk {
	// Constructor
	constructor(seasonId) {
		this.seasonId = seasonId;
		this.seasonUrl = this.urlForSeason;
	}

	// Getters
	get urlForSeason() {
		return "this is corresponding url for this season";
	}

	get numberOfStatsPages() {
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

	get players() {
		return new Promise((resolve, reject) => {
			const firstStatsPage = "https://www.holdet.dk/da/premier-league-fantasy-fall-2018/statistics?page=0";
			axios.get(firstStatsPage).then(response => {
				const responseHtml = response.data;
				const $ = cheerio.load(responseHtml);
				const lastPage = $("#ctl00_ctl00_placeholder_placeholder_pager").find("li:not(.arrow) a").last().text();
				var statsUrls = [];
				for (let i = 0; i <= lastPage; i++) {
					statsUrls.push("https://www.holdet.dk/da/premier-league-fantasy-fall-2018/statistics?page=" + i);
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
								playerStats.push({playerName, playerUrl, playerTeam, playerPosition, playerValue, playerPopularity, playerId});
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

	// Methods
	getPlayers() {
		return this.seasonId;
	}

	getFixtures() {
		return this.seasonId;
	}

	getStatisticsForPlayers() {
		return this.seasonId;
	}

	statisticsForFixture(fixtureId) {
		return fixtureId;
	}

}
