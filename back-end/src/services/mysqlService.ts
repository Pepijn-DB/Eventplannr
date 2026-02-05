import {dbConfig} from "../config/config.js";
import mysql from 'mysql2';
import type {Query, QueryError} from "mysql2";

import type {StrNum} from "../models/strnum.js";

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

export function query(query: string, params: StrNum[] = []): Query | null {
    try {
        return db.execute(query, params);
    } catch (_err) {
        return null;
    }
}

export default { connect, query };