"use strict";

import { Response, Request } from "express";
import Network from "../util/network";

const network = new Network();
const qrcode = require("qrcode");

/**
 * GET /api
 * Home view for API.
 */
export const getAPI = (req: Request, res: Response) => {
    res.send({
        message: `THX API v0.1.0 (${process.env.NODE_ENV})`,
    });
};

/**
 * POST /api/rewards
 * Proposes a reward for the beneficiary
 */
export const postReward = async (req: Request, res: Response) => {
    const poolAddress = req.header("RewardPool");

    try {
        const tx = await network.createReward(poolAddress, req.body.rule, req.body.address);

        res.send(tx);
    } catch (e) {
        console.error(e);
        res.send(e);
    }
};

/**
 * GET /api/members/
 * Returns a specific reward rule
 */
export const getMembers = async (req: Request, res: Response) => {
    // const poolAddress = req.header("RewardPool");
    // const id = parseInt(req.params.id, 10);
    // const member = await network.getMember(id, poolAddress);

    // res.writeHead(member ? 200 : 404, {
    //     "Content-Type": "application/json",
    // });
    // res.end(JSON.stringify(member));
};

/**
 * GET /api/members/:id
 * Returns a specific reward rule
 */
export const getMember = async (req: Request, res: Response) => {
    const poolAddress = req.header("RewardPool");
    const id = parseInt(req.params.id, 10);
    const member = await network.getMember(id, poolAddress);

    res.writeHead(member ? 200 : 404, {
        "Content-Type": "application/json",
    });
    res.end(JSON.stringify(member));
};

/**
 * GET /api/rules/:id
 * Returns a specific reward rule
 */
export const getRewardRule = async (req: Request, res: Response) => {
    const poolAddress = req.header("RewardPool");
    const id = parseInt(req.params.id, 10);
    const rule = await network.getRewardRule(id, poolAddress);

    res.writeHead(rule ? 200 : 404, {
        "Content-Type": "application/json",
    });
    res.end(JSON.stringify(rule));
};

/**
 * GET /api/rules
 * Lists reward rules
 */
export const getRewardRules = async (req: Request, res: Response) => {
    const poolAddress = req.header("RewardPool");
    const amountOfRules = await network.countRules(poolAddress);

    if (amountOfRules > 0) {
        const rules: any[] = [];

        for (let id = 0; id < amountOfRules; id++) {
            const rule = await network.getRewardRule(id, poolAddress);

            rules.push(rule);
        }

        res.writeHead(200, {
            "Content-Type": "application/json",
        });
        res.end(JSON.stringify(rules));
    } else {
        res.writeHead(404, {
            "Content-Type": "application/json",
        });
        res.end({
            message: `Pool *${network.rewardPool.address}* has no rules available.`,
        });
    }
};

/**
 * GET /api/qr/connect/:pool/:slack
 * Returns a QR image for connecting a Slack account with a Reward Pool
 */
export const getQRConnect = async (req: Request, res: Response) => {
    const data = {
        pool: req.params.pool,
        slack: req.params.slack,
    };
    const qrBase64 = await qrcode.toDataURL(JSON.stringify(data));

    res.writeHead(200, {
        "Content-Type": "image/png",
    });
    res.end(network.getQRBuffer(qrBase64));
};

/**
 * GET /api/qr/reward/:pool/:rule/:key
 * Returns a QR image for connecting a Slack account with a Reward Pool
 */
export const getQRReward = async (req: Request, res: Response) => {
    const data = {
        pool: req.params.pool,
        rule: req.params.rule,
        key: req.params.key,
    };
    const qrBase64 = await qrcode.toDataURL(JSON.stringify(data));

    res.writeHead(200, {
        "Content-Type": "image/png",
    });
    res.end(network.getQRBuffer(qrBase64));
};
