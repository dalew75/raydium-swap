import RaydiumSwap from './RaydiumSwap'
import { Transaction, VersionedTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { connect, NatsConnection, StringCodec } from 'nats';

let [quoteMint, tokenAAmountString] = process.argv.slice(2);

const sc = StringCodec();
let nc: NatsConnection;

let raydiumSwap: RaydiumSwap;

async function loadRaydium() {
  raydiumSwap = new RaydiumSwap(process.env.RPC_URL, process.env.WALLET_PRIVATE_KEY);
  const publicKey = raydiumSwap.wallet.publicKey.toBase58();

  // Loading with pool keys from https://api.raydium.io/v2/sdk/liquidity/mainnet.json
  await raydiumSwap.loadPoolKeys()
  const startTime = Date.now();
  const endTime = Date.now();
  console.log(`Loaded pool keys in ${endTime - startTime} milliseconds`);

  console.log(`Raydium swap initialized, using RPC URL: ${process.env.RPC_URL} and wallet: ${publicKey}`);
}

async function initNatsListener(): Promise<void> {
  nc = await connect({ servers: 'nats://167.172.56.2:4222' });
  console.log("connected to nats");

  const sub = nc.subscribe("hello");
  (async () => {
    for await (const m of sub) {
      const decodedData = sc.decode(m.data);
      try {
        const parsedData = JSON.parse(decodedData);
        console.log(`[${sub.getProcessed()}]:`, parsedData);
        // swap(parsedData.quoteMint,parsedData.baseMint,parsedData.amount);
        swap(parsedData.quoteMint, parsedData.baseMint, parseFloat('0.01'));
      } catch (error) {
        console.log(`[${sub.getProcessed()}]: ${decodedData}`);
      }
    }
    console.log("subscription closed");
  })();
}


const swap = async (tokenMint: string, baseMint: string, tokenAAmount: number) => {
  console.log(`Swapping ${tokenAAmount} of ${baseMint} for ${tokenMint}`);
  const executeSwap = true // Change to true to execute swap
  const useVersionedTransaction = true // Use versioned transaction

  const publicKey = raydiumSwap.wallet.publicKey.toBase58();

  // Trying to find pool info in the json we loaded earlier and by comparing baseMint and tokenBAddress
  let poolInfo = raydiumSwap.findPoolInfoForTokens(baseMint, quoteMint)

  if (!poolInfo) poolInfo = await raydiumSwap.findRaydiumPoolInfo(baseMint, quoteMint)

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
      console.log(`EXECUTED SWAP! https://dexscreener.com/solana/${tokenMint}`);
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

loadRaydium();
if (quoteMint && tokenAAmountString) {
  swap(quoteMint, 'So11111111111111111111111111111111111111112', parseFloat(tokenAAmountString));

}
else {
  initNatsListener();
}

//swap(quoteMint, 'So11111111111111111111111111111111111111112', parseFloat(tokenAAmountString));
