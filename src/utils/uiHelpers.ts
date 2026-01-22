export const formatU = (price: number, size: number) => (price * size).toFixed(2);

export const depthWidth = (size: number, rows: Array<{ price: number; size: number }>) => {
  const max = Math.max(...rows.map((row) => row.size), 1);
  return `${Math.min(100, (size / max) * 100).toFixed(2)}%`;
};
