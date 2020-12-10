import { Response, Request, NextFunction } from 'express';
import { VERSION } from '../../util/secrets';
import { HttpError } from '../../models/Error';
import { ASSET_POOL, gasStation, parseResultLog } from '../../util/network';

export const postCallAssetPool = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await (await gasStation.call(req.body.call, req.body.contractAddress, req.body.nonce, req.body.sig)).wait();

        res.redirect(`/${VERSION}/${req.body.redirect}`);
    } catch (err) {
        next(new HttpError(502, 'BasePoll Call failed.', err));
    }
};

export const postAssetPoolClaimReward = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tx = await (
            await gasStation.call(req.body.call, req.body.contractAddress, req.body.nonce, req.body.sig)
        ).wait();

        try {
            const { error, logs } = await parseResultLog(ASSET_POOL.abi, tx.logs);

            if (error) {
                throw error;
            }

            const event = logs.filter((e: { name: string }) => e.name === 'WithdrawPollCreated')[0];
            const pollAddress = event.args.poll;

            res.redirect(`/${VERSION}/withdrawals/${pollAddress}`);
        } catch (error) {
            next(new HttpError(500, 'Parse logs failed.', error));
            return;
        }
    } catch (err) {
        next(new HttpError(502, 'AssetPool ClaimReward failed.', err));
    }
};

export const postCallAssetPoolProposeWithdraw = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tx = await (
            await gasStation.call(req.body.call, req.body.contractAddress, req.body.nonce, req.body.sig)
        ).wait();

        try {
            const { error, logs } = await parseResultLog(ASSET_POOL.abi, tx.logs);

            if (error) {
                throw error;
            }

            const event = logs.filter((e: { name: string }) => e.name === 'WithdrawPollCreated')[0];
            const pollAddress = event.args.poll;

            res.redirect(`/${VERSION}/withdrawals/${pollAddress}`);
        } catch (err) {
            next(new HttpError(500, 'Parse logs failed.', err));
            return;
        }
    } catch (err) {
        next(new HttpError(502, 'Gas Station call failed.', err));
    }
};
