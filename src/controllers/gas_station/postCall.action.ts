import { Response, NextFunction } from 'express';
import { sendTransaction } from '../../util/network';
import { HttpError, HttpRequest } from '../../models/Error';
import { hex2a, parseLogs, findEvent } from '../../util/events';
import { Artifacts } from '../../util/artifacts';
import { eventIndexer } from '../../util/indexer';

const indexer = eventIndexer as any;
const eventNames = [
    'WithdrawPollCreated',
    'WithdrawPollFinalized',
    'Withdrawn',
    'WithdrawPollVoted',
    'WithdrawPollRevokedVote',
];

export const postCall = async (req: HttpRequest, res: Response, next: NextFunction) => {
    try {
        const tx = await sendTransaction(
            req.solution.options.address,
            req.solution.methods.call(req.body.call, req.body.nonce, req.body.sig),
            req.assetPool.network,
        );
        const events = parseLogs(Artifacts.IDefaultDiamond.abi, tx.logs);
        const event = findEvent('Result', events);

        if (event) {
            if (!event.args.success) {
                const error = hex2a(event.args.data.substr(10));

                return res.status(500).json({
                    error,
                });
            }

            for (const eventName of eventNames) {
                const event = findEvent(eventName, events);

                if (event) {
                    const callback = indexer[`on${eventName}`];

                    if (callback) {
                        await callback(req.assetPool.network, req.solution.options.address, event.args);
                    }
                }
            }

            res.status(200).end();
        }
    } catch (err) {
        return next(new HttpError(502, 'gas_station/call failed.', err));
    }
};
