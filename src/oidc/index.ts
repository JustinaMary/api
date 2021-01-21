import Provider from 'oidc-provider';
import express, { Request, Response, NextFunction } from 'express';
import configuration from './config';
import { AccountDocument } from '../models/Account';
import { Account } from '../models/Account';
import { HttpError } from '../models/Error';
import { ISSUER, SECURE_KEY } from '../util/secrets';

const oidc = new Provider(ISSUER, configuration as any);
const router = express.Router();

oidc.proxy = true;
oidc.keys = SECURE_KEY.split(',');

// TODO: REMOVE THIS IN PROD
const { invalidate: orig } = (oidc.Client as any).Schema.prototype;
(oidc.Client as any).Schema.prototype.invalidate = function invalidate(message: any, code: any) {
    if (code === 'implicit-force-https' || code === 'implicit-forbid-localhost') return;
    orig.call(this, message);
};

router.get('/interaction/:uid', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { uid, prompt, params } = await oidc.interactionDetails(req, res);
        const client = await oidc.Client.find(params.client_id);

        switch (prompt.name) {
            case 'login': {
                res.render('login', {
                    client,
                    uid,
                    details: prompt.details,
                    params,
                    title: 'Sign-in',
                    flash: undefined,
                });
                break;
            }
            case 'consent': {
                const consent: any = {};

                // any scopes you do not wish to grant go in here
                //   otherwise details.scopes.new.concat(details.scopes.accepted) will be granted
                consent.rejectedScopes = [];

                // any claims you do not wish to grant go in here
                //   otherwise all claims mapped to granted scopes
                //   and details.claims.new.concat(details.claims.accepted) will be granted
                consent.rejectedClaims = [];

                // replace = false means previously rejected scopes and claims remain rejected
                // changing this to true will remove those rejections in favour of just what you rejected above
                consent.replace = false;

                const result = { consent };

                await oidc.interactionFinished(req, res, result, { mergeWithLastSubmission: true });
                break;
            }
            default:
                return undefined;
        }
    } catch (err) {
        next(new HttpError(500, 'Loading view failed.', err));
    }
});

router.post('/interaction/:uid/login', async (req: Request, res: Response) => {
    try {
        const account: AccountDocument = await Account.findOne({ email: req.body.email });

        if (!account) {
            throw account;
        }

        try {
            account.comparePassword(req.body.password, async (err: Error, isMatch: boolean) => {
                if (err) {
                    throw err;
                }

                if (!isMatch) {
                    throw isMatch;
                }

                const result = {
                    login: {
                        account: account._id.toString(),
                    },
                };

                await oidc.interactionFinished(req, res, result, { mergeWithLastSubmission: true });
            });
        } catch (err) {
            throw new HttpError(502, 'Comparing passwords failed.', err);
        }
    } catch (err) {
        throw new HttpError(502, 'Account read failed.', err);
    }
});

router.get('/interaction/:uid/abort', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = {
            error: 'access_denied',
            error_description: 'End-User aborted interaction',
        };
        await oidc.interactionFinished(req, res, result, { mergeWithLastSubmission: false });
    } catch (err) {
        next(err);
    }
});

export { oidc, router };
