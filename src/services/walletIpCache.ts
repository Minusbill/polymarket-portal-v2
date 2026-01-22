import type { Wallet } from "../types";
import { normalizeIpValue } from "../utils/walletFormat";

export const readWalletIpCache = () => {
  if (typeof window === "undefined") return {} as Record<string, { name: string; endpoint: string }>;
  const mapRaw = localStorage.getItem("walletIpMap");
  return mapRaw ? (JSON.parse(mapRaw) as Record<string, { name: string; endpoint: string }>) : {};
};

export const applyWalletIpCache = (wallets: Wallet[]) => {
  const cached = readWalletIpCache();
  wallets.forEach((wallet) => {
    const entry = cached[wallet.address];
    if (entry && !wallet.ipName && !wallet.ipEndpoint) {
      wallet.ipName = normalizeIpValue(entry.name || "");
      wallet.ipEndpoint = normalizeIpValue(entry.endpoint || "");
    }
  });
};

export const buildWalletIpMap = (wallets: Wallet[]) => {
  return wallets.reduce<Record<string, { name: string; endpoint: string }>>((acc, wallet) => {
    if (wallet.ipName || wallet.ipEndpoint) {
      acc[wallet.address] = { name: wallet.ipName || "", endpoint: wallet.ipEndpoint || "" };
    }
    return acc;
  }, {});
};

export const saveWalletIpMap = (map: Record<string, { name: string; endpoint: string }>) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("walletIpMap", JSON.stringify(map));
};
