import dotenv from 'dotenv';

dotenv.config();

interface Config {
    port: number;
    secret: string;
}

const config: Config = {
    port: Number(process.env.PORT) || 3000,
    secret: process.env.SECRET || 'null'
};

export default config;