import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { Chain } from '@polymarket/clob-client';

dotenvConfig({ path: resolve(process.cwd(), '.env') });

const normalizeUrl = (url: string | undefined, fallback: string): string => {
  if (!url || url.trim().length === 0) {
    return fallback;
  }
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

const parseChain = (value: string | undefined): Chain => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return Chain.POLYGON;
  }
  if (parsed === Chain.AMOY || parsed === Chain.POLYGON) {
    return parsed;
  }
  return Chain.POLYGON;
};

const buildWsUrl = (): string => {
  const raw = process.env.WS_URL;
  const fallback = 'wss://ws-subscriptions-clob.polymarket.com';
  if (!raw) {
    return fallback;
  }
  return raw.replace(/\/$/, '');
};

const buildRtdsUrl = (): string => {
  const raw = process.env.RTDS_WS_URL;
  const fallback = 'wss://ws-live-data.polymarket.com/';
  if (!raw) {
    return fallback.replace(/\/$/, '');
  }
  return raw.replace(/\/$/, '');
};

export const appConfig = {
  clobHost: normalizeUrl(process.env.CLOB_API_URL, 'https://clob.polymarket.com'),
  dataHost: normalizeUrl(process.env.DATA_API_URL, 'https://data-api.polymarket.com'),
  gammaHost: normalizeUrl(process.env.GAMMA_API_URL, 'https://gamma-api.polymarket.com'),
  chainId: parseChain(process.env.CHAIN_ID),
  wsUrl: buildWsUrl(),
  rtdsUrl: buildRtdsUrl(),
  apiKey: process.env.CLOB_API_KEY,
  apiSecret: process.env.CLOB_SECRET,
  apiPassphrase: process.env.CLOB_PASS_PHRASE,
  privateKey: process.env.PK,
};
