import * as fs from "node:fs";
import * as db from "../services/databaseService.js";
import { queryWithoutExecutioner } from "../services/databaseService.js";
import { dbConfig } from "./config.js";

export async function setupDatabase(): Promise<boolean | null> {
	try {
		const connected = await db.connect();
		if (!connected) return false;

		if (dbConfig.type === "postgres") {
			return await setupPostgres();
		} else if (dbConfig.type === "mysql") {
			return await setupMySQL();
		}
	} catch (_err) {
		return false;
	}
	throw new Error("Unsupported database type");
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
