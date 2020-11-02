import request from 'supertest';
import mongoose from 'mongoose';
import db from '../src/util/database';
import app from '../src/app';
import { ASSET_POOL, REWARD_POLL, WITHDRAW_POLL } from '../src/util/network';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { voter, timeTravel, signMethod, admin, testTokenFactory } from './lib/network';
import {
    poolTitle,
    rewardPollDuration,
    proposeWithdrawPollDuration,
    rewardTitle,
    rewardDescription,
    rewardWithdrawAmount,
    rewardWithdrawDuration,
    mintAmount,
} from './lib/constants';
import { formatEther, parseEther } from 'ethers/lib/utils';

const user = request.agent(app);

let poolAddress: any, pollAddress: any, withdrawPollAddress: any, testToken: any;

beforeAll(async () => {
    const server = new MongoMemoryServer({
        instance: {
            ip: 'localhost',
            port: 27027,
            dbName: 'test',
        },
        autoStart: true,
    });

    await server.ensureInstance();

    testToken = await testTokenFactory.deploy(admin.address, mintAmount);

    await testToken.deployed();
});

afterAll(async () => {
    await mongoose.disconnect();
    return await db.disconnect();
});

describe('POST /login (no auth)', () => {
    it('400 if payload is missing', async (done) => {
        user.post('/v1/login').end((err, res) => {
            expect(res.status).toBe(400);
            done();
        });
    });
    it('400 if email is missing', (done) => {
        user.post('/v1/login')
            .send({ password: 'mellon' })
            .end((err, res) => {
                expect(res.status).toBe(400);
                done();
            });
    });
    it('400 if password is missing', (done) => {
        user.post('/v1/login')
            .send({ email: 'test.bot@thx.network' })
            .end((err, res) => {
                expect(res.status).toBe(400);
                done();
            });
    });
    it('401 if account is not found', (done) => {
        user.post('/v1/login')
            .send({ email: 'test.bot@thx.network', password: 'mellon' })
            .end((err, res) => {
                expect(res.status).toBe(404);
                done();
            });
    });
});

describe('POST /signup', () => {
    it('500 if payload is missing', (done) => {
        user.post('/v1/signup').end((err, res) => {
            expect(res.status).toBe(400);
            done();
        });
    });
    it('500 if email is missing', (done) => {
        user.post('/v1/signup')
            .send({ password: 'mellon', confirmPassword: 'mellon' })
            .end((err, res) => {
                expect(res.status).toBe(400);
                done();
            });
    });
    it('500 if password is missing', (done) => {
        user.post('/v1/signup')
            .send({ email: 'test.bot@thx.network', confirmPassword: 'mellon' })
            .end((err, res) => {
                expect(res.status).toBe(400);
                done();
            });
    });
    it('500 if confirmPassword is missing', (done) => {
        user.post('/v1/signup')
            .send({ email: 'test.bot@thx.network', password: 'mellon' })
            .end((err, res) => {
                expect(res.status).toBe(400);
                done();
            });
    });
    it('302 if payload is correct', (done) => {
        user.post('/v1/signup')
            .send({ email: 'test.bot@thx.network', password: 'mellon', confirmPassword: 'mellon' })
            .end((err, res) => {
                expect(res.status).toBe(302);
                done();
            });
    });
    it('403 if email already exists', (done) => {
        user.post('/v1/signup')
            .send({ email: 'test.bot@thx.network', password: 'mellon', confirmPassword: 'mellon' })
            .end((err, res) => {
                expect(res.status).toBe(409);
                done();
            });
    });
});

describe('POST /logout', () => {
    it('200 if logout is handled', (done) => {
        user.get('/v1/logout').end((err, res) => {
            expect(res.status).toBe(200);
            done();
        });
    });
});

describe('GET /account (after logout)', () => {
    it('401', async (done) => {
        user.get('/v1/account').end((err, res) => {
            expect(res.status).toBe(401);
            done();
        });
    });
});

