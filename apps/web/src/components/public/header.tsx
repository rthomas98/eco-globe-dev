"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";
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

  const isHero = transparent && !scrolled;

  return (
    <header
      className={`fixed top-0 left-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "bg-white shadow-sm"
          : transparent
            ? "bg-transparent"
            : "bg-white shadow-sm"
      }`}
    >
      <div className="mx-auto max-w-[1440px] px-[135px]">
        <div className="flex h-20 items-center justify-between">
          {/* Left: Logo + hamburger (when scrolled) */}
          <div className="flex items-center gap-4">
            <Link href="/" className="shrink-0">
              <Image
                src="/logo.svg"
                alt="EcoGlobe"
                width={120}
                height={35}
                className={isHero ? "brightness-0 invert" : "invert"}
                priority
              />
            </Link>
          </div>

          {/* Center: Nav links (hero) or Search bar (scrolled) */}
          {isHero ? (
            <nav className="hidden items-center gap-8 md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-base font-medium text-white transition-colors hover:opacity-80"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          ) : scrolled ? (
            <div className="flex items-center rounded-full px-1 py-1" style={{ border: "1px solid #E0E0E0" }}>
              <input
                type="text"
                placeholder="Feedstocks"
                className="w-32 bg-transparent px-3 py-1.5 text-sm outline-none placeholder:text-neutral-500"
              />
              <div className="h-4 w-px bg-neutral-300" />
              <input
                type="text"
                placeholder="Location"
                className="w-28 bg-transparent px-3 py-1.5 text-sm outline-none placeholder:text-neutral-500"
              />
              <button className="flex size-8 items-center justify-center rounded-full bg-neutral-900 text-white">
                <Search className="size-3.5" />
              </button>
            </div>
          ) : null}

          {/* Right: Login/Sign Up */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="md"
              className={isHero ? "text-white" : "text-neutral-900"}
            >
              Login
            </Button>
            <Button
              variant={isHero ? "outline-white" : "secondary"}
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
