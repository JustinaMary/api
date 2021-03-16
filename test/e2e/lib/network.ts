import Web3 from 'web3';
import { ethers, Wallet } from 'ethers';
import { PRIVATE_KEY } from '../../../src/util/secrets';
import { VOTER_PK } from './constants';
import { provider, solutionContract } from '../../../src/util/network';

export const admin = new ethers.Wallet(PRIVATE_KEY, provider);
export const voter = new ethers.Wallet(VOTER_PK, provider);

export const timeTravel = async (seconds: number) => {
    await provider.send('evm_increaseTime', [seconds]);
    await provider.send('evm_mine', []);
};

export async function signMethod(poolAddress: string, name: string, args: any[], account: Wallet) {
    const solution = solutionContract(poolAddress);
    let nonce = await solution.getLatestNonce(await account.getAddress());
    nonce = parseInt(nonce) + 1;
    const call = solution.interface.encodeFunctionData(name, args);
    const hash = Web3.utils.soliditySha3(call, nonce);
    const sig = await account.signMessage(ethers.utils.arrayify(hash));
    return {
        call,
        nonce,
        sig,
    };
}
