import app from "./app.js";
import config from "./config/config.js";

import database from "./services/databaseService.js";

database.connect().then(r => console.log("Connected to database", r));

app.listen(config.port, () => {
	console.log(`Server running on port ${config.port}`);
});
