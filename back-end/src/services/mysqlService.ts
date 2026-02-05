import {dbConfig} from "../config/config.js";
import type {QueryError, ResultSetHeader} from "mysql2";
import mysql from 'mysql2';

import type {StrNum} from "../models/strnum.js";
import {AppError} from "../middlewares/errorHandler.js";

import {parseQuery} from "./databaseService.js";

const db = mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
});

let dbConnected:boolean = false

db.on('error', (err: QueryError | null) => {
    dbConnected = false;
});

export function connect(): boolean {
    if (dbConnected) return true;
    if (!db) return false;

    try {
        if (db.state === 'disconnected') {
            db.connect((err: QueryError | null) => {
                if (err) {
                    dbConnected = false;
                    return;
                }
                dbConnected = true;
            });
        } else {
            dbConnected = (db.state === 'connected');
        }

        db.ping((err: QueryError | null) => {
            dbConnected = !err;
        });
    } catch (_err) {
        dbConnected = false;
    }

    return dbConnected;
}

export function query(query: string, params: StrNum[] = [], executioner: number): ResultSetHeader | null {
    try {
        db.execute(query, params, (err, result: ResultSetHeader) => {
            if (err) throw new AppError(err.message);

            const id:number = result.insertId

            const queryWithParams = query.replace(/\?/g, () => `'${params.shift()}'`);

            const log = addLog(queryWithParams, executioner);
            if (!log && log !== null && log > 0) db.execute("UPDATE table SET updated_log = ? WHERE id = ?;", [log, id]);

            return result;
        });
        return null;
    } catch (_err) {
        return null;
    }
}

function addLog(query: string, executioner: number): number | null {
    if (!connect() || !db || !query || !executioner) return null;
    if (executioner < 0) return null

    const { action, table: tableName, where: whereClause } = parseQuery(query);


    db.execute("INSERT INTO log (query, executioner, table_name, where_clause, action) VALUES (?, ?, ?, ?);", [query, executioner, tableName, whereClause, action], (err, result: ResultSetHeader) => {
        if (err) return null;
        return result.insertId;
    });

    return null;
}

export default { connect, query };