import { HttpError, HttpRequest } from '../../models/Error';
import { NextFunction, Response } from 'express';
import { getWithdrawalData } from './get.action';

/**
 * @swagger
 * /withdrawals/:id/finalize:
 *   post:
 *     tags:
 *       - Withdrawals
 *     description: Finalizes the reward poll.
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
 *         type: number
 *     responses:
 *       '200':
 *         description: OK
 *         schema:
 *            type: object
 *            properties:
 *               base64:
 *                  type: string
 *                  description: Base64 string representing function call
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
export const postPollFinalize = async (req: HttpRequest, res: Response, next: NextFunction) => {
    try {
        await (await req.solution.withdrawPollFinalize(req.params.id)).wait();

        try {
            const withdrawal = await getWithdrawalData(req.solution, Number(req.params.id));

            if (!withdrawal) {
                return next(new HttpError(404, 'No withdrawal found for this ID.'));
            }

            res.json(withdrawal);
        } catch (e) {
            return next(new HttpError(502, 'Could not get withdrawal data from the network.', e));
        }
    } catch (e) {
        next(new HttpError(502, 'Could not finalize the withdraw poll.', e));
    }
};
