import { dbConfig } from '../config/config.js';
//dbConfig from the .env file

import {Pool, type QueryResult} from "pg";

import type {StrNum} from "../models/strnum.js";
import {parseQuery} from "./databaseService.js";

const pool = new Pool({
    user: dbConfig.username,
    host: dbConfig.host,
    database: dbConfig.database,
    password: dbConfig.password,
    port: dbConfig.port,
    idleTimeoutMillis: 30000,
});

let connected:boolean = false;

export async function connect(): Promise<boolean> {
    try {
        if (connected) return true;

        if (!pool) return false;

        try {
            const query = await pool.query('SELECT NOW()');
            connected = (query.rows.length > 0);
        } catch (_err) { connected = false; }


        return connected;
    } catch (_err) {return false}
}

export async function query(query: string, params: StrNum[] = []): Promise<QueryResult> {
    return await pool.query(query, params);
}


async function addLog(query: string, executioner: number): Promise<number | null> {
    if (!(await connect()) || !pool || !query || !executioner) return null;
    if (executioner < 0) return null

    const { action, table: tableName, where: whereClause } = parseQuery(query);


    await pool.query("INSERT INTO log (query, executioner, table_name, where_clause, action) VALUES (?, ?, ?, ?);", [ query, executioner, tableName, whereClause, action])
        .then(r => {
            return r.rows[0].id;
        });

    return null;
}

export default { connect, query };