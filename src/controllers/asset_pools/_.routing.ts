import express from 'express';
import { validate } from '../../util/validation';
import { validations } from './_.validation';
import { parseHeader } from '../../util/network';
import { getAssetPool } from './get.action';
import { postAssetPool } from './post.action';
import { patchAssetPool } from './patch.action';
import checkScopes from 'express-jwt-authz';

const router = express.Router();

router.post('/', checkScopes(['dashboard']), validate(validations.postAssetPool), postAssetPool);
router.get(
    '/:address',
    checkScopes(['admin', 'user', 'dashboard']),
    validate(validations.getAssetPool),
    parseHeader,
    getAssetPool,
);
router.patch(
    '/:address',
    checkScopes(['dashboard']),
    validate(validations.patchAssetPool),
    parseHeader,
    patchAssetPool,
);

export default router;
