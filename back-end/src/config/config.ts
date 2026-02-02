import dotenv from 'dotenv';

dotenv.config();

interface Config {
    port: number;
    secret: string;
}

interface DbConfig {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    type: string;
}

const config: Config = {
    port: Number(process.env.PORT) || 3000,
    secret: process.env.SECRET || 'null'
};

export const dbConfig: DbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || 'eventplannr',
    username: process.env.DB_USER || 'user',
    password: process.env.DB_PASSWORD || 'password',
    type: process.env.DB_TYPE || 'mysql'
}

export default config;