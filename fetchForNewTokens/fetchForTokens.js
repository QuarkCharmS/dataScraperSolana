"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeData = storeData;
var constants_1 = require("./constants");
var fs_1 = require("fs");
var chalk_1 = require("chalk");
var path_1 = require("path");
var sendFetchedTokens = false;
var dataPath = path_1.default.join(__dirname, 'new_solana_tokens.json');
var socket = new WebSocket('ws://localhost:6789');
function handleSocketTriggers(message) {
    if (message === 'Stop.') {
        sendFetchedTokens = false;
        console.log(chalk_1.default.red("Now the program won't send fetched tokens."));
    }
    else if (message === 'Start.') {
        sendFetchedTokens = true;
        console.log(chalk_1.default.green("Now the program will send fetched tokens."));
    }
    else if (message === 'Stop Completely.') {
        console.log(chalk_1.default.red("EXITING PROGRAM."));
        process.exit();
    }
}
socket.addEventListener('message', function (event) {
    handleSocketTriggers(event.data);
});
function waitForConnection(socket) {
    return new Promise(function (resolve, reject) {
        socket.onopen = function () {
            console.log("WebSocket connection established");
            resolve();
        };
        socket.onerror = function (err) {
            console.error("WebSocket error observed:", err);
            reject(err);
        };
    });
}
function storeData(dataPath, newData) {
    fs_1.default.readFile(dataPath, function (err, fileData) {
        if (err) {
            console.error("Error reading file: ".concat(err));
            return;
        }
        var json;
        try {
            json = JSON.parse(fileData.toString());
        }
        catch (parseError) {
            console.error("Error parsing JSON from file: ".concat(parseError));
            return;
        }
        json.push(newData);
        fs_1.default.writeFile(dataPath, JSON.stringify(json, null, 2), function (writeErr) {
            if (writeErr) {
                console.error("Error writing file: ".concat(writeErr));
            }
            else {
                console.log("New token data stored successfully.");
            }
        });
    });
}
function monitorNewTokens(connection) {
    return __awaiter(this, void 0, void 0, function () {
        var err_1, errorMessage;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, waitForConnection(socket)];
                case 1:
                    _a.sent();
                    socket.send('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
                    return [3 /*break*/, 3];
                case 2:
                    err_1 = _a.sent();
                    console.error("Failed to establish connection", err_1);
                    return [3 /*break*/, 3];
                case 3:
                    console.log(chalk_1.default.green("monitoring new solana tokens..."));
                    try {
                        connection.onLogs(constants_1.rayFee, function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
                            var signer, baseAddress, baseDecimals, baseLpAmount, quoteAddress, quoteDecimals, quoteLpAmount, parsedTransaction, postTokenBalances, baseInfo, quoteInfo, newTokenData, error_1, errorMessage;
                            var logs = _b.logs, err = _b.err, signature = _b.signature;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        _c.trys.push([0, 2, , 3]);
                                        if (err) {
                                            console.error("connection contains error, ".concat(err));
                                            return [2 /*return*/];
                                        }
                                        console.log(chalk_1.default.bgGreen("found new token signature: ".concat(signature)));
                                        signer = '';
                                        baseAddress = '';
                                        baseDecimals = 0;
                                        baseLpAmount = 0;
                                        quoteAddress = '';
                                        quoteDecimals = 0;
                                        quoteLpAmount = 0;
                                        return [4 /*yield*/, connection.getParsedTransaction(signature, {
                                                maxSupportedTransactionVersion: 0,
                                                commitment: 'confirmed',
                                            })];
                                    case 1:
                                        parsedTransaction = _c.sent();
                                        if (parsedTransaction && (parsedTransaction === null || parsedTransaction === void 0 ? void 0 : parsedTransaction.meta.err) == null) {
                                            console.log("successfully parsed transaction");
                                            signer =
                                                parsedTransaction === null || parsedTransaction === void 0 ? void 0 : parsedTransaction.transaction.message.accountKeys[0].pubkey.toString();
                                            console.log("creator, ".concat(signer));
                                            postTokenBalances = parsedTransaction === null || parsedTransaction === void 0 ? void 0 : parsedTransaction.meta.postTokenBalances;
                                            baseInfo = postTokenBalances === null || postTokenBalances === void 0 ? void 0 : postTokenBalances.find(function (balance) {
                                                return balance.owner ===
                                                    '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1' &&
                                                    balance.mint !== 'So11111111111111111111111111111111111111112';
                                            });
                                            if (baseInfo) {
                                                baseAddress = baseInfo.mint;
                                                baseDecimals = baseInfo.uiTokenAmount.decimals;
                                                baseLpAmount = baseInfo.uiTokenAmount.uiAmount;
                                            }
                                            quoteInfo = postTokenBalances.find(function (balance) {
                                                return balance.owner ==
                                                    '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1' &&
                                                    balance.mint == 'So11111111111111111111111111111111111111112';
                                            });
                                            if (quoteInfo) {
                                                quoteAddress = quoteInfo.mint;
                                                quoteDecimals = quoteInfo.uiTokenAmount.decimals;
                                                quoteLpAmount = quoteInfo.uiTokenAmount.uiAmount;
                                            }
                                        }
                                        newTokenData = {
                                            lpSignature: signature,
                                            creator: signer,
                                            timestamp: new Date().toISOString(),
                                            baseInfo: {
                                                baseAddress: baseAddress,
                                                baseDecimals: baseDecimals,
                                                baseLpAmount: baseLpAmount,
                                            },
                                            quoteInfo: {
                                                quoteAddress: quoteAddress,
                                                quoteDecimals: quoteDecimals,
                                                quoteLpAmount: quoteLpAmount,
                                            },
                                            logs: logs,
                                        };
                                        console.log("Base Address (mint): ".concat(newTokenData.baseInfo.baseAddress));
                                        if (sendFetchedTokens) {
                                            socket.send(newTokenData.baseInfo.baseAddress);
                                        }
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_1 = _c.sent();
                                        errorMessage = "error occured in new solana token log callback function, ".concat(JSON.stringify(error_1, null, 2));
                                        console.log(chalk_1.default.red(errorMessage));
                                        // Save error logs to a separate file
                                        fs_1.default.appendFile('errorNewLpsLogs.txt', "".concat(errorMessage, "\n"), function (err) {
                                            if (err)
                                                console.log('error writing errorlogs.txt', err);
                                        });
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); }, 'confirmed');
                    }
                    catch (error) {
                        errorMessage = "error occured in new sol lp monitor, ".concat(JSON.stringify(error, null, 2));
                        console.log(chalk_1.default.red(errorMessage));
                        // Save error logs to a separate file
                        fs_1.default.appendFile('errorNewLpsLogs.txt', "".concat(errorMessage, "\n"), function (err) {
                            if (err)
                                console.log('error writing errorlogs.txt', err);
                        });
                    }
                    return [2 /*return*/];
            }
        });
    });
}
monitorNewTokens(constants_1.solanaConnection);
