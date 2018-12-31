const pgp = require('pg-promise')({capSQL: true});
const database = pgp({connectionString: "postgres://gomhcbepfwkkeq:c12e3f58fd938bbbb0825806f1ac90a08cf415de754b2da8d1c4866cf2981faf@ec2-54-217-205-90.eu-west-1.compute.amazonaws.com:5432/dagkemjclktp71", ssl: true});

module.exports = {
   database,
   helpers: pgp.helpers,
   insertData: (data, cs) =>  {
      return new Promise((resolve, reject) => {
         const conflictQuery = " ON CONFLICT (id) DO UPDATE SET " + cs.columns.map(x => {
            return `${x.name} = EXCLUDED.${x.name}`;
         }).join(', ');
         const insert = pgp.helpers.insert(data, cs) + conflictQuery;
         database.none(insert).then(() => {
            resolve();
         }).catch(err => {
            reject(err);
         });
      });
   }
};