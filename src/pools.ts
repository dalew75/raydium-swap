import 'dotenv/config';

import { LIQUIDITY_STATE_LAYOUT_V4 } from "@raydium-io/raydium-sdk";
import { Commitment, PublicKey, Connection } from '@solana/web3.js';

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