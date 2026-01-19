import {config as dotenvConfig} from 'dotenv';
import {resolve} from 'path';
import {ethers, Wallet} from 'ethers';
import {AddressZero, Zero} from '@ethersproject/constants';
import {ClobClient, Chain} from '@polymarket/clob-client';
import {SignatureType} from '@polymarket/order-utils';
import {createLogger} from '../shared/utils/logger';
import {getChainContracts} from '../shared/config/contracts';
import {safeFactoryAbi} from '../shared/abi/safeFactoryAbi';
import {appConfig} from '../shared/config';

// 使用 CommonJS require 避免 tsconfig 未开启 resolveJsonModule 的限制
const exchangeAbi = require('@polymarket/order-utils/dist/abi/Exchange.json');

dotenvConfig({path: resolve(process.cwd(), '.env')});

const logger = createLogger('CreateProxyWallet');

const RPC_URL = process.env.RPC_URL || 'https://polygon-rpc.com';
const SAFE_FACTORY_ADDRESS = '0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b';
const SAFE_FACTORY_NAME = 'Polymarket Contract Proxy Factory';

type ProxyWalletType = 'gnosis-safe' | 'poly-proxy';

const parseArgs = () => {
    const typeRaw = (process.argv[2] || process.env.PROXY_WALLET_TYPE || 'gnosis-safe').toLowerCase();
    if (typeRaw !== 'gnosis-safe' && typeRaw !== 'poly-proxy') {
        logger.error('PROXY_WALLET_TYPE 仅支持 gnosis-safe 或 poly-proxy');
        process.exit(1);
    }
    const createOnChain = (process.env.CREATE_PROXY_ONCHAIN || '0').toLowerCase() === '1';
    const inputPrivateKey = process.argv[3] || process.env.PRIVATE_KEY;
    return {proxyType: typeRaw as ProxyWalletType, createOnChain, inputPrivateKey};
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

const createSafeCreateSignature = async (signer: Wallet, chainId: number): Promise<string> => {
    const domain = {
        name: SAFE_FACTORY_NAME,
        chainId,
        verifyingContract: SAFE_FACTORY_ADDRESS,
    };
    const types = {
        CreateProxy: [
            {name: 'paymentToken', type: 'address'},
            {name: 'payment', type: 'uint256'},
            {name: 'paymentReceiver', type: 'address'},
        ],
    };
    const values = {
        paymentToken: AddressZero,
        payment: Zero,
        paymentReceiver: AddressZero,
    };
    return signer._signTypedData(domain, types, values);
};

const deployGnosisSafe = async (signer: Wallet) => {
    const factory = new ethers.Contract(SAFE_FACTORY_ADDRESS, safeFactoryAbi, signer);
    const chainId = await signer.getChainId();
    const sig = await createSafeCreateSignature(signer, chainId);
    const split = ethers.utils.splitSignature(sig);

    const feeData = await signer.provider.getFeeData();
    const floor = ethers.utils.parseUnits('30', 'gwei');
    const maxFeePerGas = (feeData.maxFeePerGas?.gt(floor) ? feeData.maxFeePerGas : floor).mul(12).div(10);
    const maxPriorityFeePerGas = (feeData.maxPriorityFeePerGas?.gt(floor) ? feeData.maxPriorityFeePerGas : floor)
        .mul(12)
        .div(10);

    const tx = await factory.createProxy(AddressZero, Zero, AddressZero, split, {
        gasLimit: 500_000,
        maxFeePerGas,
        maxPriorityFeePerGas,
    });

    logger.info(`创建 Gnosis Safe 交易已发送: ${tx.hash}`);
    await tx.wait();
    logger.success('代理钱包已部署完成');
};

const main = async () => {
    const {proxyType, createOnChain, inputPrivateKey} = parseArgs();
    const host = appConfig.clobHost;
    const chainId = (appConfig.chainId ?? Chain.POLYGON) as number;

    const signer = inputPrivateKey ? new Wallet(inputPrivateKey) : Wallet.createRandom();
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = signer.connect(provider);

    if (inputPrivateKey) {
        logger.info('使用传入的私钥生成代理钱包');
    } else {
        logger.info('使用随机新私钥生成代理钱包');
    }
    logger.info(`新建 EOA: ${wallet.address}`);
    logger.info(`私钥: ${wallet.privateKey}`);

    const proxyWallet = await getProxyWalletAddress(wallet.address, chainId, proxyType);
    logger.info(`代理钱包类型: ${proxyType}`);
    logger.info(`代理钱包地址: ${proxyWallet}`);

    if (createOnChain) {
        if (proxyType !== 'gnosis-safe') {
            logger.warn('poly-proxy 暂不支持链上自动创建，请先在官网用 MagicLink 创建钱包');
        } else {
            const code = await provider.getCode(proxyWallet);
            if (code && code !== '0x') {
                logger.info('检测到代理钱包已部署，跳过链上创建');
            } else {
                const balance = await provider.getBalance(wallet.address);
                if (balance.isZero()) {
                    logger.warn('当前 EOA 余额为 0，无法链上部署 Gnosis Safe，请先转入少量 MATIC');
                } else {
                    await deployGnosisSafe(wallet);
                }
            }
        }
    } else {
        logger.info('未开启链上部署（可设置 CREATE_PROXY_ONCHAIN=1）');
    }

    const signatureType = proxyType === 'gnosis-safe' ? SignatureType.POLY_GNOSIS_SAFE : SignatureType.POLY_PROXY;
    const client = new ClobClient(host, chainId as Chain, signer, undefined, signatureType, proxyWallet);
    const creds = await client.createOrDeriveApiKey();

    logger.success('API Key 创建完成');
    logger.info(`CLOB_API_KEY=${creds.key}`);
    logger.info(`CLOB_SECRET=${creds.secret}`);
    logger.info(`CLOB_PASS_PHRASE=${creds.passphrase}`);
};

main().catch((err) => {
    logger.error('执行失败', err as Error);
    process.exit(1);
});
