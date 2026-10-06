"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { mergeCartLine } from "@/lib/cart-lines";

export interface CartItem {
  /** Canonical backend listing id. */
  id: string;
  title: string;
  location: string;
  /** Recorded unit price in `currencyCode`. */
  price: number;
  currencyCode: string;
  /** Display suffix such as "/t". */
  unit: string;
  /** Recorded pricing unit code such as "ton". */
  quantityUnit: string;
  quantity: number;
  moq: number;
  /** Seller's recorded available quantity, or null when unknown. */
  available: number | null;
  sellerName: string | null;
  image: string | null;
}

interface CartContextType {
  items: CartItem[];
  /**
   * Adds to the cart. By default an existing line's quantity is increased;
   * with `exactQuantity` (Buy Now) the line is set to exactly this quantity.
   */
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }, options?: { exactQuantity?: boolean }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  /** Subtotals kept per recorded currency; currencies are never summed together. */
  subtotalsByCurrency: Record<string, number>;
  mixedCurrencies: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  /** False until the saved cart has been read from storage after mount. */
  hydrated: boolean;
}

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = "ecoglobe.cart";

function readStoredCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setItems(readStoredCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage may be unavailable (private mode); the cart still works in-memory.
    }
  }, [items, hydrated]);

  const addItem = useCallback(
    (newItem: Omit<CartItem, "quantity"> & { quantity?: number }, options?: { exactQuantity?: boolean }) => {
      setItems((prev) => mergeCartLine(prev, newItem, options));
      setIsOpen(true);
    },
    [],
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const floor = Math.max(i.moq, quantity);
        return { ...i, quantity: i.available !== null ? Math.min(floor, Math.max(i.moq, i.available)) : floor };
      }),
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotalsByCurrency = items.reduce<Record<string, number>>((acc, i) => {
    acc[i.currencyCode] = (acc[i.currencyCode] ?? 0) + i.price * i.quantity;
    return acc;
  }, {});
  const mixedCurrencies = Object.keys(subtotalsByCurrency).length > 1;

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, itemCount, subtotalsByCurrency, mixedCurrencies, isOpen, setIsOpen, hydrated }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
