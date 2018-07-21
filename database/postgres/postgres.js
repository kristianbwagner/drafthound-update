var pg = require("pg");

class Postgres {
	// Constructor
	constructor(config) {
		this.config = config;
	}

	// Methods
	query(query) {
		const client = new pg.Client(this.config);
		client.connect();
		return new Promise((resolve, reject) => {
			client.query(query).then(res => {
				client.end(() => {
					resolve(res);
				});
			}).catch(err => {
				client.end(() => {
					reject(err);
				});
			});
		});
	}

	queryAll(queries) {
		const client = new pg.Client(this.config);
		client.connect();
		return new Promise((resolve, reject) => {
			//console.log("starting...");
			client.query("BEGIN").then(() => {
				let promiseAllCount = 0;
				const totalCount = queries.length;
				return Promise.all(queries.map(query => {
					return client.query(query).then((res) => {
						promiseAllCount ++;
						//console.log(promiseAllCount + "/" + totalCount + " promises");
						return res;
					}).catch((err) => {
						console.log(err);
						reject("error at promise " + promiseAllCount);
					});
				}));
			}).then((res) => {
				client.query("COMMIT", client.end.bind(client, () => {
					resolve(res);
				}));
			}).catch(err => {
				client.query("ROLLBACK", () => {
					client.end();
					reject(err);
				});
			});
		});
	}

	table(tableName, _config = {}) {
		return {

			columns: (columns) => {
				_config = _config || {};
				_config.columns = columns;
				return this.table(tableName, _config);
			},

			where: (where) => {
				_config = _config || {};
				_config.where = where;
				return this.table(tableName, _config);
			},

			in: (tableId) => {
				_config = _config || {};
				_config.tableId = tableId;
				return this.table(tableName, _config);
			},

			tableId: (tableId) => {
				_config = _config || {};
				_config.tableId = tableId;
				return this.table(tableName, _config);
			},

			find: (where) => {
				_config = _config || {};
				_config.find = where;
				return this.table(tableName, _config);
			},

			select: () => {
				const config = {
					table: tableName,
					columns: _config.columns || [],
					where: _config.where
				};
				const whereStatement = config.where !== undefined ? " WHERE " + config.where  : "";
				const selectStatement = config.columns.length > 0 ? config.columns.join(", ") : "*";
				const queryString = "SELECT " + selectStatement + " FROM " + config.table + whereStatement;
				return queryString;
			},

			update: (updateValues) => {
				const config = {
					table: tableName ,
					tableId: _config.tableId || "id",
					id: _config.find,
					values: updateValues
				};
				let queryString = "INSERT INTO " + config.table + " ";

				// If index isn't in values, see if you can append
				if (config.id === undefined) {
					const headers = Object.keys(config.values);
					const headersList = headers.join(", ");
					const valuesList = headers.map(header => {
						const value = header === config.tableId ? config.id : config.values[header];
						return (typeof value) === "string" ? "'" + value.replace(/'/g,"''") + "'" : value;
					}).join(", ");
					queryString += "(" + headersList + ") VALUES (" + valuesList + ")";

				// Update all existing values with object
				} else if (config.values.length === undefined && typeof config.values === "object") {
					const headers = [config.tableId].concat(Object.keys(config.values));
					const headersList = headers.join(", ");
					const valuesList = headers.map(header => {
						const value = header === config.tableId ? config.id : config.values[header];
						return (typeof value) === "string" ? "'" + value.replace(/'/g,"''") + "'" : value;
					}).join(", ");
					const conflictUpdates = headers.map(header => {
						return header + " = EXCLUDED." + header;
					}).join(", ");
					queryString += "(" + headersList + ") VALUES (" + valuesList + ") ON CONFLICT (" + config.tableId + ") DO UPDATE SET " + conflictUpdates;

				// Update all existing values with array
				} else {
					const valuesList = [config.index].concat(config.values).map(value => {
						value = value.replace(/'/g,"\\'");
						return (typeof value) === "string" ? "'" + value.replace(/'/g,"''") + "'" : value;
					}).join(", ");
					queryString += "VALUES (" + valuesList + ")";
				}
				return queryString;
			},

			delete: () => {
				const config = {
					table: tableName,
					tableId: _config.tableId || "id",
					id: _config.find,
					where: _config.where
				};
				let queryString;
				if (config.where !== undefined) {
					queryString = "DELETE FROM " + config.table + " WHERE " + config.where;
				} else {
					queryString = "DELETE FROM " + config.table + " WHERE " + config.tableId + " = " + config.id;
				}
				return queryString;
			}

		};
	}
}

module.exports = Postgres;
