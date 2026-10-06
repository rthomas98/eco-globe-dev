/**
 * Pure cart line merge used by the cart context. Add to Cart increases an
 * existing line; Buy Now (`exactQuantity`) sets the line to exactly the
 * chosen quantity, so repeating Buy Now never inflates the order.
 */

export interface CartLine {
  id: string;
  quantity: number;
  moq: number;
}

export function mergeCartLine<T extends CartLine>(
  lines: T[],
  item: Omit<T, "quantity"> & { quantity?: number },
  options?: { exactQuantity?: boolean },
): T[] {
  const existing = lines.find((line) => line.id === item.id);
  if (!existing) return [...lines, { ...item, quantity: item.quantity ?? item.moq } as T];
  return lines.map((line) => {
    if (line.id !== item.id) return line;
    if (options?.exactQuantity) return { ...line, ...item, quantity: item.quantity ?? existing.moq } as T;
    return { ...line, quantity: line.quantity + (item.quantity ?? existing.moq) };
  });
}
