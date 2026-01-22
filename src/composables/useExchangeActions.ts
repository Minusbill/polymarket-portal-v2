import type { Ref } from "vue";

type ExchangeConfig = {
  name: string;
  apiKey: string;
  apiSecret: string;
};

type Dependencies = {
  exchangeConfig: ExchangeConfig;
  exchangeAssets: Ref<Array<{ coin: string; free: string; withdrawEnable: boolean }>>;
  exchangeAssetsLoading: Ref<boolean>;
  exchangeAssetsStatus: Ref<string>;
  exchangePublicIp: Ref<string>;
  exchangePublicIpLoading: Ref<boolean>;
  fetchPublicIp: () => Promise<string>;
  fetchBinanceAssets: (input: { apiKey: string; apiSecret: string }) => Promise<any[]>;
};

export const useExchangeActions = (deps: Dependencies) => {
  const loadExchangePublicIp = async () => {
    if (deps.exchangePublicIpLoading.value) return;
    deps.exchangePublicIpLoading.value = true;
    try {
      deps.exchangePublicIp.value = await deps.fetchPublicIp();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      deps.exchangePublicIp.value = "";
      deps.exchangeAssetsStatus.value = `外网IP获取失败：${message}`;
    } finally {
      deps.exchangePublicIpLoading.value = false;
    }
  };

  const loadExchangeAssets = async () => {
    if (deps.exchangeAssetsLoading.value) return;
    if (deps.exchangeConfig.name !== "binance") {
      deps.exchangeAssetsStatus.value = "请先选择 Binance 交易所。";
      return;
    }
    if (!deps.exchangeConfig.apiKey.trim() || !deps.exchangeConfig.apiSecret.trim()) {
      deps.exchangeAssetsStatus.value = "请先填写 Binance API Key 与 Secret。";
      return;
    }
    deps.exchangeAssetsLoading.value = true;
    deps.exchangeAssetsStatus.value = "查询中...";
    try {
      const data = await deps.fetchBinanceAssets({
        apiKey: deps.exchangeConfig.apiKey.trim(),
        apiSecret: deps.exchangeConfig.apiSecret.trim(),
      });
      const targetCoins = new Set(["USDT", "USDC"]);
      const filtered = data
        .filter((item: any) => targetCoins.has(String(item?.coin || "").toUpperCase()))
        .map((item: any) => ({
          coin: String(item?.coin || ""),
          free: String(item?.free ?? item?.available ?? "0"),
          withdrawEnable: Boolean(item?.withdrawEnable),
        }));
      deps.exchangeAssets.value = filtered;
      deps.exchangeAssetsStatus.value = filtered.length ? "查询成功。" : "未查询到 USDT/USDC 资产。";
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      deps.exchangeAssetsStatus.value = `查询失败：${message}`;
    } finally {
      deps.exchangeAssetsLoading.value = false;
    }
  };

  return {
    loadExchangePublicIp,
    loadExchangeAssets,
  };
};
