import { dbConfig } from '../config/config.js';
import { Pool } from "pg";

const pool = new Pool({
    user: dbConfig.username,
    host: dbConfig.host,
    database: dbConfig.database,
    password: dbConfig.password,
    port: dbConfig.port,
    idleTimeoutMillis: 30000,
});

let connected:boolean = false;

export function connect():boolean {
    try {
        if (connected) return true;

        if (!pool) return false;

        pool.query('SELECT NOW()')
            .then(r => r.rows.length > 0 ? connected = true : connected = false)
            .catch(() => connected = false);


        return connected;
    } catch (ignored) {return false}
}

export async function query(query: string, params: any[] = []): Promise<QueryResultRow> {
    return await pool.query(query, params);
}

export default { connect, query };