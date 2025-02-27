import { body, header, param, query } from 'express-validator';
import { isAddress } from 'web3-utils';

export const validations = {
    getWithdrawals: [header('AssetPool').exists()],
    getWithdrawalsForMember: [
        query('member')
            .exists()
            .custom((value) => {
                return isAddress(value);
            }),
    ],
    getWithdrawal: [param('id').exists().isNumeric()],
    postWithdrawal: [
        body('member')
            .exists()
            .custom((value) => {
                return isAddress(value);
            }),
        ,
        body('amount').exists().isNumeric(),
    ],
    postWithdrawalWithdraw: [param('id').exists().isNumeric()],
    postVote: [param('id').exists().isNumeric(), header('AssetPool').exists()],
    deleteVote: [param('id').exists().isNumeric(), header('AssetPool').exists()],
    postPollFinalize: [param('id').exists().isNumeric()],
};
