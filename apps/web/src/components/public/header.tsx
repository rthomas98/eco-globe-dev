import Link from "next/link";
import { Button } from "@eco-globe/ui";

const navLinks = [
  { label: "Services", href: "/services" },
  { label: "Sellers", href: "/sellers" },
  { label: "Buyers", href: "/buyers" },
  { label: "About", href: "/about" },
  { label: "Contact Us", href: "/contact" },
];

export function Header({ transparent = false }: { transparent?: boolean }) {
  return (
    <header
      className={`w-full ${transparent ? "absolute top-0 left-0 z-50" : "bg-white"}`}
    >
      <div className="mx-auto max-w-[1440px] px-[135px]">
        <div className="flex h-20 items-center justify-between">
          <Link href="/" className="text-2xl font-bold">
            <span className={transparent ? "text-white" : "text-neutral-900"}>
              eco
            </span>
            <span className="text-green-400">globe</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-base font-medium ${transparent ? "text-white" : "text-neutral-800"} transition-colors hover:opacity-80`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="md"
              className={transparent ? "text-white" : "text-neutral-900"}
            >
              Login
            </Button>
            <Button variant={transparent ? "outline-white" : "secondary"} size="md">
              Sign Up
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
