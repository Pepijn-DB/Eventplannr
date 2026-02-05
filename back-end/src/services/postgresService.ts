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

export async function query(query: string, params: StrNum[] = [], executioner: number | null): Promise<QueryResult> {
    const result:QueryResult = await pool.query(query, params);

    const logNumber:number | null = await addLog(query, executioner);

    await pool.query("UPDATE table SET updated_log = ? WHERE id IN ?;", [logNumber, result.rows.map(row => row.id)]);

    return result;
}


async function addLog(query: string, executioner: number | null): Promise<number | null> {
    if (!(await connect()) || !pool || !query) return null;
    if (executioner !== null && executioner < 0) return null

    const { action, table: tableName, where: whereClause } = parseQuery(query);


    await pool.query("INSERT INTO log (query, executioner, table_name, where_clause, action) VALUES (?, ?, ?, ?);", [ query, executioner, tableName, whereClause, action])
        .then(r => {
            return r.rows[0].id;
        });

    return null;
}

export default { connect, query };