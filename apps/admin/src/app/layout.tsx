import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EcoGlobe Admin",
  description:
    "EcoGlobe platform administration for users, transactions, disputes, compliance, and system configuration.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
