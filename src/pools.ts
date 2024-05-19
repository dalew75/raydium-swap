import 'dotenv/config';

import { LIQUIDITY_STATE_LAYOUT_V4, LiquidityPoolKeys, jsonInfo2PoolKeys } from "@raydium-io/raydium-sdk";
import { Commitment, PublicKey, Connection } from '@solana/web3.js';

export async function getPoolKeys(quoteMint: string): Promise<LiquidityPoolKeys | null> {
    const connection = new Connection(process.env.HTTP_URL || '', {
      wsEndpoint: process.env.WSS_URL || '',
      // below is causing get transaction to fail
      // httpHeaders: { "x-session-hash": SESSION_HASH }
    });
    const poolId = await getPoolID(quoteMint, connection);
    // console.log(`Pool ID: ${poolId}`);
    const accountInfo = await connection.getAccountInfo(new PublicKey(poolId));
    // console.log(`Account Info:`, accountInfo);
      const decodedData = LIQUIDITY_STATE_LAYOUT_V4.decode(Buffer.from(accountInfo.data));
      // console.log('Decoded account data:', decodedData);
      // console.log('Decoded account data baseMint:', decodedData.baseMint.toString());
      const poolKeysJson = JSON.stringify(jsonInfo2PoolKeys(decodedData));
      const poolKeys = JSON.parse(poolKeysJson) as LiquidityPoolKeys;
      // console.log('Pool keys:', poolKeys);
      return poolKeys;
    }
  }

export async function getPoolID(baseString: string, connection: Connection): Promise<string | null> {
    let base = new PublicKey(baseString);
    const quote = new PublicKey(process.env.WSOL_ADDRESS);
    const commitment: Commitment = "processed";

    try {

        // First try with base
        const baseAccounts = await connection.getProgramAccounts(new PublicKey(process.env.RAYDIUM_LIQUIDITY_POOL_V4_ADDRESS), {
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
            return pubkey.toString();
        }

        // If base fails, try with quote
        const quoteAccounts = await connection.getProgramAccounts(new PublicKey(process.env.RAYDIUM_LIQUIDITY_POOL_V4_ADDRESS), {
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
            return pubkey.toString();
        }

        return null;
    } catch (error) {
        console.error("Error:", error);
        return null;
    }
}