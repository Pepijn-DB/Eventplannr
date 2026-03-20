import app from "./app.js";
import config from "./config/config.js";

import database from "./services/databaseService.js";

if (config.secret === "SECRET STRING SHOULD BE SET IN ENV") {
	console.error("\x1b[31m[ERROR] Secret not set in env\x1b[0m");
	process.exit(1);
}

database.connect().then((r) => console.log("Connected to database", r));

app.listen(config.port, () => {
	console.log(`Server running on port ${config.port}`);
});
