const express = require("express");
const app = express();

// Routes
require("./routes")(app);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`server api running on port ${port}`));