describe('POST /login', () => {
    let redirectURL = '';

    it('401 if credentials are incorrect', (done) => {
        user.post('/v1/login')
            .send({ email: 'bad.bot@thx.network', password: 'mellon' })
            .end((err, res) => {
                expect(res.status).toBe(404);
                done();
            });
    });

    it('302 if credentials are correct', (done) => {
        user.post('/v1/login')
            .send({ email: 'test.bot@thx.network', password: 'mellon' })
            .end((err, res) => {
                expect(res.status).toBe(302);
                redirectURL = res.header.location;
                done();
            });
    });

    it('200 after redirect', (done) => {
        user.get('/v1/' + redirectURL).end((err, res) => {
            expect(res.status).toBe(200);
            done();
        });
    });
});

describe('GET /account (after login)', () => {
    it('200', async (done) => {
        user.get('/v1/account').end((err, res) => {
            expect(res.status).toBe(200);
            done();
        });
    });
});

describe('POST /asset_pools', () => {
    it('200', async (done) => {
        user.post('/v1/asset_pools')
            .send({
                title: poolTitle,
                token: testToken.address,
            })
            .end(async (err, res) => {
                expect(res.status).toBe(200);
                expect(res.body.address).toContain('0x');
                poolAddress = res.body.address;

                // Transfer some tokens to the pool rewardWithdrawAmount tokens for the pool
                await testToken.transfer(poolAddress, rewardWithdrawAmount);
                done();
            });
    });
});

describe('GET /asset_pools/:address', () => {
    it('200 and expose pool information', (done) => {
        user.get('/v1/asset_pools/' + poolAddress)
            .set({ AssetPool: poolAddress })
            .end(async (err, res) => {
                const adminBalance = await testToken.balanceOf(admin.address);

                expect(Number(formatEther(adminBalance))).toBe(
                    Number(formatEther(mintAmount)) - Number(formatEther(rewardWithdrawAmount)),
                );
                expect(res.body.title).toEqual(poolTitle);
                expect(res.body.address).toEqual(poolAddress);

                expect(res.body.token.address).toEqual(testToken.address);
                expect(res.body.token.name).toEqual(await testToken.name());
                expect(res.body.token.symbol).toEqual(await testToken.symbol());
                expect(Number(formatEther(res.body.token.balance))).toBe(Number(formatEther(rewardWithdrawAmount)));

                expect(Number(res.body.proposeWithdrawPollDuration)).toEqual(0);
                expect(Number(res.body.rewardPollDuration)).toEqual(0);
                expect(res.status).toBe(200);
                done();
            });
    });

    it('404 if pool does not exist', (done) => {
        user.get('/v1/asset_pools/0x0000000000000000000000000000000000000000')
            .set({ AssetPool: poolAddress })
            .end(async (err, res) => {
                expect(res.status).toBe(404);
                done();
            });
    });
});

describe('PATCH /asset_pools/:address', () => {
    let redirectURL = '';
    it('302 ', (done) => {
        user.patch('/v1/asset_pools/' + poolAddress)
            .set({ AssetPool: poolAddress })
            .send({
                rewardPollDuration: 10,
                proposeWithdrawPollDuration: 10,
            })
            .end(async (err, res) => {
                redirectURL = res.headers.location;

                expect(res.status).toBe(302);
                done();
            });
    });

    it('200 after redirect', (done) => {
        user.get('/v1/' + redirectURL)
            .set({ AssetPool: poolAddress })
            .end(async (err, res) => {
                expect(Number(res.body.proposeWithdrawPollDuration)).toEqual(10);
                expect(Number(res.body.rewardPollDuration)).toEqual(10);
                expect(res.status).toBe(200);
                done();
            });
    });

    it('500 if incorrect rewardPollDuration value is sent ', (done) => {
        user.patch('/v1/asset_pools/' + poolAddress)
            .set({ AssetPool: poolAddress })
            .send({
                rewardPollDuration: 'fivehundred',
            })
            .end(async (err, res) => {
                expect(res.status).toBe(500);
                done();
            });
    });

    it('500 if incorrect proposeWithdrawPollDuration value is sent ', (done) => {
        user.patch('/v1/asset_pools/' + poolAddress)
            .set({ AssetPool: poolAddress })
            .send({
                proposeWithdrawPollDuration: 'fivehundred',
            })
            .end(async (err, res) => {
                expect(res.status).toBe(500);
                done();
            });
    });

    it('should still have the correct values', (done) => {
        user.get('/v1/asset_pools/' + poolAddress)
            .set({ AssetPool: poolAddress })
            .end(async (err, res) => {
                expect(Number(res.body.proposeWithdrawPollDuration)).toEqual(proposeWithdrawPollDuration);
                expect(Number(res.body.rewardPollDuration)).toEqual(rewardPollDuration);
                expect(res.status).toBe(200);
                done();
            });
    });
});

