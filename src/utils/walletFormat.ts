export const normalizeIpValue = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "无") return "";
  return trimmed;
};

export const normalizeIndexValue = (value: string, fallback: string) => {
  const trimmed = String(value || "").trim();
  return trimmed || fallback;
};
