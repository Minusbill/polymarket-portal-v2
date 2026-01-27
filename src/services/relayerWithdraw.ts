export type RelayerWithdrawInput = {
  privateKey: string;
  builderApiKey: string;
  builderSecret: string;
  builderPassphrase: string;
  relayerUrl?: string;
  toAddress: string;
  amount: number;
  tokenAddress?: string;
  logger?: (message: string) => void;
};

export const relayerWithdrawToken = async (input: RelayerWithdrawInput) => {
  const baseUrl = (import.meta as any).env?.VITE_RELAYER_SERVICE_URL || "";
  if (baseUrl) {
    const { submitSafeTransfer } = await import("./relayerSafeSubmit");
    return submitSafeTransfer({
      baseUrl,
      privateKey: input.privateKey,
      to: input.toAddress,
      amount: input.amount,
      token: input.tokenAddress,
      logger: input.logger,
    });
  }
  const endpoint = "/api/relayer-withdraw";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      privateKey: input.privateKey,
      builderApiKey: input.builderApiKey,
      builderSecret: input.builderSecret,
      builderPassphrase: input.builderPassphrase,
      relayerUrl: input.relayerUrl,
      to: input.toAddress,
      amount: input.amount,
      token: input.tokenAddress,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }
  if (data?.logs && input.logger) {
    data.logs.forEach((line: string) => input.logger?.(line));
  }
  return data?.transactionHash || "";
};
