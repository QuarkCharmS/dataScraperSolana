import { gql, GraphQLClient } from "graphql-request";
import { argv } from "process";
import { PublicKey } from '@solana/web3.js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const endpoint = process.env.SHYFT_API_KEY
  ? `https://programs.shyft.to/v0/graphql/?api_key=${process.env.SHYFT_API_KEY}`
  : null;

if (!endpoint) {
  console.error('Error: SHYFT_API_KEY is required. Please set it in your .env file.');
  console.error('Get your free API key at: https://shyft.to/');
  process.exit(1);
}

const graphQLClient = new GraphQLClient(endpoint, {
  method: `POST`,
  jsonSerializer: {
    parse: JSON.parse,
    stringify: JSON.stringify,
  },
});

const args = argv.slice(2);
const lpMint = args[0];
const baseSolana = 'So11111111111111111111111111111111111111112';

function sortTokenStrings(token1, token2) {
    // Convert string addresses to PublicKey objects
    const pubKey1 = new PublicKey(token1);
    const pubKey2 = new PublicKey(token2);

    // Convert PublicKey objects to buffers for comparison
    const buffer1 = pubKey1.toBuffer();
    const buffer2 = pubKey2.toBuffer();

    // Perform byte-wise comparison
    for (let i = 0; i < buffer1.length; i++) {
        if (buffer1[i] < buffer2[i]) return [token1, token2];
        if (buffer1[i] > buffer2[i]) return [token2, token1];
    }
    return [token1, token2]; // If somehow identical, return the original order
}
function queryLpPair(tokenOne, tokenTwo) {
//You can see we are fetching less fields, so you can coose and fetch only what you want.
const query = gql`
    query MyQuery {
  Raydium_LiquidityPoolv4(
    where: {
    baseMint: {_eq: ${JSON.stringify(tokenOne)}},
    quoteMint: {_eq: ${JSON.stringify(tokenTwo)}}}
  ) {
    baseDecimal
    baseLotSize
    baseMint
    baseVault
    lpMint
    lpReserve
    lpVault
    marketId
    marketProgramId
    openOrders
    owner
    poolOpenTime
    quoteDecimal
    quoteLotSize
    quoteMint
    quoteNeedTakePnl
    quoteTotalPnl
    quoteVault
    status
    pubkey
  }
}`;

  graphQLClient.request(query).then(console.log);
}


const [mintA, mintB] = sortTokenStrings(baseSolana, lpMint);

queryLpPair(
mintA,
mintB);
