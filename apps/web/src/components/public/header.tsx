"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@eco-globe/ui";

const navLinks = [
  { label: "Services", href: "/services" },
  { label: "Sellers", href: "/sellers" },
  { label: "Buyers", href: "/buyers" },
  { label: "About", href: "/about" },
  { label: "Contact Us", href: "/contact" },
];

export function Header({ transparent = false }: { transparent?: boolean }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!transparent) return;
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [transparent]);

  const isLight = transparent && !scrolled;

  return (
    <header
      className={`fixed top-0 left-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "bg-neutral-900/95 backdrop-blur-md shadow-lg"
          : transparent
            ? "bg-transparent"
            : "bg-white shadow-sm"
      }`}
    >
      <div className="mx-auto max-w-[1440px] px-[135px]">
        <div className="flex h-20 items-center justify-between">
          <Link href="/" className="shrink-0">
            <Image
              src="/logo.svg"
              alt="EcoGlobe"
              width={120}
              height={35}
              className={
                isLight || scrolled
                  ? "brightness-0 invert"
                  : ""
              }
              priority
            />
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-base font-medium transition-colors hover:opacity-80 ${
                  isLight || scrolled ? "text-white" : "text-neutral-800"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="md"
              className={isLight || scrolled ? "text-white" : "text-neutral-900"}
            >
              Login
            </Button>
            <Button
              variant={isLight || scrolled ? "outline-white" : "secondary"}
              size="md"
            >
              Sign Up
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
