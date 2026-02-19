import mysql from "mysql2/promise";
import { dbConfig } from "../config/config.js";
import { AppError } from "../middlewares/errorHandler.js";
import type { StrNum } from "../models/strnum.js";
import {
	parseQuery,
	prepareQueryAndParams,
	queryWithoutExecutioner,
} from "./databaseService.js";

const pool = mysql.createPool({
	host: dbConfig.host,
	port: dbConfig.port,
	user: dbConfig.username,
	password: dbConfig.password,
	database: dbConfig.database,
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
});

let connected: boolean = false;

export async function connect(): Promise<boolean> {
	if (connected) return true;
	if (!pool) return false;

	try {
		try {
			pool.connect();

			const query = await queryWithoutExecutioner("SELECT NOW()");
			connected = query.rows.length > 0;
		} catch (_err) {
			connected = false;
		}

		return connected;
	} catch (_err) {
		connected = false;
		return false;
	}
}

// biome-ignore lint/suspicious/noExplicitAny: <Result from SQL can return any>
function safeForLog(val: any): string {
	if (val === null || val === undefined) return "NULL";
	if (typeof val === "number" || typeof val === "boolean") return String(val);
	if (val instanceof Date) return `'${val.toISOString()}'`;
	let s = String(val);
	if (/password/i.test(s) || /pwd/i.test(s)) return "'****'";
	s = s.replace(/'/g, "\\'");
	if (s.length > 200) s = `${s.slice(0, 200)}...<truncated>`;
	return `'${s}'`;
}

function buildQueryForLog(sql: string, params: StrNum[] = []): string {
	if (!params || params.length === 0) return sql;

	const parts: string[] = sql.split("?");
	const out: string[] = [];
	for (let i = 0; i < parts.length - 1; i++) {
		out.push(parts[i] ?? "");
		const p: StrNum | undefined = params[i];
		if (Array.isArray(p)) {
			if (p.length === 0) out.push("(NULL)");
			else out.push(`(${p.map((v) => safeForLog(v)).join(", ")})`);
		} else {
			out.push(safeForLog(p));
		}
	}
	out.push(parts[parts.length - 1] ?? "");
	return out.join("");
}

export async function query(
	query: string,
	params: StrNum[] = [],
	executioner: number | null,
	// biome-ignore lint/suspicious/noExplicitAny: <Result from SQL can return any>
): Promise<{ rows: any[] } | null> {
	try {
		if (!(await connect())) return null;

		const prepared = prepareQueryAndParams(query, params);

		// biome-ignore lint/suspicious/noExplicitAny: <Result from SQL can return any>
		const [rows] = await pool.execute(prepared.sql, prepared.params as any[]);

		const queryForLog = buildQueryForLog(query, params);

		const logNumber = await addLog(queryForLog, executioner);

		try {
			// biome-ignore lint/suspicious/noExplicitAny: <Result from SQL can return any>
			const resultRows = Array.isArray(rows) ? (rows as any[]) : [];
			const ids = resultRows
				.map((r) => r?.id)
				// biome-ignore lint/suspicious/noExplicitAny: <Result from SQL can return any>
				.filter((v: any) => v !== undefined && v !== null);
			if (ids.length > 0 && logNumber !== null) {
				const placeholders = ids.map(() => "?").join(",");
				const tableName = parseQuery(query).table || "table";
				await pool.execute(
					`UPDATE ${tableName} SET updated_log = ? WHERE id IN (${placeholders});`,
					[logNumber, ...ids],
				);
			}
		} catch (_err) {}

		// biome-ignore lint/suspicious/noExplicitAny: <Result from SQL can return any>
		return { rows: Array.isArray(rows) ? (rows as any[]) : [] };
		// biome-ignore lint/suspicious/noExplicitAny: <Catch clause must be any or undefined (TS)>
	} catch (err: any) {
		throw new AppError(err?.message || "Database query error", 500);
	}
}

async function addLog(
	queryForLog: string,
	executioner: number | null,
): Promise<number | null> {
	if (!(await connect()) || !pool || !queryForLog) return null;
	if (executioner !== null && executioner < 0) return null;

	const {
		action,
		table: tableName,
		where: whereClause,
	} = parseQuery(queryForLog);

	if (!action || !tableName) return null;
	if (action === "SELECT") return null;

	try {
		const [res] = await pool.execute(
			"INSERT INTO log (query, executioner, table_name, where_clause, action) VALUES (?, ?, ?, ?, ?);",
			[queryForLog, executioner, tableName, whereClause, action],
		);
		// biome-ignore lint/suspicious/noExplicitAny: <Result from SQL can return any>
		const insertId = (res as any)?.insertId;
		return insertId ?? null;
	} catch (_err) {
		return null;
	}
}

export function close(): void {
	try {
		pool.end();
		connected = false;
	} catch (_err) {}
}

export default { connect, query, close };
