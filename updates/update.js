const fixtures = require('./fixtures/fixtures');
const players = require('./players/players');
const statistics = require('./statistics/statistics');
const commentaries = require('./commentaries/commentaries');
const mergeCommentaries = require('./commentaries/merge');
const mergeStatistics = require('./statistics/merge');
const schedule = require('./schedule.json');
const d3 = require('d3-time-format');

// Find data for day
const todaysDate = new Date();
const formatter = d3.timeFormat('%Y%m%d');
const formattedDate = formatter(todaysDate);
const todaysConfig = schedule[formattedDate]

// Run update if in schedule
if (todaysConfig) {
   console.log('Starting scheduled update with config:');
   Object.keys(todaysConfig).forEach(key => console.log(`> ${key}: ${todaysConfig[key]}`));
   updateData(todaysConfig) 
} else {
   console.log(`No update scheduled.`);
}

function updateData(config){
   fixtures(config).then(() => {
      return players(config);
   }).then(() => {
      return statistics(config);
   }).then(() => {
      return commentaries(config);
   }).then(() => {
      return mergeCommentaries(config);
   }).then(() => {
      return mergeStatistics(config);
   }).then(() => {
      console.log('Successfully updated.')
   }).catch(err => {
      console.log(`Error: ${err}.`);
   });
}