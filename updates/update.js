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
   console.log('\nStarting scheduled update with config:');
   Object.keys(todaysConfig).forEach(key => console.log(`> ${key}: ${todaysConfig[key]}`));
   updateData(todaysConfig) 
} else {
   console.log(`\nNo update scheduled.\n`);
}

function updateData(config){
   console.log('\n(1/6) Fixtures');
   fixtures(config).then(() => {
      console.log('\n(2/6) Players');
      return players(config);
   }).then(() => {
      console.log('\n(3/6) Statistics');
      return statistics(config);
   }).then(() => {
      console.log('\n(4/6) Commentaries');
      return commentaries(config);
   }).then(() => {
      console.log('\n(5/6) Merge commentaries');
      return mergeCommentaries(config);
   }).then(() => {
      console.log('\n(6/6) Merge statistics');
      return mergeStatistics(config);
   }).then(() => {
      console.log('\nSuccessfully updated. Closing connection...\n')
   }).catch(err => {
      console.log(`\nError: ${err}.\n`);
   });
}