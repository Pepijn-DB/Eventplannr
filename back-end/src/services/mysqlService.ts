import { dbConfig } from '../config/config.js';
import mysql from 'mysql2/promise';

import type { StrNum } from "../models/strnum.js";
import { AppError } from "../middlewares/errorHandler.js";
import { parseQuery, prepareQueryAndParams } from "./databaseService.js";

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
            await pool.getConnection().then(async conn => {
                await conn.ping();
                conn.release();
                connected = true;
            });
        } catch (_err) {
            connected = false;
        }

        return connected;
    } catch (_err) {
        connected = false;
        return false;
    }
}

function safeForLog(val: any): string {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (val instanceof Date) return `'${val.toISOString()}'`;
    let s = String(val);
    if (/password/i.test(s) || /pwd/i.test(s)) return "'****'";
    s = s.replace(/'/g, "\\'");
    if (s.length > 200) s = `${s.slice(0, 200)}...<truncated>`;
    return `'${s}'`;
}

function buildQueryForLog(sql: string, params: StrNum[] = []): string {
    if (!params || params.length === 0) return sql;

    const parts: string[] = sql.split('?');
    const out: string[] = [];
    for (let i = 0; i < parts.length - 1; i++) {
        out.push(parts[i] ?? '');
        const p: StrNum | undefined = params[i];
        if (Array.isArray(p)) {
            if (p.length === 0) out.push('(NULL)');
            else out.push(`(${p.map(v => safeForLog(v)).join(', ')})`);
        } else {
            out.push(safeForLog(p));
        }
    }
    out.push(parts[parts.length - 1] ?? '');
    return out.join('');
}

export async function query(query: string, params: StrNum[] = [], executioner: number | null): Promise<{ rows: any[] } | null> {
    try {
        if (!(await connect())) return null;

        const prepared = prepareQueryAndParams(query, params);

        const [rows] = await pool.execute(prepared.sql, prepared.params as any[]);

        const queryForLog = buildQueryForLog(query, params);

        const logNumber = await addLog(queryForLog, executioner);

        try {
            const resultRows = Array.isArray(rows) ? rows as any[] : [];
            const ids = resultRows.map(r => r?.id).filter((v: any) => v !== undefined && v !== null);
            if (ids.length > 0 && logNumber !== null) {
                const placeholders = ids.map(() => '?').join(',');
                const tableName = parseQuery(query).table || 'table';
                await pool.execute(`UPDATE ${tableName} SET updated_log = ? WHERE id IN (${placeholders});`, [logNumber, ...ids]);
            }
        } catch (_err) {
        }

        return { rows: Array.isArray(rows) ? rows as any[] : [] };
    } catch (err: any) {
        throw new AppError(err?.message || 'Database query error', 500);
    }
}

async function addLog(queryForLog: string, executioner: number | null): Promise<number | null> {
    if (!(await connect()) || !pool || !queryForLog) return null;
    if (executioner !== null && executioner < 0) return null;

    const { action, table: tableName, where: whereClause } = parseQuery(queryForLog);

    try {
        const [res] = await pool.execute('INSERT INTO log (query, executioner, table_name, where_clause, action) VALUES (?, ?, ?, ?, ?);', [queryForLog, executioner, tableName, whereClause, action]);
        const insertId = (res as any)?.insertId;
        return insertId ?? null;
    } catch (_err) {
        return null;
    }
}

export async function close(): Promise<void> {
    try {
        await pool.end();
        connected = false;
    } catch (_err) {
    }
}

export default { connect, query, close };
