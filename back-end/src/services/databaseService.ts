import { dbConfig } from "../config/config.js";
import { AppError } from "../middlewares/errorHandler.js";
import type { StrNum } from "../models/strnum.js";
import mysql from "./mysqlService.js";
import postgres from "./postgresService.js";

export async function connect(): Promise<boolean> {
	switch (dbConfig.type) {
		case "mysql": {
			return await mysql.connect();
		}
		case "postgres": {
			return await postgres.connect();
		}
		default:
			throw new AppError("Unknown database connection", 500);
	}
}

export async function query(
	query: string,
	params: StrNum[] = [],
	executioner: number,
	// biome-ignore lint/suspicious/noExplicitAny: <Result from SQL can return any>
): Promise<{ rows: any[] }> {
	switch (dbConfig.type) {
		case "mysql": {
			if (!(await mysql.connect())) {
				throw new AppError("Database connection error", 500);
			}
			const result = await mysql.query(query, params, executioner);
			if (result === null) {
				return { rows: [] };
			} else return result;
		}
		case "postgres": {
			if (!(await postgres.connect())) {
				throw new AppError("Database connection error", 500);
			}
			return await postgres.query(query, params, executioner);
		}
		default:
			throw new AppError("Unknown database connection", 500);
	}
}

export async function queryWithoutExecutioner(
	query: string,
	params: StrNum[] = [],
	// biome-ignore lint/suspicious/noExplicitAny: <Result from SQL can return any>
): Promise<{ rows: any[] }> {
	switch (dbConfig.type) {
		case "mysql": {
			if (!(await mysql.connect())) {
				throw new AppError("Database connection error", 500);
			}
			const result = await mysql.query(query, params, null);
			if (result === null) {
				return { rows: [] };
			} else return result;
		}
		case "postgres": {
			if (!(await postgres.connect())) {
				throw new AppError("Database connection error", 500);
			}
			return await postgres.query(query, params, null);
		}
		default:
			throw new AppError("Unknown database connection", 500);
	}
}

export async function close(): Promise<void> {
	switch (dbConfig.type) {
		case "mysql":
			return mysql.close();
		case "postgres":
			return postgres.close();
	}
}

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
	params: StrNum[] = [],
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

	const normalized = sql.replace(/\s+/g, " ").trim();

	const actionMatch = normalized.match(/^\s*([A-Za-z]+)/);
	const action = actionMatch?.[1]?.toUpperCase() ?? null;

	const extractTable = (raw?: string): string | null => {
		if (!raw) return null;
		const cleaned = raw.replace(/[`"' ]/g, "");
		const parts = cleaned.split(".");
		return parts[parts.length - 1] ?? cleaned;
	};

	let table: string | null = null;

	const insertMatch = normalized.match(/INSERT\s+INTO\s+([`"'A-Za-z0-9_.]+)/i);
	if (insertMatch?.[1]) table = extractTable(insertMatch[1]);

	const updateMatch = normalized.match(/UPDATE\s+([`"'A-Za-z0-9_.]+)/i);
	if (!table && updateMatch?.[1]) table = extractTable(updateMatch[1]);

	const deleteMatch = normalized.match(/DELETE\s+FROM\s+([`"'A-Za-z0-9_.]+)/i);
	if (!table && deleteMatch?.[1]) table = extractTable(deleteMatch[1]);

	const selectMatch = normalized.match(/\bFROM\s+([`"'A-Za-z0-9_.]+)/i);
	if (!table && selectMatch?.[1]) table = extractTable(selectMatch[1]);

	const whereMatch = normalized.match(
		/\bWHERE\b\s+(.+?)(?=(\bORDER\b|\bLIMIT\b|;|$))/i,
	);
	const where = whereMatch?.[1]?.trim() ?? null;

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

export default { connect, query };
