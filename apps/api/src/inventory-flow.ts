import { StockTransactionType } from "@prisma/client";

export function nextStockQuantity(
  current: number,
  type: StockTransactionType,
  quantity: number,
) {
  if (type === StockTransactionType.STOCK_IN) return current + quantity;
  if (type === StockTransactionType.STOCK_OUT) return current - quantity;
  return quantity;
}
