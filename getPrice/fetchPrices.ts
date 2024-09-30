import { Commitment, Connection, PublicKey } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import { Liquidity } from "@raydium-io/raydium-sdk";
import { OpenOrders } from "@project-serum/serum";
import { LIQUIDITY_STATE_LAYOUT_V4 } from "@raydium-io/raydium-sdk";
import * as dotenv from "dotenv";
dotenv.config();

const RAYDIUM_LIQUIDITY_POOL_V4_ADDRESS = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
const WSOL_ADDRESS = "So11111111111111111111111111111111111111112";
const RPC = "https://mainnet.helius-rpc.com/?api-key=1d0da973-91e2-4081-9a19-0911446f388f";

const args: string[] = process.argv.slice(2);

if (args.length === 0){
  //console.log('Usage: npx tsx fetchPrice.ts <token>');
  process.exit(1);
}

const mint_token = args[0]; 


////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
//
//
//
//
//
//
//
//
async function getPoolID(baseTokenAddress: string): Promise<string | null> {
  let base = new PublicKey(baseTokenAddress);
  const quote = new PublicKey(WSOL_ADDRESS);
  const commitment: Commitment = "confirmed";

  try {
    const connection = new Connection(RPC);

    // First try with base
    const baseAccounts = await connection.getProgramAccounts(new PublicKey(RAYDIUM_LIQUIDITY_POOL_V4_ADDRESS), {
      commitment,
      filters: [
        { dataSize: LIQUIDITY_STATE_LAYOUT_V4.span },
        {
          memcmp: {
            offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf("baseMint"),
            bytes: base.toBase58(),
          },
        },
        {
          memcmp: {
            offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf("quoteMint"),
            bytes: quote.toBase58(),
          },
        },
      ],
    });

    if (baseAccounts.length > 0) {
      const { pubkey } = baseAccounts[0];
      console.log(`pool-ID: ${pubkey.toString()}`);
      return pubkey.toString();
    }

    // If base fails, try with quote
    const quoteAccounts = await connection.getProgramAccounts(new PublicKey(RAYDIUM_LIQUIDITY_POOL_V4_ADDRESS), {
      commitment,
      filters: [
        { dataSize: LIQUIDITY_STATE_LAYOUT_V4.span },
        {
          memcmp: {
            offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf("baseMint"),
            bytes: quote.toBase58(),
          },
        },
        {
          memcmp: {
            offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf("quoteMint"),
            bytes: base.toBase58(),
          },
        },
      ],
    });

    if (quoteAccounts.length > 0) {
      const { pubkey } = quoteAccounts[0];
      console.log(`pool-ID: ${pubkey.toString()}`);
      return pubkey.toString();
    }

    return null;
  } catch (error) {
    //console.error("Error fetching Market accounts:", error);
    return null;
  }
}

///////////////////////////////////////
//
//
//
//
//
//
//
//
//
//

async function getTokenPrice(poolId: string): Promise<number> {
  try {
    //fetching pool data
    const version: 4 | 5 = 4;

    const connection = new Connection(RPC);

    const account = await connection.getAccountInfo(new PublicKey(poolId));
    const { state: LiquidityStateLayout } = Liquidity.getLayouts(version);

    //@ts-ignore
    const poolState = LiquidityStateLayout.decode(account?.data);

    const baseDecimal = 10 ** poolState.baseDecimal.toNumber();
    const quoteDecimal = 10 ** poolState.quoteDecimal.toNumber();

    const baseTokenAmount = await connection.getTokenAccountBalance(poolState.baseVault);
    const quoteTokenAmount = await connection.getTokenAccountBalance(poolState.quoteVault);

    const basePnl = poolState.baseNeedTakePnl.toNumber() / baseDecimal;
    const quotePnl = poolState.quoteNeedTakePnl.toNumber() / quoteDecimal;

    const OPENBOOK_PROGRAM_ID = poolState.marketProgramId;

    const openOrders = await OpenOrders.load(connection, poolState.openOrders, OPENBOOK_PROGRAM_ID);

    const openOrdersBaseTokenTotal = openOrders.baseTokenTotal.toNumber() / baseDecimal;
    const openOrdersQuoteTokenTotal = openOrders.quoteTokenTotal.toNumber() / quoteDecimal;

    const base = (baseTokenAmount.value?.uiAmount || 0) + openOrdersBaseTokenTotal - basePnl;
    const quote = (quoteTokenAmount.value?.uiAmount || 0) + openOrdersQuoteTokenTotal - quotePnl;

    let priceInSol = "";

    if (poolState.baseMint.equals(NATIVE_MINT)) {
      priceInSol = (base / quote).toString();
    } else if (poolState.quoteMint.equals(NATIVE_MINT)) {
      priceInSol = (quote / base).toString();
    }
    
    console.log(`price-in-sol: ${priceInSol}`);
    return parseFloat(priceInSol);
  } catch (e) {
    //console.error(e);
    return;
  }
}



/////////////////////////////////////////////////////
//
//
//
//
//
//
//
//
//

async function splPriceInSol(tokenAddress: string) {
  try {
    const poolId = await getPoolID(tokenAddress);

    if (!poolId) {
      console.log("No Pool ID Found");
      return;
    }

    const priceInSol = await getTokenPrice(poolId);

    if (!priceInSol) {
      console.log("Unable to fetch token price.");
      return;
    }

    return priceInSol;
  } catch (error) {
    console.error("Error occurred:", error);
  }
}


//console.log(mint_token);
//getPoolID(mint_token);
//getTokenPrice(mint_token);
//console.log(mint_token);
splPriceInSol(mint_token);


////////////////////////////////////
//
//
//
//
//
//
//


