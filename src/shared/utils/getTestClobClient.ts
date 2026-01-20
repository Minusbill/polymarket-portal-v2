import {readFileSync} from 'fs';
import {resolve} from 'path';
import {PolyClobClient, type CreateProxyParams} from './polyClobClient';

type WalletRow = {
    privateKey: string;
    proxyPublicKey?: string;
    clobApiKey: string;
    clobSecret: string;
    clobPassPhrase: string;
};

export async function getTestClobClient() {
    const configPath = 'src/shared/config/poly-wallet.json';
    const raw = readFileSync(configPath, 'utf-8');
    const wallets = JSON.parse(raw) as WalletRow[];
    if (!wallets.length) {
        throw new Error('poly-wallet.json 为空');
    }
    const item = wallets[0];
    if (!item.privateKey || !item.proxyPublicKey) {
        throw new Error('poly-wallet.json 缺少 privateKey 或 proxyPublicKey');
    }

    const proxyClientParam: CreateProxyParams = {
        privateKey: item.privateKey,
        proxyWallet: item.proxyPublicKey,
        creds: {
            key: item.clobApiKey,
            secret: item.clobSecret,
            passphrase: item.clobPassPhrase,
        },
    };

    return {
        client: PolyClobClient.createProxyClient(proxyClientParam),
        wallet: item,
    };
}


