export const maskAddress = (addr: string) => {
  if (!addr) return "-";
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
};

export const parseSlug = (input: string) => {
  if (!input) return "";
  if (!input.includes("/")) return input.trim();
  try {
    const url = new URL(input);
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  } catch {
    const parts = input.split("/").filter(Boolean);
    return parts[parts.length - 1] || input.trim();
  }
};
