"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, Menu, X } from "lucide-react";
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
  const [headerQuery, setHeaderQuery] = useState("");
  const [headerLocation, setHeaderLocation] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!transparent) return;
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [transparent]);

  const isHero = transparent && !scrolled;

  const handleHeaderSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (headerQuery) params.set("q", headerQuery);
    if (headerLocation) params.set("location", headerLocation);
    router.push(`/browse${params.toString() ? `?${params}` : ""}`);
  };

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
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[135px]">
        <div className="flex h-20 items-center justify-between">
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
            <form onSubmit={handleHeaderSearch} className="hidden items-center rounded-full px-1 py-1 md:flex" style={{ border: "1px solid #E0E0E0" }}>
              <input
                type="text"
                value={headerQuery}
                onChange={(e) => setHeaderQuery(e.target.value)}
                placeholder="Feedstocks"
                className="w-20 sm:w-32 bg-transparent px-3 py-1.5 text-sm outline-none placeholder:text-neutral-500"
              />
              <div className="h-4 w-px bg-neutral-300" />
              <input
                type="text"
                value={headerLocation}
                onChange={(e) => setHeaderLocation(e.target.value)}
                placeholder="Location"
                className="w-20 sm:w-32 bg-transparent px-3 py-1.5 text-sm outline-none placeholder:text-neutral-500"
              />
              <button type="submit" className="flex size-8 items-center justify-center rounded-full bg-neutral-900 text-white">
                <Search className="size-3.5" />
              </button>
            </form>
          ) : (
            <nav className="hidden items-center gap-8 md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-base font-medium text-neutral-800 transition-colors hover:opacity-80"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-3">
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="md"
                  className={isHero ? "text-white" : "text-neutral-900"}
                >
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  variant={isHero ? "outline-white" : "secondary"}
                  size="md"
                >
                  Sign Up
                </Button>
              </Link>
            </div>
            <button
              className="md:hidden flex items-center justify-center"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className={`size-6 ${isHero ? "text-white" : "text-neutral-900"}`} />
              ) : (
                <Menu className={`size-6 ${isHero ? "text-white" : "text-neutral-900"}`} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white shadow-lg">
          <div className="px-4 py-6 flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-base font-medium text-neutral-800 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="h-px w-full bg-neutral-200" />
            <div className="flex flex-col gap-3 pt-2">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" size="md" className="text-neutral-900 w-full">
                  Login
                </Button>
              </Link>
              <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="secondary" size="md" className="w-full">
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
