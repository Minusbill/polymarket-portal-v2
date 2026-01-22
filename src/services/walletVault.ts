import { Wallet as EthersWallet } from "ethers";
import type { Wallet } from "../types";
import { normalizeIpValue } from "../utils/walletFormat";

const bufferToBase64 = (buffer: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
const base64ToBuffer = (value: string) =>
  Uint8Array.from(atob(value), (c) => c.charCodeAt(0)).buffer;

const importVaultKey = async (keyBytes: Uint8Array) =>
  crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt", "decrypt"]);

const ensureVaultKey = async () => {
  const stored = localStorage.getItem("walletVaultKey");
  if (stored) return new Uint8Array(base64ToBuffer(stored));
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  localStorage.setItem("walletVaultKey", bufferToBase64(keyBytes.buffer));
  return keyBytes;
};

const encryptVault = async (keyBytes: Uint8Array, payload: unknown) => {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importVaultKey(keyBytes);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(JSON.stringify(payload))
  );
  return {
    v: 1,
    iv: bufferToBase64(iv.buffer),
    data: bufferToBase64(ciphertext),
  };
};

export const decryptVault = async (keyBytes: Uint8Array, vault: { iv: string; data: string }) => {
  const dec = new TextDecoder();
  const iv = new Uint8Array(base64ToBuffer(vault.iv));
  const key = await importVaultKey(keyBytes);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    base64ToBuffer(vault.data)
  );
  return JSON.parse(dec.decode(plaintext));
};

export const saveVault = async (wallets: Wallet[]) => {
  if (typeof window === "undefined") return;
  const payload = wallets.map((wallet) => ({
    index: wallet.index,
    privateKey: wallet.privateKey || "",
    ipName: wallet.ipName || "",
    ipEndpoint: wallet.ipEndpoint || "",
    proxyAddress: wallet.proxyAddress || "",
  }));
  const keyBytes = await ensureVaultKey();
  const encrypted = await encryptVault(keyBytes, { wallets: payload });
  localStorage.setItem("walletVault", JSON.stringify(encrypted));
};

export const hydrateWalletsFromVault = (
  wallets: Wallet[],
  vaultData: { wallets?: Array<{ privateKey: string; ipName: string; ipEndpoint: string; index?: string }> }
) => {
  const items = vaultData.wallets || [];
  wallets.splice(0, wallets.length);
  let invalidCount = 0;
  items.forEach((item, idx) => {
    try {
      const address = new EthersWallet(item.privateKey).address;
      const index = item.index && String(item.index).trim() ? String(item.index) : String(idx + 1);
      wallets.push({
        id: `w-${idx + 1}`,
        index,
        nickname: `Wallet ${index}`,
        address,
        privateKey: item.privateKey,
        balance: null,
        enabled: true,
        ipName: normalizeIpValue(item.ipName || ""),
        ipEndpoint: normalizeIpValue(item.ipEndpoint || ""),
        proxyAddress: item.proxyAddress || "",
        volume: null,
        pnl: null,
        selected: true,
      });
    } catch {
      invalidCount += 1;
    }
  });
  return invalidCount;
};

export const getStoredVaultKey = () => {
  const stored = localStorage.getItem("walletVaultKey");
  if (!stored) return null;
  const bytes = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
  return new Uint8Array(bytes);
};
