import 'dotenv/config';
import RaydiumSwap from './RaydiumSwap'
import { Transaction, VersionedTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { subscribe, initNats } from './nats';

let [quoteMint, tokenAAmountString] = process.argv.slice(2);

let raydiumSwap: RaydiumSwap;

let poolKeys: any;

async function loadRaydium() {
  raydiumSwap = new RaydiumSwap(process.env.RPC_URL, process.env.WALLET_PRIVATE_KEY);
  const publicKey = raydiumSwap.wallet.publicKey.toBase58();

  const startTime = Date.now();

  // Loading with pool keys from https://api.raydium.io/v2/sdk/liquidity/mainnet.json
  poolKeys = await raydiumSwap.loadPoolKeys()
  
  const endTime = Date.now();
  console.log(`Loaded ${poolKeys.length} pool keys in ${endTime - startTime} milliseconds`);

  console.log(`Raydium swap initialized, using RPC URL: ${process.env.RPC_URL} and wallet: ${publicKey}`);
}

async function initNatsListener(): Promise<void> {
  await initNats(true);
  subscribe("hello", (msg) => {
    console.log("Received message: ", msg);
    const parsedData = JSON.parse(msg);
    console.log(`incoming msg on hello: `, parsedData);
    swap(parsedData.quoteMint, parsedData.baseMint, parseFloat('0.01'));
  });

  subscribe("priceCheck", (msg) => {
    console.log("Received message: ", msg);
    const parsedData = JSON.parse(msg);
    console.log(`incoming msg on priceCheck: `, parsedData);
    console.log(poolKeys);
    // const poolInfo = await Liquidity.fetchInfo({ connection: this.connection, poolKeys })
    // const price = Liquidity.getRate(poolInfo)
    // console.log(poolKeys);
  });
}


const swap = async (tokenMint: string, baseMint: string, tokenAAmount: number) => {
  console.log(`Swapping ${tokenAAmount} of ${baseMint} for ${tokenMint}`);
  const executeSwap = false // Change to true to execute swap
  const useVersionedTransaction = true // Use versioned transaction

  const publicKey = raydiumSwap.wallet.publicKey.toBase58();
  console.log(`Raydium swap initialized, executeSwap=${executeSwap}, using RPC URL: ${process.env.RPC_URL} and wallet: ${publicKey}`);

  // Trying to find pool info in the json we loaded earlier and by comparing baseMint and tokenBAddress
  let poolInfo = raydiumSwap.findPoolInfoForTokens(baseMint, tokenMint)

  if (!poolInfo) poolInfo = await raydiumSwap.findRaydiumPoolInfo(baseMint, tokenMint)

  if (!poolInfo) {
    throw new Error("Couldn't find the pool info");
  }

  console.log('Found pool info', poolInfo)

  const tx = await raydiumSwap.getSwapTransaction(
    quoteMint,
    tokenAAmount,
    poolInfo,
    0.0005 * LAMPORTS_PER_SOL, // Prioritization fee, now set to (0.0005 SOL)
    useVersionedTransaction,
    'in',
    300 // Slippage
  )

  if (executeSwap) {
    try {
      console.log(`------ about to send versioned tx`)
      const txid = useVersionedTransaction
        ? await raydiumSwap.sendVersionedTransaction(tx as VersionedTransaction)
        : await raydiumSwap.sendLegacyTransaction(tx as Transaction)

      console.log(`EXECUTED SWAP! https://solscan.io/tx/${txid}`);
      console.log(`EXECUTED SWAP! https://dexscreener.com/solana/${tokenMint}?maker=${publicKey}`);
    } catch (error) {
      console.error('Error executing swap:', error);
      console.log('Retrying in 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Retrying swap...');
      await swap(tokenMint, baseMint, tokenAAmount);
    }

  } else {
    const simRes = useVersionedTransaction
      ? await raydiumSwap.simulateVersionedTransaction(tx as VersionedTransaction)
      : await raydiumSwap.simulateLegacyTransaction(tx as Transaction)

    console.log('Simulated transaction', simRes);
  }
}

(async () => {
  loadRaydium();
  if (quoteMint && tokenAAmountString) {
    swap(quoteMint, 'So11111111111111111111111111111111111111112', parseFloat(tokenAAmountString));

  }
  else {
    initNatsListener();
  }
})();
