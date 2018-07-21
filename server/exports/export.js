const fs = require("fs");
const Postgres = require("../../database/postgres/postgres.js");
const Database = new Postgres({
	connectionString: "postgres://arryqiptdswjdh:ba3dc52dcf2380392e9ef18a1bc86820d8523a30d6e759c5d63ea68768bbd8b2@ec2-79-125-117-53.eu-west-1.compute.amazonaws.com:5432/dv5o41fic7um5",
	ssl: true
});

const tableName = "statistics";

// queries for statistics
const queries = [
	"SELECT * FROM " + tableName
];

Database.queryAll(queries).then(data => {

	// fixtures
	const rows = data[0].rows || [];
	const firstRow = rows[0];
	const headers = Object.keys(firstRow);
	const outputArray = [];
	outputArray.push(headers);
	rows.forEach(row => {
		const rowArray = headers.map(h => row[h]);
		outputArray.push(rowArray);
	});

	// Create csv output
	const csv = outputArray.map(row => {
		return row.map(cell => {
			return cell;
		}).join(";");
	}).join("\n");

	fs.writeFile("server/exports/" + tableName + ".csv", csv, (err) => {
		if (err) {return console.log(err);}
		console.log("The file was saved!");
	});

}).catch(err => console.log(err));
