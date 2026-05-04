"use client";

import { useState } from "react";
import {
  FileText,
  Download,
  MoreHorizontal,
  Eye,
  Mail,
  Link as LinkIcon,
} from "lucide-react";

function buildPlaceholderContent(name: string) {
  return `EcoGlobe document\nFilename: ${name}\nGenerated: ${new Date().toISOString()}\n\nThis is a demo placeholder document. Real PDF content will be served from the document service.\n`;
}

function triggerDownload(name: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([buildPlaceholderContent(name)], {
    type: "text/plain",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name.replace(/\.pdf$/i, ".txt");
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function openInNewTab(name: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([buildPlaceholderContent(name)], {
    type: "text/plain",
  });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function copyLink(name: string) {
  if (typeof navigator === "undefined") return;
  try {
    await navigator.clipboard.writeText(
      `https://ecoglobeworld.com/docs/${encodeURIComponent(name)}`,
    );
  } catch {
    /* clipboard blocked — silent */
  }
}

export function DocumentRow({ name }: { name: string }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative flex items-center gap-3 rounded-lg bg-neutral-50 px-4 py-3">
      <FileText className="size-5 shrink-0 text-neutral-500" />
      <span className="flex-1 text-sm text-neutral-900">{name}</span>
      <button
        type="button"
        onClick={() => triggerDownload(name)}
        aria-label={`Download ${name}`}
        className="flex size-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-200"
      >
        <Download className="size-4" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((v) => !v);
        }}
        aria-label="More"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="flex size-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-200"
      >
        <MoreHorizontal className="size-4" />
      </button>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <div
            role="menu"
            className="absolute right-2 top-12 z-40 w-[200px] rounded-xl bg-white py-2"
            style={{
              border: "1px solid #F0F0F0",
              boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
            }}
          >
            {[
              {
                label: "View",
                icon: Eye,
                onClick: () => openInNewTab(name),
              },
              {
                label: "Download",
                icon: Download,
                onClick: () => triggerDownload(name),
              },
              {
                label: "Email a copy",
                icon: Mail,
                onClick: () => {
                  window.location.href = `mailto:info@ecoglobeworld.com?subject=${encodeURIComponent(`Document: ${name}`)}`;
                },
              },
              {
                label: "Copy link",
                icon: LinkIcon,
                onClick: () => copyLink(name),
              },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  item.onClick();
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-neutral-900 hover:bg-neutral-50"
              >
                <item.icon className="size-4" />
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
