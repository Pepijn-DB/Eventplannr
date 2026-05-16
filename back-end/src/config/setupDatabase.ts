import * as fs from "node:fs";
import { AppError } from "../middlewares/errorHandler.js";
import {
	connect,
	queryWithoutExecutioner,
} from "../services/databaseService.js";
import { dbConfig } from "./config.js";
import { getDb } from "../services/databaseService.js";

const db = getDb();

function isValidDatabaseName(name: unknown): name is string {
	if (typeof name !== "string") return false;
	return /^[A-Za-z0-9_]{1,63}$/.test(name);
}

function quoteIdentifier(name: string, type: string): string {
	if (type === "postgres") {
		return `"${name.replace(/"/g, '""')}"`;
	}
	return `\`${name.replace(/`/g, "``")}\``;
}

export async function setupDatabase(): Promise<boolean | null> {
	try {
		const connected = await connect();
		if (!connected) return false;
		if (!isValidDatabaseName(dbConfig.database)) {
			throw new AppError("Invalid database name in configuration", 500);
		}

		if (dbConfig.type === "postgres") {
			return await setupPostgres();
		} else if (dbConfig.type === "mysql") {
			return await setupMySQL();
		}
	} catch (err) {
		if (err instanceof Error) {
			throw new AppError(`Error setting up database: ${err.message}`, 500);
		} else {
			throw new AppError("Error setting up database", 500);
		}
	}
	throw new AppError("Unsupported database type", 500);
}

async function setupPostgres(): Promise<boolean | null> {
	const [result] = await db`SELECT 1 FROM pg_database WHERE datname = ${dbConfig.database}`;
	if (result.length !== 0) {
		return null;
	}

	await db`CREATE DATABASE ${dbConfig.database}`;
	await db`SELECT ${dbConfig.database}`;

	return await setupSql("./src/config/default_postgres_database.sql");
}

async function setupMySQL(): Promise<boolean | null> {
	const [result] = await db`SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`;
	if (result.length !== 0) {
		return null;
	}

	return await setupSql("./src/config/default_sql_database.sql");
}

async function setupSql(filePath: string): Promise<boolean> {
	const quoted = quoteIdentifier(dbConfig.database, dbConfig.type);
	await queryWithoutExecutioner(`CREATE DATABASE ${quoted}`);
	try {
		db.file(filePath);
	} catch (err) {
		console.error("Error reading schema.sql:", err);
		return false;
	}
	return true;
}

export { setupSql };
