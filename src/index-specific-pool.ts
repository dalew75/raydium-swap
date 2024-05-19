import 'dotenv/config';
import { getPoolKeys } from './pools';

let [quoteMint] = process.argv.slice(2);

(async () => {
  const poolKeys = await getPoolKeys(quoteMint);
  console.log('Pool keys here:', poolKeys);
  console.log(`End of script`);
})();
