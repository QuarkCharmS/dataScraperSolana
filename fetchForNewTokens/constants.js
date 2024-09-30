"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.rayFee = exports.solanaConnection = void 0;
var web3_js_1 = require("@solana/web3.js");
var dotenv_1 = require("dotenv");
dotenv_1.default.config();
var RPC_ENDPOINT = (_a = process.env.RPC_ENDPOINT) !== null && _a !== void 0 ? _a : (0, web3_js_1.clusterApiUrl)('mainnet-beta');
var RPC_WEBSOCKET_ENDPOINT = (_b = process.env.RPC_WEBSOCKET_ENDPOINT) !== null && _b !== void 0 ? _b : 'wss://api.mainnet-beta.solana.com';
exports.solanaConnection = new web3_js_1.Connection(RPC_ENDPOINT, {
    wsEndpoint: RPC_WEBSOCKET_ENDPOINT,
});
exports.rayFee = new web3_js_1.PublicKey('7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eqaYcHQqtj2G5');
