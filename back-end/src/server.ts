import app from "./app.js";
import config from "./config/config.js";
import { setupDatabase } from "./config/setupDatabase.js";
import database from "./services/databaseService.js";
import logger from "./services/loggerService.js";

if (config.secret === "SECRET STRING SHOULD BE SET IN ENV" || config.secret.length < 10) {
	logger.error("Secret not set in env");
	process.exit(1);
}

database
	.connect()
	.then((r) => {
		logger.info("Connected to database", { result: String(r) });
		return setupDatabase();
	})
	.then((r) => {
		if (r !== null && r !== undefined) {
			logger.info("Database setup complete", { result: String(r) });
		}
		app.listen(config.port, () => {
			logger.info(`Server running on port ${config.port}`);
		});
	})
	.catch((err) => {
		logger.error("Startup failed", {
			message: err?.message,
			stack: err?.stack,
		});
		process.exit(1);
	});
