export const sortAsks = (rows: Array<{ price: number; size: number }>) =>
  rows.slice().sort((a, b) => Number(a.price) - Number(b.price));

export const sortBids = (rows: Array<{ price: number; size: number }>) =>
  rows.slice().sort((a, b) => Number(a.price) - Number(b.price));
