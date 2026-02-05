import { dbConfig } from '../config/config.js';
import postgres from './postgresService.js';
import mysql from './mysqlService.js';

import type {QueryResult} from "pg";
import type {Query} from "mysql2";

import type {MaybePromise} from "../models/maybepromise.js";
import type {StrNum} from "../models/strnum.js";

export function connect():MaybePromise<boolean> {
    switch (dbConfig.type) {
        case 'mysql': {
            return mysql.connect();
        }
        case 'postgres': {
            return postgres.connect();
        }
        default: return false;
    }
}

export  function query(query: string, params: StrNum[] = []):MaybePromise<QueryResult> | Query | null {
    switch (dbConfig.type) {
        case 'mysql': {
            if (!mysql.connect()) {return null;}
            return mysql.query(query, params);
        }
        case 'postgres': {
            if (!postgres.connect()) {return null;}
            return postgres.query(query, params);
        }
    }
    return null;
}

/**
 * Parses a SQL query string to extract its main action, target table, and WHERE clause.
 *
 * @param {string} sql - The SQL query string to parse.
 * @return {{ action: string | null, table: string | null, where: string | null }}
 *         An object containing the extracted `action` (e.g., SELECT, INSERT),
 *         the `table` being acted on, and the `where` clause of the query.
 */
export function parseQuery(sql: string): { action: string | null, table: string | null, where: string | null } {
    if (!sql) return { action: null, table: null, where: null };

    const normalized = sql.replace(/\s+/g, ' ').trim();

    const actionMatch = normalized.match(/^\s*([A-Za-z]+)/);
    const action = actionMatch?.[1]?.toUpperCase() ?? null;

    const extractTable = (raw?: string): string | null => {
        if (!raw) return null;
        const cleaned = raw.replace(/[`"' ]/g, '');
        const parts = cleaned.split('.');
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

    const whereMatch = normalized.match(/\bWHERE\b\s+(.+?)(?=(\bORDER\b|\bLIMIT\b|;|$))/i);
    const where = whereMatch?.[1]?.trim() ?? null;

    return { action, table, where };
}

export default { connect, query, parseQuery };