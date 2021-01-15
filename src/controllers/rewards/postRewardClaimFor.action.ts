import { Response, NextFunction } from 'express';
import { ISolutionRequest } from '../../util/network';
import { HttpError } from '../../models/Error';
import ISolutionArtifact from '../../../src/artifacts/contracts/contracts/interfaces/ISolution.sol/ISolution.json';
import { parseLogs } from '../../util/events';
/**
 * @swagger
 * /rewards/:id/give:
 *   post:
 *     tags:
 *       - Rewards
 *     description: Create a quick response image to claim the reward.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: AssetPool
 *         in: header
 *         required: true
 *         type: string
 *       - name: id
 *         in: path
 *         required: true
 *         type: integer
 *       - name: member
 *         in: body
 *         required: true
 *         type: string
 *     responses:
 *       '200':
 *         description: OK
 *         schema:
 *            type: object
 *            properties:
 *               withdrawPoll:
 *                  type: string
 *                  description: Address off the withdraw poll
 *       '400':
 *         description: Bad Request. Indicates incorrect body parameters.
 *       '401':
 *         description: Unauthorized. Authenticate your request please.
 *       '403':
 *         description: Forbidden. Your account does not have access to this pool.
 *       '500':
 *         description: Internal Server Error.
 *       '502':
 *         description: Bad Gateway. Received an invalid response from the network or database.
 */
export const postRewardClaimFor = async (req: ISolutionRequest, res: Response, next: NextFunction) => {
    try {
        const result = await req.solution.getReward(req.params.id);

        if (!result) {
            throw new Error(result);
        }

        try {
            const tx = await (await req.solution.claimRewardFor(req.params.id, req.body.member)).wait();

            try {
                const logs = await parseLogs(ISolutionArtifact.abi, tx.logs);
                const event = logs.filter((e: { name: string }) => e && e.name === 'WithdrawPollCreated')[0];
                const withdrawPoll = event.args.id.toNumber();

                res.json({ withdrawPoll });
            } catch (err) {
                next(new HttpError(500, 'Parse logs failed.', err));
                return;
            }
        } catch (err) {
            next(new HttpError(502, 'Asset Pool claimRewardFor failed.', err));
        }
    } catch (err) {
        next(new HttpError(502, 'Asset Pool reward does not exist.', err));
    }
};
