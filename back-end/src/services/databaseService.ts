import { SQL } from "bun";
import { dbConfig } from "../config/config.js";
import { AppError } from "../middlewares/errorHandler.js";
import type { StrNum } from "../models/strnum.js";

let connected: boolean = false;

let db: SQL;

function buildDatabaseDsn(protocol: "mysql" | "postgres"): string {
	const username = encodeURIComponent(dbConfig.username);
	const password = encodeURIComponent(dbConfig.password);
	return `${protocol}://${username}:${password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;
}

switch (dbConfig.type) {
	case "mysql": {
		db = new SQL(buildDatabaseDsn("mysql"));
		break;
	}
	case "postgres": {
		db = new SQL(buildDatabaseDsn("postgres"));
		break;
	}
	default: {
		throw new AppError("Unknown database connection", 500);
	}
}

export async function connect(): Promise<boolean> {
	try {
		if (connected) return true;

		if (!db) return false;

		await db.connect();

		const query = await db`SELECT NOW() `;
		connected = query.length > 0;
	} catch (_err) {
		connected = false;
	}
	return connected;
}

export async function query(
	query: string,
	params: StrNum[] = [],
	executioner: number,
	// biome-ignore lint/suspicious/noExplicitAny: <Result from SQL can return any>
): Promise<{ rows: any[] }> {
	try {
		const prepared = prepareQueryAndParams(query, params);
		const converted = convertQuestionMarksToDollarParams(prepared.sql);

		const result = await db.unsafe(converted.sql, prepared.params);

		const logNumber: number | null = await addLog(prepared.sql, executioner);

		// biome-ignore lint/suspicious/noExplicitAny: <Result from SQL can return any>
		const resultRows = Array.isArray(result) ? (result as any[]) : [];
		const ids = resultRows
			.map((r) => r?.id)
			// biome-ignore lint/suspicious/noExplicitAny: <Result from SQL can return any>
			.filter((v: any) => v !== undefined && v !== null);
		if (ids.length > 0 && logNumber !== null) {
			const placeholders = ids.map((_, i) => `$${i + 2}`).join(",");
			const tableName = parseQuery(query).table || "table";
			await db`UPDATE ${tableName} SET updated_log = {$logNumber} WHERE id IN (${placeholders});`;
		}

		return { rows: resultRows };
	} catch (err) {
		let message = "Database query error";
		if (err instanceof Error) message = err.message;
		throw new AppError(message, 500);
	}
}

async function addLog(
	query: string,
	executioner: number | null,
): Promise<number | null> {
	try {
		if (!(await connect()) || !db || !query) return null;
		if (executioner !== null && executioner < 0) return null;

		const { action, table: tableName, where: whereClause } = parseQuery(query);
		if (!action || !tableName) return null;
		if (action === "SELECT") return null;

		const res = await db`INSERT INTO log (query, executioner, table_name, where_clause, action) VALUES (${query}, ${executioner}, ${tableName}, ${whereClause}, ${action}) RETURNING id;`;
		return res[0]?.id ?? null;
	} catch (_err) {
		return null;
	}
}

export async function queryWithoutExecutioner(
	query: string,
	params: StrNum[] = [],
	// biome-ignore lint/suspicious/noExplicitAny: <Result from SQL can return any>
): Promise<{ rows: any[] }> {
	try {
		const prepared = prepareQueryAndParams(query, params);
		const converted = convertQuestionMarksToDollarParams(prepared.sql);

		const result = await db.unsafe(converted.sql, prepared.params);

		const logNumber: number | null = await addLog(prepared.sql, null);

		// biome-ignore lint/suspicious/noExplicitAny: <Result from SQL can return any>
		const resultRows = Array.isArray(result) ? (result as any[]) : [];
		const ids = resultRows
			.map((r) => r?.id)
			// biome-ignore lint/suspicious/noExplicitAny: <Result from SQL can return any>
			.filter((v: any) => v !== undefined && v !== null);
		if (ids.length > 0 && logNumber !== null) {
			const placeholders = ids.map((_, i) => `$${i + 2}`).join(",");
			const tableName = parseQuery(query).table || "table";
			const updateSql = `UPDATE ${tableName} SET updated_log = $1 WHERE id IN (${placeholders});`;
			await db.unsafe(updateSql, [logNumber, ...ids]);
		}

		return { rows: resultRows };
	} catch (err) {
		let message = "Database query error";
		if (err instanceof Error) message = err.message;
		throw new AppError(message, 500);
	}
}

export async function close(): Promise<void> {
	db.close();
	connected = false;
}

type Param = StrNum | StrNum[];

/**
 * Prepares a SQL query and its corresponding parameters by resolving placeholders (`?`) in the query string
 * using the provided parameter list. Supports handling arrays in the parameters to dynamically generate
 * placeholders for queries like `IN` clauses.
 *
 * @param sql The SQL query string containing placeholders (`?`) for parameter substitution.
 * @param params An optional array of parameters for substitution. Each parameter can be a string, number,
 *               or an array of values. If an array is provided, it will be expanded into multiple placeholders.
 *               Defaults to an empty array.
 * @return An object containing the prepared SQL query string with substitutions and the corresponding
 *         flattened parameter array ready for execution.
 */
export function prepareQueryAndParams(
	sql: string,
	params: Param[] = [],
	// biome-ignore lint/suspicious/noExplicitAny: <Result from SQL can return any>
): { sql: string; params: any[] } {
	if (!params || params.length === 0) return { sql, params: [] };

	const parts = sql.split("?");
	if (parts.length - 1 !== params.length) {
		return { sql, params };
	}

	const newParts: string[] = [];
	const newParams: StrNum[] = [];

	for (let i = 0; i < params.length; i++) {
		const part = parts[i] ?? "";
		newParts.push(part);

		const p = params[i];
		if (Array.isArray(p)) {
			if (p.length === 0) {
				newParts.push("(NULL)");
			} else {
				const placeholders = p.map(() => "?").join(",");
				newParts.push(`(${placeholders})`);
				for (const v of p) newParams.push(v);
			}
		} else {
			newParts.push("?");
			newParams.push(p as StrNum);
		}
	}

	newParts.push(parts[parts.length - 1] ?? "");

	return { sql: newParts.join(""), params: newParams };
}

/**
 * Parses an SQL query string to extract the action type, table name, and where clause.
 *
 * @param {string} sql - The SQL query string to be parsed.
 * @return {{action: string | null, table: string | null, where: string | null}} An object containing the parsed action type, table name, and where clause.
 */
export function parseQuery(sql: string): {
	action: string | null;
	table: string | null;
	where: string | null;
} {
	if (!sql) return { action: null, table: null, where: null };

	const lower = sql.toLowerCase().trimStart();
	let action: string | null = null;
	let table: string | null = null;
	let where: string | null = null;

	if (lower.startsWith("select")) {
		action = "SELECT";
	} else if (lower.startsWith("insert")) {
		action = "INSERT";
	} else if (lower.startsWith("update")) {
		action = "UPDATE";
	} else if (lower.startsWith("delete")) {
		action = "DELETE";
	} else {
		return { action: null, table: null, where: null };
	}

	const wherePos = sql.search(/\bwhere\b/i);
	if (wherePos !== -1 && wherePos < sql.length) {
		where = sql.substring(wherePos).trim();
	}

	// Helper to clean a raw table token
	const cleanTableToken = (token: string | undefined) => {
		if (!token) return null;
		return token.replace(/[;,()]$/g, "").trim();
	};

	if (action === "SELECT" || action === "DELETE") {
		const fromMatch = sql.match(/\bfrom\s+([^\s;(),]+)/i);
		if (fromMatch?.[1]) table = cleanTableToken(fromMatch[1]);
	} else if (action === "INSERT") {
		const intoMatch = sql.match(/\binsert\s+into\s+([^\s(;,]+)/i);
		if (intoMatch?.[1]) table = cleanTableToken(intoMatch[1]);
	} else if (action === "UPDATE") {
		const updMatch = sql.match(/\bupdate\s+([^\s;(),]+)/i);
		if (updMatch?.[1]) table = cleanTableToken(updMatch[1]);
	}

	return { action, table, where };
}

/**
 * Converts question mark placeholders in a SQL string to dollar sign placeholders
 * with indices (e.g., $1, $2, etc.), suitable for parameterized queries.
 *
 * @param {string} sql - The SQL string containing question mark placeholders.
 * @return {{ sql: string, paramCount: number }} An object containing the modified SQL string with
 * dollar sign placeholders and the count of placeholders replaced.
 */
export function convertQuestionMarksToDollarParams(sql: string): {
	sql: string;
	paramCount: number;
} {
	let idx = 0;
	let out = "";
	for (let i = 0; i < sql.length; i++) {
		const ch = sql[i];
		if (ch === "?") {
			idx++;
			out += `$${idx}`;
		} else {
			out += ch;
		}
	}
	return { sql: out, paramCount: idx };
}

export function getDb() {
	return db;
}

export default { getDb, connect, query, queryWithoutExecutioner, parseQuery };
