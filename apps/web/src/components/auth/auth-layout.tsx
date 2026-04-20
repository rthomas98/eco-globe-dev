import Link from "next/link";
import Image from "next/image";
import { X } from "lucide-react";

export function AuthLayout({
  children,
  showImage = true,
  cardWidth = "max-w-[900px]",
  footerContent,
}: {
  children: React.ReactNode;
  showImage?: boolean;
  cardWidth?: string;
  footerContent?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-100 px-4 py-20">
      {/* Logo */}
      <Link href="/" className="absolute left-4 top-4 sm:left-[30px] sm:top-[30px]">
        <Image src="/logo.svg" alt="EcoGlobe" width={110} height={32} className="invert" priority />
      </Link>

      {/* Close button */}
      <Link
        href="/"
        className="absolute right-4 top-4 sm:right-[30px] sm:top-[30px] flex size-10 items-center justify-center rounded-full bg-white transition-colors hover:bg-neutral-200"
      >
        <X className="size-5 text-neutral-900" />
      </Link>

      {/* Card */}
      <div
        className={`${cardWidth} mx-4 sm:mx-auto w-full overflow-hidden rounded-xl bg-white`}
        style={{ boxShadow: "0 16px 40px -8px rgba(0,0,0,0.1)" }}
      >
        <div className="flex">
          {/* Form content */}
          <div className="flex-1 p-6 sm:p-10 lg:p-[60px]">
            {children}
          </div>

          {/* Image panel */}
          {showImage && (
            <div className="relative hidden w-[320px] shrink-0 overflow-hidden md:block">
              <img
                src="/hero.jpg"
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to bottom, #EFFFEC 0%, rgba(239,255,236,0.6) 30%, transparent 60%)",
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer content */}
      {footerContent && (
        <div className="mt-8 text-center">
          {footerContent}
        </div>
      )}
    </div>
  );
}
