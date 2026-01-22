import {config as dotenvConfig} from 'dotenv';
import {resolve} from 'path';
import fs from 'fs';
import {RelayClient, RelayerTxType} from '@polymarket/builder-relayer-client';
import {BuilderConfig} from '@polymarket/builder-signing-sdk';
import {createWalletClient, encodeFunctionData, http, maxUint256, parseUnits} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {polygon} from 'viem/chains';
import {createLogger} from './logger';
import {getChainContracts} from '../config/contracts';

dotenvConfig({path: resolve(process.cwd(), '.env')});

type WalletItem = {
    privateKey: string;
    publicKey: string;
    proxyPublicKey?: string;
    builderApiKey?: string;
    builderSecret?: string;
    builderPassPhrase?: string;
};

const DEFAULT_JSON = resolve(process.cwd(), 'src/shared/config/poly-wallet.json');
const RPC_URL = process.env.RPC_URL || 'https://polygon.drpc.org';
const RELAYER_URL = process.env.POLY_RELAYER_URL || 'https://relayer-v2.polymarket.com/';
const CHAIN_ID = 137;
const chainContracts = getChainContracts(CHAIN_ID);
const USDCe_ADDRESS = chainContracts.collateral;
const USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const USDT_ADDRESS = '0xC2132D05D31c914a87C6611C10748aEB04B58e8F';
const logger = createLogger('RelayerApproveTransfer');

const erc20Abi = [
    {
        name: 'approve',
        type: 'function',
        inputs: [
            {name: 'spender', type: 'address'},
            {name: 'amount', type: 'uint256'},
        ],
        outputs: [{type: 'bool'}],
    },
    {
        name: 'transfer',
        type: 'function',
        inputs: [
            {name: 'to', type: 'address'},
            {name: 'amount', type: 'uint256'},
        ],
        outputs: [{type: 'bool'}],
    },
] as const;

const loadWallets = (filePath: string): WalletItem[] => {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as WalletItem[];
};

const normalizePrivateKey = (value: string): `0x${string}` => {
    if (!value) {
        throw new Error('privateKey 为空');
    }
    return (value.startsWith('0x') ? value : `0x${value}`) as `0x${string}`;
};

const buildClient = (wallet: WalletItem) => {
    if (!wallet.builderApiKey || !wallet.builderSecret || !wallet.builderPassPhrase) {
        throw new Error('缺少 builderApiKey/builderSecret/builderPassPhrase');
    }

    const account = privateKeyToAccount(normalizePrivateKey(wallet.privateKey));
    const walletClient = createWalletClient({
        account,
        chain: polygon,
        transport: http(RPC_URL),
    });

    const builderConfig = new BuilderConfig({
        localBuilderCreds: {
            key: wallet.builderApiKey,
            secret: wallet.builderSecret,
            passphrase: wallet.builderPassPhrase,
        },
    });

    return {
        client: new RelayClient(RELAYER_URL, CHAIN_ID, walletClient, builderConfig, RelayerTxType.SAFE),
        account,
    };
};

const approveToken = async (client: RelayClient, token: string, spender: string) => {
    const approveTx = {
        to: token,
        data: encodeFunctionData({
            abi: erc20Abi,
            functionName: 'approve',
            args: [spender, maxUint256],
        }),
        value: '0',
    };

    const response = await client.execute([approveTx], 'Approve Token');
    const result = await response.wait();
    logger.info(`approve 完成: ${result?.transactionHash || '无 hash'}`);
};

const resolveSpender = (value: string | undefined) => {
    if (!value) return '';
    const normalized = value.toLowerCase();
    const presetMap: Record<string, string> = {
        ctf: chainContracts.conditionalTokens,
        exchange: chainContracts.exchange,
        'neg-risk-exchange': chainContracts.negRiskExchange,
        'neg-risk-adapter': chainContracts.negRiskAdapter,
    };
    return presetMap[normalized] || value;
};

const resolveToken = (value: string | undefined) => {
    if (!value) return USDCe_ADDRESS;
    const normalized = value.toLowerCase();
    const tokenMap: Record<string, string> = {
        'usdc.e': USDCe_ADDRESS,
        usdce: USDCe_ADDRESS,
        usdc: USDC_ADDRESS,
        usdt: USDT_ADDRESS,
    };
    if (tokenMap[normalized]) {
        return tokenMap[normalized];
    }
    if (value.startsWith('0x') && value.length === 42) {
        return value;
    }
    throw new Error(`未知 token: ${value}`);
};

const transferToken = async (client: RelayClient, token: string, to: string, amount: string) => {
    const transferTx = {
        to: token,
        data: encodeFunctionData({
            abi: erc20Abi,
            functionName: 'transfer',
            args: [to, parseUnits(amount, 6)],
        }),
        value: '0',
    };

    const response = await client.execute([transferTx], 'Transfer Token');
    const result = await response.wait();
    logger.info(`transfer 完成: ${result?.transactionHash || '无 hash'}`);
};

const main = async () => {
    const action = (process.argv[2] || '').toLowerCase();
    const arg1 = process.argv[3];
    const arg2 = process.argv[4];
    const arg3 = process.argv[5];

    if (!action || !['approve', 'transfer', 'withdraw-eoa'].includes(action)) {
        logger.error('用法: npx tsx src/shared/utils/relayerApproveTransfer.ts approve <spender|ctf|exchange|neg-risk-exchange|neg-risk-adapter> [token]');
        logger.error('   或: npx tsx src/shared/utils/relayerApproveTransfer.ts transfer <to> <amount> [token]');
        logger.error('   或: npx tsx src/shared/utils/relayerApproveTransfer.ts withdraw-eoa <amount> [token]');
        process.exit(1);
    }

    const wallets = loadWallets(DEFAULT_JSON);
    if (wallets.length === 0) {
        throw new Error('poly-wallet.json 为空');
    }

    const {client, account} = buildClient(wallets[0]);

    if (action === 'approve') {
        const spender = resolveSpender(arg1);
        if (!spender) {
            throw new Error('approve 缺少 spender 地址');
        }
        const token = resolveToken(arg2);
        await approveToken(client, token, spender);
        return;
    }

    if (action === 'withdraw-eoa') {
        if (!arg1) {
            throw new Error('withdraw-eoa 缺少 amount');
        }
        const token = resolveToken(arg2);
        await transferToken(client, token, account.address, arg1);
        return;
    }

    if (!arg1 || !arg2) {
        throw new Error('transfer 缺少 to 或 amount');
    }
    const token = resolveToken(arg3);
    await transferToken(client, token, arg1, arg2);
};

main().catch((err) => {
    logger.error('执行失败', err);
    process.exit(1);
});
