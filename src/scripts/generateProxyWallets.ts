import {writeFileSync} from 'fs';
import {resolve} from 'path';
import {config as dotenvConfig} from 'dotenv';
import {ethers, Wallet} from 'ethers';
import {ClobClient, Chain} from '@polymarket/clob-client';
import {SignatureType} from '@polymarket/order-utils';
import {appConfig} from '../shared/config';
import {createLogger} from '../shared/utils/logger';
import {getChainContracts} from '../shared/config/contracts';

// 使用 CommonJS require 避免 tsconfig 未开启 resolveJsonModule 的限制
const exchangeAbi = require('@polymarket/order-utils/dist/abi/Exchange.json');

dotenvConfig({path: resolve(process.cwd(), '.env')});

const logger = createLogger('GenProxyWallets');
const OUTPUT_PATH = resolve(process.cwd(), 'src/config/poly-proxy-wallet.example.json');
const RPC_URL = process.env.RPC_URL || 'https://polygon-rpc.com';

type ProxyWalletType = 'poly-proxy' | 'gnosis-safe';

const parseArgs = () => {
    const countRaw = process.argv[2] || process.env.WALLET_GEN_COUNT || '1';
    const count = Number(countRaw);
    if (!Number.isFinite(count) || count <= 0) {
        logger.error('生成数量必须为正整数');
        process.exit(1);
    }
    const typeRaw = (process.argv[3] || process.env.PROXY_WALLET_TYPE || 'poly-proxy').toLowerCase();
    if (typeRaw !== 'poly-proxy' && typeRaw !== 'gnosis-safe') {
        logger.error('PROXY_WALLET_TYPE 仅支持 poly-proxy 或 gnosis-safe');
        process.exit(1);
    }
    return {count, proxyType: typeRaw as ProxyWalletType};
};

const getProxyWalletAddress = async (ownerAddress: string, chainId: number, proxyType: ProxyWalletType) => {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const contractConfig = getChainContracts(chainId);
    const exchange = new ethers.Contract(contractConfig.exchange, exchangeAbi, provider);
    if (proxyType === 'gnosis-safe') {
        return (await exchange.getSafeAddress(ownerAddress)) as string;
    }
    return (await exchange.getPolyProxyWalletAddress(ownerAddress)) as string;
};

const main = async () => {
    const {count, proxyType} = parseArgs();
    const host = appConfig.clobHost;
    const chainId = (appConfig.chainId ?? Chain.POLYGON) as number;

    logger.info(`开始生成 ${count} 个代理钱包并派生 CLOB API Key，类型=${proxyType} host=${host} chainId=${chainId}`);

    const results: Array<{
        privateKey: string;
        publickKey: string;
        proxyType: ProxyWalletType;
        proxyWallet: string;
        clobApiKey: string;
        clobSecret: string;
        clobPassPhrase: string;
    }> = [];

    for (let i = 0; i < count; i += 1) {
        const signer = Wallet.createRandom();
        const ownerAddress = signer.address;

        try {
            const proxyWallet = await getProxyWalletAddress(ownerAddress, chainId, proxyType);
            const signatureType =
                proxyType === 'gnosis-safe' ? SignatureType.POLY_GNOSIS_SAFE : SignatureType.POLY_PROXY;
            const client = new ClobClient(
                host,
                chainId as Chain,
                signer,
                undefined,
                signatureType,
                proxyWallet,
            );
            const creds = await client.createOrDeriveApiKey();

            results.push({
                privateKey: signer.privateKey,
                publickKey: ownerAddress,
                proxyType,
                proxyWallet,
                clobApiKey: creds.key,
                clobSecret: creds.secret,
                clobPassPhrase: creds.passphrase,
            });

            logger.success(`第 ${i + 1} 个完成，EOA=${ownerAddress} 代理钱包=${proxyWallet}`);
        } catch (err) {
            logger.error(`第 ${i + 1} 个钱包派生失败`, err as Error);
        }
    }

    writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2), {encoding: 'utf-8'});
    logger.success(`完成，输出文件: ${OUTPUT_PATH}`);
};

main().catch((err) => {
    logger.error('执行失败', err as Error);
    process.exit(1);
});
