import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { CartProvider } from "@/components/cart/cart-context";
import { CartPanel } from "@/components/cart/cart-panel";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EcoGlobe - Feedstock Marketplace",
  description:
    "Connect with feedstock sellers and buyers on the EcoGlobe marketplace",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <CartProvider>
          {children}
          <CartPanel />
        </CartProvider>
      </body>
    </html>
  );
}
