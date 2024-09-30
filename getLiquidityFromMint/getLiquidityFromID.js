import { gql, GraphQLClient } from "graphql-request";
import * as solana from '@solana/web3.js';
import { argv } from "process";

const gqlEndpoint = `https://programs.shyft.to/v0/graphql/?api_key=Oqvl8hnl4kLbAJR4`;
const rpcEndpoint = `https://rpc.shyft.to/?api_key=Oqvl8hnl4kLbAJR4`

const graphQLClient = new GraphQLClient(gqlEndpoint, {
  method: `POST`,
  jsonSerializer: {
    parse: JSON.parse,
    stringify: JSON.stringify,
  },
});

const connection = new solana.Connection(rpcEndpoint);

async function queryLpMintInfo(address) {
  // See how we are only querying what we need
  const query = gql`
    query MyQuery ($where: Raydium_LiquidityPoolv4_bool_exp) {
  Raydium_LiquidityPoolv4(
    where: $where
  ) {
    baseMint
    lpMint
    lpReserve
  }
}`;

  const variables = {
    where: {
      pubkey: {
        _eq: address,
      },
    },
  };

  return await graphQLClient.request(query, variables);
}

/*
This is taken from Raydium's FE code
https://github.com/raydium-io/raydium-frontend/blob/572e4973656e899d04e30bfad1f528efbf79f975/src/pages/liquidity/add.tsx#L646
*/
function getBurnPercentage(lpReserve, actualSupply) {
  const maxLpSupply = Math.max(actualSupply, (lpReserve - 1));
  const burnAmt = (maxLpSupply - actualSupply)
  console.log(`burn amt: ${burnAmt}`)
  return (burnAmt / maxLpSupply) * 100;
}

const args = argv.slice(2);
const lpAddress = args[0];

//This is Jup-Sol pool addres
//const info = await queryLpMintInfo("XBFAnFjxoLEWE45GcPKEYgqMG3akpa1HkvXhmKPk2Zr");
const info = await queryLpMintInfo(lpAddress);
const lpMint = info.Raydium_LiquidityPoolv4[0].lpMint


//Once we have the lpMint address, we need to fetch the current token supply and decimals
const parsedAccInfo = await connection.getParsedAccountInfo(new solana.PublicKey(lpMint));
const mintInfo = parsedAccInfo?.value?.data?.parsed?.info

//We divide the values based on the mint decimals
const lpReserve = info.Raydium_LiquidityPoolv4[0].lpReserve / Math.pow(10, mintInfo?.decimals)
const actualSupply = mintInfo?.supply / Math.pow(10, mintInfo?.decimals)
console.log(`lpMint: ${lpMint}, Reserve: ${lpReserve}, Actual Supply: ${actualSupply}`);

//Calculate burn percentage
const burnPct = getBurnPercentage(lpReserve, actualSupply)
console.log(`${burnPct} LP burned`);