describe('POST /rewards/', () => {
    let redirectURL = '';

    it('302 when reward is added', (done) => {
        user.post('/v1/rewards/')
            .set({ AssetPool: poolAddress })
            .send({
                withdrawAmount: rewardWithdrawAmount,
                withdrawDuration: rewardWithdrawDuration,
                title: rewardTitle,
                description: rewardDescription,
            })
            .end(async (err, res) => {
                redirectURL = res.headers.location;
                expect(res.status).toBe(302);
                done();
            });
    });

    it('200 after redirect', (done) => {
        user.get('/v1/' + redirectURL)
            .set({ AssetPool: poolAddress })
            .end(async (err, res) => {
                expect(Number(res.body.id)).toEqual(0);
                expect(res.body.title).toEqual(rewardTitle);
                expect(res.body.description).toEqual(rewardDescription);
                expect(res.body.poll.address).toContain('0x');
                expect(Number(res.body.poll.withdrawDuration)).toEqual(rewardWithdrawDuration);
                expect(Number(formatEther(res.body.poll.withdrawAmount))).toEqual(
                    Number(formatEther(rewardWithdrawAmount)),
                );
                expect(res.status).toBe(200);
                done();
            });
    });
});

describe('GET /rewards/:id', () => {
    it('200 when successful', (done) => {
        user.get('/v1/rewards/0')
            .set({ AssetPool: poolAddress })
            .end(async (err, res) => {
                expect(res.status).toBe(200);
                done();
            });
    });

    it('404 if reward can not be found', (done) => {
        user.get('/v1/rewards/1')
            .set({ AssetPool: poolAddress })
            .end(async (err, res) => {
                expect(res.status).toBe(404);
                done();
            });
    });

    it('500 if the id parameter is invalid', (done) => {
        user.get('/v1/rewards/id_invalid')
            .set({ AssetPool: poolAddress })
            .end(async (err, res) => {
                expect(res.status).toBe(500);
                done();
            });
    });
});

describe('GET /members/:address', () => {
    it('404 if member is not found', (done) => {
        user.post('/v1/members/' + voter.address)
            .set({ AssetPool: poolAddress })
            .end(async (err, res) => {
                expect(res.status).toBe(404);
                done();
            });
    });
});

describe('POST /members/:address', () => {
    let redirectURL = '';

    it('302 when member is added', (done) => {
        user.post('/v1/members/')
            .send({ address: voter.address })
            .set({ AssetPool: poolAddress })
            .end(async (err, res) => {
                redirectURL = res.headers.location;

                expect(res.status).toBe(302);
                done();
            });
    });

    it('200 for the redirect', (done) => {
        user.get('/v1/' + redirectURL)
            .set({ AssetPool: poolAddress })
            .end(async (err, res) => {
                expect(res.body.isMember).toEqual(true);
                expect(res.body.isManager).toEqual(false);
                expect(res.status).toBe(200);
                done();
            });
    });
});

describe('GET /polls/:id', () => {
    it('200 and expose poll address', (done) => {
        user.get('/v1/rewards/0')
            .set({ AssetPool: poolAddress })
            .end(async (err, res) => {
                pollAddress = res.body.poll.address;
                expect(res.body.poll.address).toContain('0x');
                expect(Number(formatEther(res.body.withdrawAmount))).toEqual(0);
                expect(Number(res.body.state)).toEqual(0);
                expect(res.status).toBe(200);
                done();
            });
    });

    it('200 if poll exists', (done) => {
        user.get('/v1/polls/' + pollAddress)
            .set({ AssetPool: poolAddress })
            .end(async (err, res) => {
                expect(res.status).toBe(200);
                done();
            });
    });
});

