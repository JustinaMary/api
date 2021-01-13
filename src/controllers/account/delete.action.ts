import { Account } from '../../models/Account';
import { Response, NextFunction } from 'express';
import { HttpRequest, HttpError } from '../../models/Error';

/**
 * @swagger
 * /account:
 *   delete:
 *     tags:
 *       - Account
 *     description: Delete current users account
 *     responses:
 *       '200':
 *         description: OK
 *       '302':
 *          description: Redirect to `GET /login`
 *          headers:
 *             Location:
 *                type: string
 *       '401':
 *         description: Unauthorized. Authenticate your request please.
 *       '500':
 *         description: Internal Server Error.
 *       '502':
 *         description: Bad Gateway. Received an invalid response from the network or database.
 */
export const deleteAccount = async (req: HttpRequest, res: Response, next: NextFunction) => {
    try {
        await Account.remove({ _id: req.user.sub });

        res.status(204).end();
    } catch (e) {
        next(new HttpError(502, 'Account remove failed.', e));
    }
};
