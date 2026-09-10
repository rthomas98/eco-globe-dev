"use client";
import { useState } from "react";
import { materialImage, isMaterialIllustration } from "@/lib/material-images";
export function MaterialImage({
  src,
  title,
  showCaption = true,
  className = "h-full w-full object-cover",
}: {
  src?: string | null;
  title: string;
  showCaption?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState<string[]>([]);
  const fallback = materialImage(title);
  const url =
    src && !failed.includes(src)
      ? src
      : fallback && !failed.includes(fallback)
        ? fallback
        : null;
  if (!url)
    return (
      <div className="flex h-full min-h-24 items-center justify-center bg-neutral-100 text-xs text-neutral-500">
        No material photo available
      </div>
    );
  return (
    <>
      <img
        src={url}
        alt={
          isMaterialIllustration(url) ? `Illustrative image of ${title}` : title
        }
        className={className}
        onError={() =>
          setFailed((previous) =>
            previous.includes(url) ? previous : [...previous, url],
          )
        }
        onLoad={(event) => {
          if (
            event.currentTarget.naturalWidth <= 1 &&
            event.currentTarget.naturalHeight <= 1
          )
            setFailed((previous) =>
              previous.includes(url) ? previous : [...previous, url],
            );
        }}
      />
      {showCaption && isMaterialIllustration(url) && (
        <span className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-medium text-neutral-700">
          Illustrative image
        </span>
      )}
    </>
  );
}
