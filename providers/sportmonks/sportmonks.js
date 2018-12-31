const axios = require("axios");
const config = require("../../server/config/config.json")

module.exports = (config) => {
	return new SportMonks({
		apiKey: config.apiKey,
		seasonId: config.seasonId,
	});
};

class SportMonks {
	// Constructor
	constructor(config) {
		this.seasonId = config.seasonId;
		this.apiKey = config.apiKey;
	}

	// Getters
	get players() {
		return new Promise((resolve, reject) => {
			const requestUrl = this.createUrl("teams/season/" + this.seasonId);
			const teamIds = [];
			axios.get(requestUrl).then(response => {
				const responseData = response.data || {};
				const teamData = responseData.data;
				const squadRequests = teamData.map(team => {
					teamIds.push(team.id);
					return axios.get(this.createUrl("squad/season/" + this.seasonId + "/team/" + team.id, "include=player,position"));
				});
				return Promise.all(squadRequests);
			}).then(responses => {
				//console.log(teamIds);
				let allPlayers = [];
				responses.forEach((response, responseIndex) => {
					const responseData = response.data;
					(responseData.data || []).forEach(d => {
						const playerInfo = d.player || {};
						const playerInfoData = playerInfo.data || {};
						playerInfoData.team_id = teamIds[responseIndex];
					})
					allPlayers = allPlayers.concat(responseData.data);
				});
				resolve(allPlayers);
			}).catch(error => {
				reject(error);
			});
		});
	}

	get fixtures() {
		return new Promise((resolve,reject) => {
			const requestUrl = this.createUrl("seasons/" + this.seasonId, "include=fixtures");
			axios.get(requestUrl).then(response => {
				const responseData = response.data || {};
				const seasonData = responseData.data || {};
				const fixturesObject = seasonData.fixtures || {};
				const fixturesData = fixturesObject.data || {};
				resolve(fixturesData);
			}).catch(error => {
				reject(error);
			});
		});
	}

	get teams() {
		return new Promise((resolve,reject) => {
			const requestUrl = this.createUrl("teams/season/" + this.seasonId);
			axios.get(requestUrl).then(response => {
				const responseData = response.data || {};
				resolve(responseData.data);
			}).catch(error => {
				reject(error);
			});
		});
	}

	get statistics() {
		return new Promise((resolve,reject) => {
			const requestUrl = this.createUrl("seasons/" + this.seasonId, "include=fixtures");
			axios.get(requestUrl).then(response => {
				const responseData = response.data || {};
				const seasonData = responseData.data || {};
				const fixturesObject = seasonData.fixtures || {};
				const fixturesData = fixturesObject.data || [];
				const fixtureIds = fixturesData.map(fixture => fixture.id);
				const sampleIds = fixtureIds.filter(f => f >= config.roundStart && f <= config.roundStop);
				return Promise.all(sampleIds.map(id => {
					return axios.get(this.createUrl("fixtures/" + id, "include=lineup,comments,sidelined,bench"));
				}));
			}).then(responses => {
				let allLineupData = [];
				responses.forEach(response => {
					const responseData = response.data || {};
					const fixtureData = responseData.data;
					const lineupData = fixtureData.lineup.data;
					const benchData = fixtureData.bench.data;
					allLineupData = allLineupData.concat(lineupData);
					allLineupData = allLineupData.concat(benchData);
				});
				resolve(allLineupData);
			}).catch(error => {
				reject(error);
			});
		});
	}

	get commentaries() {
		return new Promise((resolve,reject) => {
			const requestUrl = this.createUrl("seasons/" + this.seasonId, "include=fixtures");
			axios.get(requestUrl).then(response => {
				const responseData = response.data || {};
				const seasonData = responseData.data || {};
				const fixturesObject = seasonData.fixtures || {};
				const fixturesData = fixturesObject.data || [];
				const fixtureIds = fixturesData.map(fixture => fixture.id);
				const sampleIds = fixtureIds.filter(f => f >= config.roundStart && f <= config.roundStop);
				return Promise.all(sampleIds.map(id => {
					return axios.get(this.createUrl("fixtures/" + id, "include=comments"));
				}));
			}).then(responses => {
				let allCommentData = [];
				responses.forEach(response => {
					const responseData = response.data || {};
					const data = responseData.data;
					const commentsObject = data.comments || {};
					const comments = commentsObject.data;
					allCommentData = allCommentData.concat(comments);
				});
				resolve(allCommentData);
			}).catch(error => {
				reject(error);
			});
		});
	}

	get injuries() {
		return new Promise((resolve,reject) => {
			const requestUrl = this.createUrl("seasons/" + this.seasonId, "include=fixtures");
			axios.get(requestUrl).then(response => {
				const responseData = response.data || {};
				const seasonData = responseData.data || {};
				const fixturesObject = seasonData.fixtures || {};
				const fixturesData = fixturesObject.data || [];
				const fixtureIds = fixturesData.map(fixture => fixture.id);
				const sampleIds = fixtureIds.filter(f => f <= 1711181 && f >= 1711172);
				return Promise.all(sampleIds.map(id => {
					return axios.get(this.createUrl("fixtures/" + id, "include=sidelined"));
				}));
			}).then(responses => {
				let allInjuries = [];
				const allTeams = [];
				responses.forEach(response => {
					const responseData = response.data || {};
					const data = responseData.data;
					const homeTeam = data.localteam_id;
					const awayTeam = data.visitorteam_id;
					allTeams.push(homeTeam);
					allTeams.push(awayTeam);
					const injuriesObject = data.sidelined || {};
					const injuries = injuriesObject.data;
					allInjuries = allInjuries.concat(injuries);
				});
				resolve({
					teams: allTeams,
					injuries: allInjuries
				});
			}).catch(error => {
				reject(error);
			});
		});
	}

	commentaryStatisticsForFixture(fixtureId) {
		return new Promise((resolve,reject) => {
			const requestUrl = this.createUrl("fixtures/" + fixtureId,"include=comments");
			axios.get(requestUrl).then(response => {
				const responseData = response.data || {};
				const data = responseData.data;
				const commentsObject = data.comments || {};
				const comments = commentsObject.data;
				resolve(comments);
			}).catch(error => {
				reject(error);
			});
		});
	}

	statisticsForFixture(fixtureId) {
		return new Promise((resolve, reject) => {
			const requestUrl = this.createUrl("fixtures/" + fixtureId, "include=lineup,comments,sidelined");
			axios.get(requestUrl).then(response => {
				const responseData = response.data || {};
				const fixtureData = responseData.data;
				const lineupData = fixtureData.lineup.data;
				resolve(lineupData);
			}).catch(error => {
				reject(error);
			});
		});
	}

	// Methods
	createUrl(path, queries) {
		return "https://soccer.sportmonks.com/api/v2.0/" + path + "?api_token=" + this.apiKey + "&" + queries;
	}

	processCommentariesForFixture() {
		return this.seasonId;
	}

	getStatisticsForPlayers() {
		return this.seasonId;
	}
}
