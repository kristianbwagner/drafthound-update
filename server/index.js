const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(cors());


// Routes
require("./routes")(app);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`server api running on port ${port}`));
