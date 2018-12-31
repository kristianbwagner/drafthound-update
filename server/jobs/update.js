const config = require('../../server/config/config.json');
console.log('\nStarting update with config:');
console.log(`> Holdet url: ${config.holdetUrl}`);
console.log(`> Sportmonks start fixture: ${config.roundStart}`);
console.log(`> Sportmonks end fixture: ${config.roundStop}`);
console.log(`> Sportmonks season: ${config.sportMonksSeasonId}`);

// Update fixtures
const fixtures = require('./fixtures/fixtures');
const players = require('./players/players');
const statistics = require('./statistics/statistics');
const commentaries = require('./commentaries/commentaries');
const mergeCommentaries = require('./commentaries/merge');
const mergeStatistics = require('./statistics/merge');

console.log('\n(1/6) Fixtures');
fixtures().then(() => {
   console.log('\n(2/6) Players');
   return players();
}).then(() => {
   console.log('\n(3/6) Statistics');
   return statistics();
}).then(() => {
   console.log('\n(4/6) Commentaries');
   return commentaries();
}).then(() => {
   console.log('\n(5/6) Merge commentaries');
   return mergeCommentaries();
}).then(() => {
   console.log('\n(6/6) Merge statistics');
   return mergeStatistics();
}).then(() => {
   console.log('\nSuccessfully updated. Closing connection...')
}).catch(err => {
   console.log(`\nError: ${err}.`);
});