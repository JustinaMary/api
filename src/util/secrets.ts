import dotenv from 'dotenv';
import logger from './logger';

dotenv.config({ path: process.env.NODE_ENV === 'test' ? '.env.example' : '.env' });

export const VERSION = 'v1';
export const ENVIRONMENT = process.env.NODE_ENV;
export const MONGODB_URI = process.env['MONGODB_URI'];
export const PRIVATE_KEY = process.env['PRIVATE_KEY'];
export const SESSION_SECRET = process.env['SESSION_SECRET'];
export const APP_URL = process.env['APP_URL'];
export const RPC = process.env['RPC'];

if (!MONGODB_URI) {
    logger.error('No mongo connection string. Set MONGODB_URI environment variable.');
    process.exit(1);
}

if (!SESSION_SECRET) {
    logger.error('No client secret. Set SESSION_SECRET environment variable.');
    process.exit(1);
}
