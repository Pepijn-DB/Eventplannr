import app from "./app.js";
import config from "./config/config.js";

import database from "./services/databaseService.js";

database.connect().then((r) => console.log("Connected to database", r));

if (config.secret === "SECRET STRING SHOULD BE SET IN ENV") {
	console.error("Secret not set in env");
	process.exit(1);
}

app.listen(config.port, () => {
	console.log(`Server running on port ${config.port}`);
});
