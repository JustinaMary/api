import rateLimit from 'express-rate-limit';
import { RATE_LIMIT_REWARD_GIVE, RATE_LIMIT_REWARD_GIVE_WINDOW } from './secrets';

export const rateLimitRewardGive = rateLimit({
    windowMs: RATE_LIMIT_REWARD_GIVE_WINDOW * 1000, // in seconds * 1000ms
    max: RATE_LIMIT_REWARD_GIVE, // limit each IP to n requests per windowMs
});
