import app from "./app.js";
import config from "./config/config.js";

import database from "./services/databaseService.js";

database.connect();

app.listen(config.port, () => {
	console.log(`Server running on port ${config.port}`);
});
