import * as fs from "node:fs";
import { AppError } from "../middlewares/errorHandler.js";
import {
	connect,
	queryWithoutExecutioner,
} from "../services/databaseService.js";
import { dbConfig } from "./config.js";

export async function setupDatabase(): Promise<boolean | null> {
	try {
		const connected = await connect();
		if (!connected) return false;

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
	const sql = `SELECT 1 FROM pg_database WHERE datname = '${dbConfig.database}'`;
	const result = await queryWithoutExecutioner(sql);
	if (result.rows.length !== 0) {
		return null;
	}
	setupSql("./src/config/default_postgres_database.sql");

	return true;
}

async function setupMySQL(): Promise<boolean | null> {
	const sql = `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '${dbConfig.database}'`;
	const result = await queryWithoutExecutioner(sql);
	if (result.rows.length !== 0) {
		return null;
	}
	setupSql("./src/config/default_sql_database.sql");
	return true;
}

async function setupSql(filePath: string): Promise<void> {
	await queryWithoutExecutioner(`CREATE DATABASE ${dbConfig.database}`);
	fs.readFile(filePath, "utf-8", async (err, data) => {
		if (err) {
			console.error("Error reading schema.sql:", err);
			return false;
		}
		const queries = data
			.split(";")
			.map((q) => q.trim())
			.filter((q) => q.length > 0);
		for (const query of queries) {
			try {
				await queryWithoutExecutioner(query);
			} catch (err) {
				console.error("Error executing query:", query, err);
				return false;
			}
		}
	});
}
