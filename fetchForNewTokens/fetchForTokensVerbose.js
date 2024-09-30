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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeData = storeData;
const constants_1 = require("./constants");
const fs_1 = __importDefault(require("fs"));
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const dataPath = path_1.default.join(__dirname, 'new_solana_tokens.json');
function storeData(dataPath, newData) {
    fs_1.default.readFile(dataPath, (err, fileData) => {
        if (err) {
            console.error(`Error reading file: ${err}`);
            return;
        }
        let json;
        try {
            json = JSON.parse(fileData.toString());
        }
        catch (parseError) {
            console.error(`Error parsing JSON from file: ${parseError}`);
            return;
        }
        json.push(newData);
        fs_1.default.writeFile(dataPath, JSON.stringify(json, null, 2), (writeErr) => {
            if (writeErr) {
                console.error(`Error writing file: ${writeErr}`);
            }
            else {
                console.log(`New token data stored successfully.`);
            }
        });
    });
}
function monitorNewTokens(connection) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(chalk_1.default.green(`monitoring new solana tokens...`));
        try {
            connection.onLogs(constants_1.rayFee, (_a) => __awaiter(this, [_a], void 0, function* ({ logs, err, signature }) {
                try {
                    if (err) {
                        console.error(`connection contains error, ${err}`);
                        return;
                    }
                    console.log(chalk_1.default.bgGreen(`found new token signature: ${signature}`));
                    let signer = '';
                    let baseAddress = '';
                    let baseDecimals = 0;
                    let baseLpAmount = 0;
                    let quoteAddress = '';
                    let quoteDecimals = 0;
                    let quoteLpAmount = 0;
                    const parsedTransaction = yield connection.getParsedTransaction(signature, {
                        maxSupportedTransactionVersion: 0,
                        commitment: 'confirmed',
                    });
                    if (parsedTransaction && (parsedTransaction === null || parsedTransaction === void 0 ? void 0 : parsedTransaction.meta.err) == null) {
                        console.log(`successfully parsed transaction`);
                        signer =
                            parsedTransaction === null || parsedTransaction === void 0 ? void 0 : parsedTransaction.transaction.message.accountKeys[0].pubkey.toString();
                        console.log(`creator, ${signer}`);
                        const postTokenBalances = parsedTransaction === null || parsedTransaction === void 0 ? void 0 : parsedTransaction.meta.postTokenBalances;
                        const baseInfo = postTokenBalances === null || postTokenBalances === void 0 ? void 0 : postTokenBalances.find((balance) => balance.owner ===
                            '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1' &&
                            balance.mint !== 'So11111111111111111111111111111111111111112');
                        if (baseInfo) {
                            baseAddress = baseInfo.mint;
                            baseDecimals = baseInfo.uiTokenAmount.decimals;
                            baseLpAmount = baseInfo.uiTokenAmount.uiAmount;
                        }
                        const quoteInfo = postTokenBalances.find((balance) => balance.owner ==
                            '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1' &&
                            balance.mint == 'So11111111111111111111111111111111111111112');
                        if (quoteInfo) {
                            quoteAddress = quoteInfo.mint;
                            quoteDecimals = quoteInfo.uiTokenAmount.decimals;
                            quoteLpAmount = quoteInfo.uiTokenAmount.uiAmount;
                        }
                    }
                    const newTokenData = {
                        lpSignature: signature,
                        creator: signer,
                        timestamp: new Date().toISOString(),
                        baseInfo: {
                            baseAddress,
                            baseDecimals,
                            baseLpAmount,
                        },
                        quoteInfo: {
                            quoteAddress: quoteAddress,
                            quoteDecimals: quoteDecimals,
                            quoteLpAmount: quoteLpAmount,
                        },
                        logs: logs,
                    };
                    console.log(`Base Address (mint): ${newTokenData.baseInfo.baseAddress}`);
                    //store new tokens data in data folder
                    yield storeData(dataPath, newTokenData);
                }
                catch (error) {
                    const errorMessage = `error occured in new solana token log callback function, ${JSON.stringify(error, null, 2)}`;
                    console.log(chalk_1.default.red(errorMessage));
                    // Save error logs to a separate file
                    fs_1.default.appendFile('errorNewLpsLogs.txt', `${errorMessage}\n`, function (err) {
                        if (err)
                            console.log('error writing errorlogs.txt', err);
                    });
                }
            }), 'confirmed');
        }
        catch (error) {
            const errorMessage = `error occured in new sol lp monitor, ${JSON.stringify(error, null, 2)}`;
            console.log(chalk_1.default.red(errorMessage));
            // Save error logs to a separate file
            fs_1.default.appendFile('errorNewLpsLogs.txt', `${errorMessage}\n`, function (err) {
                if (err)
                    console.log('error writing errorlogs.txt', err);
            });
        }
    });
}
monitorNewTokens(constants_1.solanaConnection);
