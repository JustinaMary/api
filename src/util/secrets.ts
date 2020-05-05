import logger from './logger';
import dotenv from 'dotenv';

export const ENVIRONMENT = process.env.NODE_ENV;

switch (ENVIRONMENT) {
    case 'production':
        dotenv.config({ path: '.env.production' });
        break;
    case 'development':
        dotenv.config({ path: '.env.development' });
        break;
}

export const SESSION_SECRET = process.env['SESSION_SECRET'];

if (!SESSION_SECRET) {
    logger.error('No client secret. Set SESSION_SECRET environment variable.');
    process.exit(1);
}
