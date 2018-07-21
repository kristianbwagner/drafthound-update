const express = require("express");
const app = express();

// Routes
require("./routes")(app);

const port = process.env.port || 3000;
app.listen(3000, () => console.log(`server api running on port ${port}`));