describe('GET /polls/:id/vote/:agree', () => {
    it('200 and base64 string for the yes vote', (done) => {
        user.get(`/v1/polls/${pollAddress}/vote/1`)
            .set({ AssetPool: poolAddress })
            .end(async (err, res) => {
                expect(res.body.base64).toContain('data:image/png;base64');
                expect(res.status).toBe(200);
                done();
            });
    });
});

describe('POST /polls/:address/vote (rewardPoll)', () => {
    let redirectURL = '';

    it('200 and base64 string for the yes vote', (done) => {
        user.get(`/v1/polls/${pollAddress}/vote/1`)
            .set({ AssetPool: poolAddress })
            .end(async (err, res) => {
                expect(res.body.base64).toContain('data:image/png;base64');
                expect(res.status).toBe(200);
                done();
            });
    });

    it('302 when tx is handled', async (done) => {
        // We assume QR decoding works as expected, will be tested in the wallet repo
        const { call, nonce, sig } = await signMethod(voter, REWARD_POLL.abi, pollAddress, 'vote', [true]);

        user.post(`/v1/polls/${pollAddress}/vote`)
            .send({
                call,
                nonce,
                sig,
            })
            .set({ AssetPool: poolAddress })
            .end(async (err, res) => {
                redirectURL = res.headers.location;
                expect(res.status).toBe(302);
                done();
            });
    });

    it('200 and increase yesCounter with 1', (done) => {
        user.get(`/v1/${redirectURL}`)
            .set({ AssetPool: poolAddress })
            .end(async (err, res) => {
                expect(Number(res.body.totalVoted)).toEqual(1);
                expect(Number(res.body.yesCounter)).toEqual(1);
                expect(Number(res.body.noCounter)).toEqual(0);
                expect(res.status).toBe(200);
                done();
            });
    });
});

describe('POST /polls/:address/finalize (rewardPoll)', () => {
    let redirectURL = '';

    beforeAll(async () => {
        await timeTravel(rewardPollDuration);
    });

    it('302 after finalizing the poll', async (done) => {
        const { call, nonce, sig } = await signMethod(voter, REWARD_POLL.abi, pollAddress, 'finalize', []);

        user.post(`/v1/polls/${pollAddress}/finalize`)
            .send({
                call,
                nonce,
                sig,
            })
            .set({ AssetPool: poolAddress })
            .end(async (err, res) => {
                redirectURL = res.header.location;

                expect(res.status).toBe(302);
                done();
            });
    });

    it('404 after getting the finalized poll', (done) => {
        user.get(`/v1/${redirectURL}`)
            .set({ AssetPool: poolAddress })
            .end(async (err, res) => {
                expect(res.status).toBe(404);
                done();
            });
    });
});

describe('GET /rewards/:id (after finalizing)', () => {
    it('200 and return updated withdrawAmount and state 1', (done) => {
        user.get('/v1/rewards/0')
            .set({ AssetPool: poolAddress })
            .end(async (err, res) => {
                expect(Number(formatEther(res.body.withdrawAmount))).toEqual(Number(formatEther(rewardWithdrawAmount)));
                expect(Number(res.body.state)).toEqual(1);
                expect(res.status).toBe(200);
                done();
            });
    });
});

describe('POST /rewards/:id/claim', () => {
    let redirectURL = '';

    it('200 and base64 string for the claim', (done) => {
        user.get(`/v1/rewards/0/claim`)
            .set({ AssetPool: poolAddress })
            .end(async (err, res) => {
                expect(res.body.base64).toContain('data:image/png;base64');
                expect(res.status).toBe(200);
                done();
            });
    });

    it('302 when tx is handled', async (done) => {
        // We assume QR decoding works as expected, will be tested in the wallet repo
        const { call, nonce, sig } = await signMethod(admin, ASSET_POOL.abi, poolAddress, 'claimReward', [0]);

        user.post(`/v1/rewards/0/claim`)
            .send({
                call,
                nonce,
                sig,
            })
            .set({ AssetPool: poolAddress })
            .end(async (err, res) => {
                redirectURL = res.headers.location;

                expect(res.status).toBe(302);
                done();
            });
    });

    it('200 after return state Pending', (done) => {
        user.get(`/v1/${redirectURL}`)
            .set({ AssetPool: poolAddress })
            .end(async (err, res) => {
                withdrawPollAddress = res.body.address;

                expect(res.body.approvalState).toEqual(false);
                expect(Number(formatEther(res.body.amount))).toEqual(Number(formatEther(rewardWithdrawAmount)));
                expect(res.status).toBe(200);
                done();
            });
    });
});

