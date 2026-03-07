interface CartProduct {
  productId: number;
  quantity: number;
  prices: Record<string, number | null>; // storeId -> price
}

interface StoreSummary {
  storeId: string;
  total: number;
  itemCount: number;
  missingCount: number;
}

interface OptimalSplitItem {
  productId: number;
  storeId: string;
  price: number;
  quantity: number;
}

interface OptimalSplit {
  items: OptimalSplitItem[];
  total: number;
  storeBreakdown: Record<string, { total: number; itemCount: number }>;
}

export function calculateBestSingleStore(
  cart: CartProduct[],
  storeIds: string[]
): StoreSummary[] {
  return storeIds
    .map((storeId) => {
      let total = 0;
      let itemCount = 0;
      let missingCount = 0;

      for (const item of cart) {
        const price = item.prices[storeId];
        if (price != null) {
          total += price * item.quantity;
          itemCount++;
        } else {
          missingCount++;
        }
      }

      return { storeId, total, itemCount, missingCount };
    })
    .sort((a, b) => {
      // Sort by fewest missing first, then cheapest
      if (a.missingCount !== b.missingCount) return a.missingCount - b.missingCount;
      return a.total - b.total;
    });
}

export function calculateOptimalSplit(
  cart: CartProduct[],
  storeIds: string[]
): OptimalSplit {
  const items: OptimalSplitItem[] = [];
  let total = 0;
  const storeBreakdown: Record<string, { total: number; itemCount: number }> = {};

  for (const storeId of storeIds) {
    storeBreakdown[storeId] = { total: 0, itemCount: 0 };
  }

  for (const item of cart) {
    let bestStoreId: string | null = null;
    let bestPrice = Infinity;

    for (const storeId of storeIds) {
      const price = item.prices[storeId];
      if (price != null && price < bestPrice) {
        bestPrice = price;
        bestStoreId = storeId;
      }
    }

    if (bestStoreId && bestPrice < Infinity) {
      const lineTotal = bestPrice * item.quantity;
      items.push({
        productId: item.productId,
        storeId: bestStoreId,
        price: bestPrice,
        quantity: item.quantity,
      });
      total += lineTotal;
      storeBreakdown[bestStoreId].total += lineTotal;
      storeBreakdown[bestStoreId].itemCount++;
    }
  }

  return { items, total, storeBreakdown };
}
