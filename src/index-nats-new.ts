import 'dotenv/config';
import RaydiumSwap from './RaydiumSwap'
import { Transaction, VersionedTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js'

let [tokenAAmountString, quoteMint] = process.argv.slice(2);

const swap = async (tokenMint: string, tokenAAmount: number) => {
  const executeSwap = false // Change to true to execute swap
  const useVersionedTransaction = true // Use versioned transaction

  let baseMint = 'So11111111111111111111111111111111111111112' // e.g. SOLANA mint address

  const raydiumSwap = new RaydiumSwap(process.env.RPC_URL, process.env.WALLET_PRIVATE_KEY);
  const publicKey = raydiumSwap.wallet.publicKey.toBase58();
  console.log(`Raydium swap initialized, executeSwap=${executeSwap}, using RPC URL: ${process.env.RPC_URL} and wallet: ${publicKey}`);

  // Loading with pool keys from https://api.raydium.io/v2/sdk/liquidity/mainnet.json
  await raydiumSwap.loadPoolKeys()
  const startTime = Date.now();
  await raydiumSwap.loadPoolKeys();
  const endTime = Date.now();
  console.log(`Loaded pool keys in ${endTime - startTime} milliseconds`);

  // Trying to find pool info in the json we loaded earlier and by comparing baseMint and tokenBAddress
  let poolInfo = raydiumSwap.findPoolInfoForTokens(baseMint, tokenMint)

  if (!poolInfo) poolInfo = await raydiumSwap.findRaydiumPoolInfo(baseMint, tokenMint)

  if (!poolInfo) {
    throw new Error("Couldn't find the pool info");
  }

  console.log('Found pool info', poolInfo)

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

swap(quoteMint, parseFloat(tokenAAmountString));
