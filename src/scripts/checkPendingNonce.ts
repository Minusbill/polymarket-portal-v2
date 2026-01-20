import {ethers} from 'ethers';
import {resolve} from 'path';
import {readFileSync} from 'fs';

type WalletRow = {
  privateKey: string;
  publicKey?: string;
};

const RPC_URL = process.env.RPC_URL || 'https://polygon.drpc.org';
const CONFIG_PATH = resolve(process.cwd(), 'src/shared/config/poly-wallet.json');

const main = async () => {
  const raw = readFileSync(CONFIG_PATH, 'utf-8');
  const wallets = JSON.parse(raw) as WalletRow[];
  if (!wallets.length || !wallets[0].privateKey) {
    throw new Error('poly-wallet.json 缺少 privateKey');
  }
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(wallets[0].privateKey, provider);

  const latest = await provider.getTransactionCount(wallet.address, 'latest');
  const pending = await provider.getTransactionCount(wallet.address, 'pending');

  console.log(`Address: ${wallet.address}`);
  console.log(`nonce (latest): ${latest}`);
  console.log(`nonce (pending): ${pending}`);
  if (pending > latest) {
    console.log('存在 pending 交易，可能卡住 nonce');
    const feeData = await provider.getFeeData();
    const floor = ethers.utils.parseUnits(process.env.REPLACE_GAS_GWEI || '300', 'gwei');
    const maxFeePerGas = (feeData.maxFeePerGas && feeData.maxFeePerGas.gt(floor)) ? feeData.maxFeePerGas : floor;
    const maxPriorityFeePerGas = (feeData.maxPriorityFeePerGas && feeData.maxPriorityFeePerGas.gt(floor))
      ? feeData.maxPriorityFeePerGas
      : floor;

    for (let nonce = latest; nonce < pending; nonce += 1) {
      try {
        console.log(`尝试替换 nonce=${nonce}`);
        const tx = await wallet.sendTransaction({
          to: wallet.address,
          value: 0,
          gasLimit: 21000,
          maxFeePerGas,
          maxPriorityFeePerGas,
          nonce,
        });
        console.log(`替换交易已发送 nonce=${nonce} hash=${tx.hash}`);
      } catch (err) {
        console.error(`替换 nonce=${nonce} 失败`, err);
      }
    }
  } else {
    console.log('未发现 pending 交易');
  }
};

main().catch((err) => {
  console.error('checkPendingNonce 失败', err);
  process.exit(1);
});
