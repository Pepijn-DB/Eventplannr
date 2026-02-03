import { dbConfig } from '../config/config.js';
//dbConfig from the .env file

import {Pool, type QueryResultRow} from "pg";

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

export async function query(query: string, params: any[] = []): Promise<QueryResultRow> {
    return await pool.query(query, params);
}

export default { connect, query };