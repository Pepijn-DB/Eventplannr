import { dbConfig } from '../config/config.js';
import postgres from './postgresService.js';
import mysql from './mysqlService.js';

import type {QueryResult} from "pg";
import type {Query} from "mysql2";

import type {MaybePromise} from "../models/maybepromise.js";

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

export function query(query: string, params: any[] = []):MaybePromise<QueryResult> | Query | null {
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

export default { connect, query };