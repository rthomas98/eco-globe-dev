"use client";

import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@eco-globe/ui";
import { useCart } from "./cart-context";
import Link from "next/link";

export function CartButton() {
  const { itemCount, setIsOpen } = useCart();

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="relative flex size-10 items-center justify-center rounded-full text-neutral-700 transition-colors hover:bg-neutral-100"
    >
      <ShoppingBag className="size-5" />
      {itemCount > 0 && (
        <span
          className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
          style={{ backgroundColor: "#378853" }}
        >
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </button>
  );
}

export function CartPanel() {
  const { items, removeItem, updateQuantity, subtotal, isOpen, setIsOpen } = useCart();
  const router = useRouter();
  const shipping = items.length > 0 ? 50 : 0;
  const total = subtotal + shipping;

  const handleCheckout = () => {
    setIsOpen(false);
    router.push("/buyer/checkout");
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/20" onClick={() => setIsOpen(false)} />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full flex-col bg-white shadow-2xl sm:w-[420px]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid #E0E0E0" }}>
          <div className="flex items-center gap-3">
            <ShoppingBag className="size-5 text-neutral-900" />
            <h2 className="text-lg font-bold text-neutral-900">
              Cart{" "}
              {items.length > 0 && (
                <span className="text-sm font-normal text-neutral-500">
                  ({items.length} {items.length === 1 ? "item" : "items"})
                </span>
              )}
            </h2>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-neutral-500 hover:text-neutral-900">
            <X className="size-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-16">
              <div className="flex size-16 items-center justify-center rounded-full bg-neutral-100">
                <ShoppingBag className="size-7 text-neutral-400" />
              </div>
              <p className="text-base font-medium text-neutral-900">Your cart is empty</p>
              <p className="text-center text-sm text-neutral-500">
                Browse the marketplace to find feedstocks
              </p>
              <Link href="/browse" onClick={() => setIsOpen(false)}>
                <Button variant="primary" size="md">Browse Listings</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 px-6 py-5">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg sm:h-20 sm:w-20">
                    <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium leading-5 text-neutral-900">{item.title}</p>
                        <p className="mt-0.5 text-xs text-neutral-500">{item.location}</p>
                      </div>
                      <button onClick={() => removeItem(item.id)} className="text-neutral-400 hover:text-red-500">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center rounded-full" style={{ border: "1px solid #E0E0E0" }}>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="flex size-7 items-center justify-center text-neutral-600"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="flex size-7 items-center justify-center text-neutral-600"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                      <p className="text-sm font-semibold text-neutral-900">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-4 pb-4 pt-3 sm:px-6 sm:pb-6 sm:pt-4" style={{ borderTop: "1px solid #E0E0E0" }}>
            <div className="mb-4 flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-700">Subtotal</span>
                <span className="text-neutral-900">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-700">Shipping estimate</span>
                <span className="text-neutral-900">${shipping.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 text-base font-bold" style={{ borderTop: "1px solid #F0F0F0" }}>
                <span className="text-neutral-900">Total</span>
                <span className="text-neutral-900">${total.toFixed(2)}</span>
              </div>
            </div>
            <Button variant="primary" size="lg" className="w-full" onClick={handleCheckout}>
              Proceed to Checkout
            </Button>
            <button
              onClick={() => setIsOpen(false)}
              className="mt-3 w-full text-center text-sm font-medium text-neutral-700 underline"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}
