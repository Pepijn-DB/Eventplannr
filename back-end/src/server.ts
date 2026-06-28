import app from "./app.js";
import config from "./config/config.js";
import { setupDatabase } from "./config/setupDatabase.js";
import database from "./services/databaseService.js";
import logger from "./services/loggerService.js";

if (config.secret === "SECRET STRING SHOULD BE SET IN ENV") {
	logger.error("Secret not set in env");
	process.exit(1);
}

database
	.connect()
	.then((r) => logger.info("Connected to database", { result: String(r) }));

setupDatabase()
	.then((r) => {
		if (r === null) return;
		logger.info("Database setup complete", { result: String(r) });
	})
	.catch((err) => {
		logger.error(
			"Error setting up database — it might not be configured correctly",
			{
				message: err?.message,
				stack: err?.stack,
			},
		);
	});

app.listen(config.port, () => {
	logger.info(`Server running on port ${config.port}`);
});
