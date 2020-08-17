import express from "express";
import compression from "compression";
import session from "express-session";
import bodyParser from "body-parser";
import lusca from "lusca";
import flash from "express-flash";
import path from "path";
import { VERSION, SESSION_SECRET } from "./util/secrets";

import * as apiController from "./controllers/api";
import * as slackController from "./controllers/slack";
import { RewardRule } from "./util/network";

const app = express();

app.set("port", process.env.PORT || 3000);
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "pug");
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
    session({
        resave: true,
        saveUninitialized: true,
        secret: SESSION_SECRET,
    }),
);
app.use(flash());
app.use(lusca.xframe("SAMEORIGIN"));
app.use(lusca.xssProtection(true));

app.use(express.static(path.join(__dirname, "public"), { maxAge: 31557600000 }));

function auth(req: any, res: any, next: any) {
    if (!req.headers["x-api-key"]) {
        return res.status(403).json({ error: "No API Key provided!" });
    } else if (req.headers["x-api-key"] !== process.env.API_KEY) {
        return res.status(403).json({ error: "Incorrect API Key provided." });
    }
    next();
};

/**
 * Slack Proxy routes.
 */
app.get(`/${VERSION}/proxy/slack`, slackController.getSlack);
app.post(`/${VERSION}/proxy/slack/connect`, slackController.connectAccount);
app.post(`/${VERSION}/proxy/slack/rules`, slackController.getRewardRules);
app.post(`/${VERSION}/proxy/slack/reward`, slackController.sendReward);
app.get(`/${VERSION}/qr/reward/:pool/:rule/:key`, apiController.getQRReward);
app.get(`/${VERSION}/qr/connect/:pool/:slack`, apiController.getQRConnect);

/**
 * API routes.
 */
app.post(`/${VERSION}/rewards`, apiController.postReward);
app.get(`/${VERSION}`, apiController.getAPI);
app.get(`/${VERSION}/rules`, apiController.getRewardRules);
app.get(`/${VERSION}/rules/:id`, apiController.getRewardRule);
app.get(`/${VERSION}/members`, apiController.getMembers);
app.get(`/${VERSION}/members/:id`, apiController.getMember);

export default app;
