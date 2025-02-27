import { NextFunction, Response } from 'express';
import { HttpError, HttpRequest } from '../../models/Error';
import MemberService, { ERROR_IS_NOT_MEMBER } from '../../services/MemberService';

export const getMember = async (req: HttpRequest, res: Response, next: NextFunction) => {
    try {
        const { isMember, error } = await MemberService.isMember(req.assetPool, req.params.address);

        if (error) throw new Error(error);

        if (!isMember) {
            return next(new HttpError(404, ERROR_IS_NOT_MEMBER));
        } else {
            const { member, error } = await MemberService.getByAddress(req.assetPool, req.params.address);

            if (error) throw new Error(error);

            res.json(member);
        }
    } catch (error) {
        return next(new HttpError(500, error.toString(), error));
    }
};

/**
 * @swagger
 * /members/:address:
 *   get:
 *     tags:
 *       - Members
 *     description: Provides information about a membership for the pool.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: AssetPool
 *         in: header
 *         required: true
 *         type: string
 *       - name: address
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: OK
 *         schema:
 *            type: object
 *            properties:
 *               address:
 *                  type: string
 *                  description: The most recent address known for this member
 *               isMember:
 *                  type: boolean
 *                  description: If this address is known as member of the asset pool
 *               isManager:
 *                  type: boolean
 *                  description: If this address is known as manager of the asset pool
 *               balance:
 *                  type: object
 *                  properties:
 *                     name:
 *                        type: string
 *                        description: The name of the token configured for this asset pool
 *                     symbol:
 *                        type: string
 *                        description: The symbol of the token configured for this asset pool
 *                     amount:
 *                        type: number
 *                        description: The token balance of the asset pool for this token
 *       '400':
 *         description: Bad Request. Indicates incorrect body parameters.
 *       '401':
 *         description: Unauthorized. Authenticate your request please.
 *       '403':
 *         description: Forbidden. Your account does not have access to this pool.
 *       '404':
 *         description: Not Found. Address is not a member.
 *       '500':
 *         description: Internal Server Error.
 *       '502':
 *         description: Bad Gateway. Received an invalid response from the network or database.

 */
