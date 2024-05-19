import 'dotenv/config';
import RaydiumSwap from './RaydiumSwap'
import { Transaction, VersionedTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js'

let [tokenAAmountString, quoteMint, dynamic] = process.argv.slice(2);
const executeSwap = false // Change to true to execute swap
const useVersionedTransaction = true // Use versioned transaction
const baseMint = 'So11111111111111111111111111111111111111112' // e.g. SOLANA mint address

const swap = async (tokenMint: string, tokenAAmount: number, getPoolInfoDynamically: boolean = false) => {
  const raydiumSwap = new RaydiumSwap(process.env.RPC_URL, process.env.WALLET_PRIVATE_KEY);
  const publicKey = raydiumSwap.wallet.publicKey.toBase58();
  console.log(`Raydium swap initialized, executeSwap=${executeSwap}, using RPC URL: ${process.env.RPC_URL} and wallet: ${publicKey}`);

  // Loading with pool keys from https://api.raydium.io/v2/sdk/liquidity/mainnet.json
  const startTime = Date.now();
  await raydiumSwap.loadPoolKeys();
  console.log(`Loaded pool keys in ${Date.now() - startTime} milliseconds`);

  let poolInfo = raydiumSwap.findPoolInfoForTokens(baseMint, tokenMint)
  if ( poolInfo ) {
    console.log(`Loaded pool info from pools.json in ${Date.now() - startTime} milliseconds`);
  }
  else {
    const startTime2 = Date.now();
    poolInfo = await raydiumSwap.findRaydiumPoolInfo(baseMint, tokenMint);
    console.log(`Loaded pool info on the spot in ${Date.now() - startTime2} milliseconds`);
  }

  return;

  const tx = await raydiumSwap.getSwapTransaction(
    tokenMint,
    tokenAAmount,
    poolInfo,
    0.001 * LAMPORTS_PER_SOL, // Prioritization fee, now set to (0.0005 SOL)
    useVersionedTransaction,
    'in',
    300 // Slippage
  )

  if (executeSwap) {
    const txid = useVersionedTransaction
      ? await raydiumSwap.sendVersionedTransaction(tx as VersionedTransaction)
      : await raydiumSwap.sendLegacyTransaction(tx as Transaction)

    console.log(`https://solscan.io/tx/${txid}`)
  } else {
    const simRes = useVersionedTransaction
      ? await raydiumSwap.simulateVersionedTransaction(tx as VersionedTransaction)
      : await raydiumSwap.simulateLegacyTransaction(tx as Transaction)

    console.log('Simulated transaction', simRes);
  }
}

swap(quoteMint, parseFloat(tokenAAmountString), dynamic === 'true');
