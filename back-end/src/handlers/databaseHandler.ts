import { dbConfig } from '../config/config.js';
import postgres from './postgresHandler.js';
import mysql from './mysqlHandler.js';


export function connect():boolean {
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

export function query(query: string, params: any[] = []):any {
    switch (dbConfig.type) {
        case 'mysql': {
            if (!mysql.connect()) {return {error: "Database connection failed"};}
            return mysql.query(query, params);
        }
        case 'postgres': {
            if (!postgres.connect()) {return {error: "Database connection failed"};}
            return postgres.query(query, params);
        }
    }
}

export default { connect, query };