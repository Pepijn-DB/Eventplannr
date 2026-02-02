import dotenv from 'dotenv';

dotenv.config();

interface Config {
    port: number;
    secret: string;
}

interface dbConfig {
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

export default config;