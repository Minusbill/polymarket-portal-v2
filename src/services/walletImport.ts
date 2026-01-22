import { Wallet as EthersWallet } from "ethers";
import { normalizeIpValue, normalizeIndexValue } from "../utils/walletFormat";

export type ParsedWallet = {
  index: string;
  privateKey: string;
  address: string;
  ipName: string;
  ipEndpoint: string;
};

export const parseWalletImportText = (text: string, startIndex: number) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const header = lines[0]?.toLowerCase() || "";
  const hasHeader =
    header.includes("privatekey") || header.includes("ipname") || header.includes("ipendpoint") || header.includes("index");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  let invalidCount = 0;
  const wallets: ParsedWallet[] = [];
  dataLines.forEach((line, idx) => {
    const parts = line.split(",").map((part) => part.trim());
    const hasIndex = hasHeader || parts.length > 1;
    const rawIndex = hasIndex ? parts[0] || String(startIndex + idx) : String(startIndex + idx);
    const key = hasIndex ? parts[1] || "" : parts[0] || "";
    const ipNameRaw = hasIndex ? parts[2] || "" : parts[1] || "";
    const ipEndpointRaw = hasIndex ? parts.slice(3).join(",") : parts.slice(2).join(",");
    const ipName = normalizeIpValue(ipNameRaw);
    const ipEndpoint = normalizeIpValue(ipEndpointRaw);

    let address = "";
    try {
      address = new EthersWallet(key).address;
    } catch {
      invalidCount += 1;
      return;
    }

    wallets.push({
      index: normalizeIndexValue(rawIndex, String(startIndex + idx)),
      privateKey: key,
      address,
      ipName,
      ipEndpoint,
    });
  });

  return { wallets, invalidCount };
};
