import { dbConfig } from "../config/config.js";
//dbConfig from the .env file

import { Pool, type QueryResult } from "pg";

import type { StrNum } from "../models/strnum.js";
import {
	convertQuestionMarksToDollarParams,
	parseQuery,
	prepareQueryAndParams,
} from "./databaseService.js";

const pool = new Pool({
	user: dbConfig.username,
	host: dbConfig.host,
	database: dbConfig.database,
	password: dbConfig.password,
	port: dbConfig.port,
	idleTimeoutMillis: 30000,
});

let connected: boolean = false;

export async function connect(): Promise<boolean> {
	try {
		if (connected) return true;

		if (!pool) return false;

		try {
			const query = await pool.query("SELECT NOW()");
			connected = query.rows.length > 0;
		} catch (_err) {
			connected = false;
		}

		return connected;
	} catch (_err) {
		return false;
	}
}

export async function query(
	query: string,
	params: StrNum[] = [],
	executioner: number | null,
	// biome-ignore lint/suspicious/noExplicitAny: <Result from SQL can return any>
): Promise<{ rows: any[] }> {
	const prepared = prepareQueryAndParams(query, params);
	const converted = convertQuestionMarksToDollarParams(prepared.sql);

	const result: QueryResult = await pool.query(converted.sql, prepared.params);

	const logNumber: number | null = await addLog(prepared.sql, executioner);

	try {
		// biome-ignore lint/suspicious/noExplicitAny: <Result from SQL can return any>
		const resultRows = Array.isArray(result.rows) ? (result.rows as any[]) : [];
		const ids = resultRows
			.map((r) => r?.id)
			// biome-ignore lint/suspicious/noExplicitAny: <Result from SQL can return any>
			.filter((v: any) => v !== undefined && v !== null);
		if (ids.length > 0 && logNumber !== null) {
			const placeholders = ids.map((_, i) => `$${i + 2}`).join(",");
			const tableName = parseQuery(query).table || "table";
			const updateSql = `UPDATE ${tableName} SET updated_log = $1 WHERE id IN (${placeholders});`;
			await pool.query(updateSql, [logNumber, ...ids]);
		}
	} catch (_err) {}

	return { rows: result.rows };
}

async function addLog(
	query: string,
	executioner: number | null,
): Promise<number | null> {
	if (!(await connect()) || !pool || !query) return null;
	if (executioner !== null && executioner < 0) return null;

	const { action, table: tableName, where: whereClause } = parseQuery(query);
	if (!action || !tableName) return null;
	if (action === "SELECT") return null;

	try {
		const insertSql = `INSERT INTO log (query, executioner, table_name, where_clause, action) VALUES ($1, $2, $3, $4, $5) RETURNING id;`;
		const res = await pool.query(insertSql, [
			query,
			executioner,
			tableName,
			whereClause,
			action,
		]);
		return res.rows[0]?.id ?? null;
	} catch (_err) {
		return null;
	}
}

async function close(): Promise<void> {
	try {
		await pool.end();
		connected = false;
	} catch (_err) {}
}

export default { connect, query, close };