describe('POST /polls/:address/vote (withdrawPoll)', () => {
    let redirectURL = '';

    it('200 and base64 string for the yes vote', (done) => {
        user.get(`/v1/polls/${withdrawPollAddress}/vote/1`)
            .set({ AssetPool: poolAddress })
            .end(async (err, res) => {
                expect(res.body.base64).toContain('data:image/png;base64');
                expect(res.status).toBe(200);
                done();
            });
    });

    it('302 when tx is handled', async (done) => {
        // We assume QR decoding works as expected, will be tested in the wallet repo
        // Manager should vote for this poll
        const { call, nonce, sig } = await signMethod(admin, WITHDRAW_POLL.abi, withdrawPollAddress, 'vote', [true]);

        user.post(`/v1/polls/${withdrawPollAddress}/vote`)
            .send({
                call,
                nonce,
                sig,
            })
            .set({ AssetPool: poolAddress })
            .end(async (err, res) => {
                redirectURL = res.headers.location;
                expect(res.status).toBe(302);
                done();
            });
    });

    it('200 and increase yesCounter with 1', (done) => {
        user.get(`/v1/${redirectURL}`)
            .set({ AssetPool: poolAddress })
            .end(async (err, res) => {
                expect(Number(res.body.totalVoted)).toEqual(1);
                expect(Number(res.body.yesCounter)).toEqual(1);
                expect(Number(res.body.noCounter)).toEqual(0);
                expect(res.status).toBe(200);
                done();
            });
    });
});

describe('GET /withdrawals/:address', () => {
    it('200 and return state Approved', (done) => {
        user.get(`/v1/withdrawals/${withdrawPollAddress}`)
            .set({ AssetPool: poolAddress })
            .end(async (err, res) => {
                expect(Number(formatEther(res.body.amount))).toEqual(Number(formatEther(rewardWithdrawAmount)));
                expect(res.body.beneficiary).toEqual(admin.address);
                expect(res.body.approvalState).toEqual(true);
                expect(res.status).toBe(200);
                done();
            });
    });
});

describe('POST /withdrawals/:address/withdraw', () => {
    let redirectURL = '';

    beforeAll(async () => {
        await timeTravel(rewardWithdrawDuration);
    });

    it('200 and base64 string for the withdraw', (done) => {
        user.get(`/v1/withdrawals/${withdrawPollAddress}/withdraw`)
            .set({ AssetPool: poolAddress })
            .end(async (err, res) => {
                expect(res.body.base64).toContain('data:image/png;base64');
                expect(res.status).toBe(200);
                done();
            });
    });

    it('302 and redirect to withdrawal', async (done) => {
        const { call, nonce, sig } = await signMethod(admin, WITHDRAW_POLL.abi, withdrawPollAddress, 'finalize', []);

        user.post(`/v1/withdrawals/${withdrawPollAddress}/withdraw`)
            .send({
                call,
                nonce,
                sig,
            })
            .set({ AssetPool: poolAddress })
            .end(async (err, res) => {
                redirectURL = res.headers.location;
                expect(res.status).toBe(302);
                done();
            });
    });

    it('200 and have the minted amount balance again', (done) => {
        user.get('/v1/' + redirectURL)
            .set({ AssetPool: poolAddress })
            .end(async (err, res) => {
                expect(Number(formatEther(res.body.token.balance))).toBe(Number(formatEther(mintAmount)));
                expect(res.status).toBe(200);
                done();
            });
    });
});

describe('GET /asset_pools/:address (after withdaw)', () => {
    it('200 and have 0 balance', (done) => {
        user.get(`/v1/asset_pools/${poolAddress}`)
            .set({ AssetPool: poolAddress })
            .end(async (err, res) => {
                expect(Number(formatEther(res.body.token.balance))).toBe(0);
                expect(res.status).toBe(200);
                done();
            });
    });
});

// // Describe deposit flow
// // Describe flow for propose withdraw
// // Describe flow for reward give
// // Describe flow for rejected withdraw poll
// // Describe flow for rejected reward poll
