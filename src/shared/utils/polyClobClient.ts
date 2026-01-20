import {Wallet} from 'ethers';
import {ClobClient, Chain} from '@polymarket/clob-client';
import {SignatureType} from '@polymarket/order-utils';
import {BuilderConfig} from '@polymarket/builder-signing-sdk';
import {appConfig} from '../config';


export type ApiCreds = {
    key: string;
    secret: string;
    passphrase: string;
};

export type BuilderCreds = {
    key: string;
    secret: string;
    passphrase: string;
};

export type CreateBaseParams = {
    privateKey: string;
    creds?: Partial<ApiCreds>;
    builderCreds?: Partial<BuilderCreds>;
};

export type CreateProxyParams = CreateBaseParams & {
    proxyWallet: string;
};

export class PolyClobClient {

    static createEoaClient(params: CreateBaseParams): ClobClient {
        const signer = new Wallet(params.privateKey);
        const host = appConfig.clobHost;
        const chainId = Chain.POLYGON;
        const creds = params.creds
            ? {
                key: params.creds.key ?? '',
                secret: params.creds.secret ?? '',
                passphrase: params.creds.passphrase ?? '',
            }
            : undefined;
        const builderConfig = params.builderCreds
            ? new BuilderConfig({
                localBuilderCreds: {
                    key: params.builderCreds.key ?? '',
                    secret: params.builderCreds.secret ?? '',
                    passphrase: params.builderCreds.passphrase ?? '',
                },
            })
            : undefined;

        return new ClobClient(host, chainId, signer, creds, undefined, undefined, undefined, undefined, builderConfig);
    }


    static createProxyClient(params: CreateProxyParams): ClobClient {
        const signer = new Wallet(params.privateKey);
        const host = appConfig.clobHost;
        const chainId = Chain.POLYGON;
        const creds = params.creds
            ? {
                key: params.creds.key ?? '',
                secret: params.creds.secret ?? '',
                passphrase: params.creds.passphrase ?? '',
            }
            : undefined;
        const builderConfig = params.builderCreds
            ? new BuilderConfig({
                localBuilderCreds: {
                    key: params.builderCreds.key ?? '',
                    secret: params.builderCreds.secret ?? '',
                    passphrase: params.builderCreds.passphrase ?? '',
                },
            })
            : undefined;
        return new ClobClient(
            host,
            chainId,
            signer,
            creds,
            SignatureType.POLY_GNOSIS_SAFE,
            params.proxyWallet,
            undefined,
            undefined,
            builderConfig,
        );
    }
}
