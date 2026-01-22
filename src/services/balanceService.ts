import { ethers } from "ethers";

let POLYGON_RPCS = ["https://1rpc.io/matic"];
let activePolygonRpc: string | null = null;
const EXCHANGE_ADDRESS = "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E";
const EXCHANGE_ABI = [
  "function getSafeAddress(address owner) view returns (address)",
  "function getPolyProxyWalletAddress(address owner) view returns (address)",
];
const USDC_E_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const ERC20_ABI = ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"];

let rpcIndex = 0;
const rpcProviders = new Map<string, ethers.providers.JsonRpcProvider>();
const usdcContracts = new Map<string, ethers.Contract>();
let usdcDecimals: number | null = null;

const nextRpc = () => {
  if (activePolygonRpc) return activePolygonRpc;
  const url = POLYGON_RPCS[rpcIndex % POLYGON_RPCS.length];
  rpcIndex += 1;
  return url;
};

const getProxyProvider = () => {
  const rpcUrl = activePolygonRpc || POLYGON_RPCS[0];
  return (
    rpcProviders.get(rpcUrl) ||
    new ethers.providers.JsonRpcProvider(rpcUrl, { chainId: 137, name: "polygon" })
  );
};

export const getDefaultPolygonRpc = () => activePolygonRpc || POLYGON_RPCS[0];

export const setPolygonRpcList = (list: string[]) => {
  POLYGON_RPCS = list.length ? list : POLYGON_RPCS;
  if (activePolygonRpc && !POLYGON_RPCS.includes(activePolygonRpc)) {
    activePolygonRpc = POLYGON_RPCS[0];
  }
};

export const setActivePolygonRpc = (rpcUrl: string) => {
  if (!rpcUrl) {
    activePolygonRpc = null;
    return;
  }
  if (!POLYGON_RPCS.includes(rpcUrl)) {
    POLYGON_RPCS = [rpcUrl, ...POLYGON_RPCS];
  }
  activePolygonRpc = rpcUrl;
};

export const fetchUsdcEBalance = async (address: string) => {
  const rpcUrl = nextRpc();
  const provider =
    rpcProviders.get(rpcUrl) ||
    new ethers.providers.JsonRpcProvider(rpcUrl, {
      chainId: 137,
      name: "polygon",
    });
  rpcProviders.set(rpcUrl, provider);

  const contract = usdcContracts.get(rpcUrl) || new ethers.Contract(USDC_E_ADDRESS, ERC20_ABI, provider);
  usdcContracts.set(rpcUrl, contract);

  const validated = ethers.utils.getAddress(address);
  const [decimals, rawBalance] = await Promise.all([
    usdcDecimals ?? contract.decimals().catch(() => 6),
    contract.balanceOf(validated),
  ]);
  if (usdcDecimals === null && typeof decimals === "number") usdcDecimals = decimals;

  return Number(ethers.utils.formatUnits(rawBalance, decimals));
};

export const fetchProxyAddressOnChain = async (address: string) => {
  const owner = ethers.utils.getAddress(address);
  const provider = getProxyProvider();
  rpcProviders.set(activePolygonRpc || POLYGON_RPCS[0], provider);
  const exchange = new ethers.Contract(EXCHANGE_ADDRESS, EXCHANGE_ABI, provider);
  return exchange.getSafeAddress(owner);
};
