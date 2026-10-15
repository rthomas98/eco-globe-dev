interface CartLike<T> {
  items: T[];
  removeItem: (id: string) => void;
}

const noop = () => {};

/**
 * The buyer cart as the payments centre may use it. The standalone admin app
 * has no cart provider, and staff or seller views never show a buyer cart, so
 * only the buyer role reads it. A buyer view still requires the provider.
 */
export function paymentCenterCart<T>(role: "buyer" | "seller" | "admin", cart: CartLike<T> | null): CartLike<T> {
  if (role !== "buyer") return { items: [], removeItem: noop };
  if (!cart) throw new Error("useCart must be used within CartProvider");
  return { items: cart.items, removeItem: cart.removeItem };
}
