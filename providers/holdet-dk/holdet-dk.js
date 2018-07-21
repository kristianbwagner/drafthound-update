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
