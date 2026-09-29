"use client";

import { useState } from "react";
import { Mail, Search } from "lucide-react";
import { fetchContactRequests } from "@/lib/api-contact";
import { DataBoundary, useBackendData } from "@/components/shared/data-state";

/** Inquiries submitted through the public contact form, as stored by the backend. */
export function AdminContactRequestsPage() {
  const requests = useBackendData(fetchContactRequests, [], "Contact requests could not be loaded.");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = (requests.data ?? []).filter(
    (r) => !q || `${r.name} ${r.email} ${r.company ?? ""} ${r.topic} ${r.message}`.toLowerCase().includes(q),
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Contact requests</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Messages sent from the public contact page. Reply from your email client; EcoGlobe
              does not send an automatic reply.
            </p>
          </div>
          <div className="flex min-w-[220px] items-center gap-2 rounded-full bg-white px-4 py-2" style={{ border: "1px solid #E0E0E0" }}>
            <Search className="size-4 text-neutral-400" />
            <input
              type="search"
              aria-label="Search contact requests"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
        </div>
        <div className="rounded-xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
          <DataBoundary
            state={requests}
            loadingLabel="Loading contact requests…"
            isEmpty={() => visible.length === 0}
            empty={{ title: (requests.data ?? []).length === 0 ? "No contact requests yet" : "No requests match your search" }}
          >
            {() =>
              visible.map((r, i) => (
                <article
                  key={r.id}
                  className="px-5 py-4"
                  style={{ borderBottom: i === visible.length - 1 ? undefined : "1px solid #F4F4F5" }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-neutral-900">
                      {r.topic} <span className="font-normal text-neutral-500">· {r.name}{r.company ? `, ${r.company}` : ""}</span>
                    </p>
                    <span className="text-xs text-neutral-500">{new Date(r.createdAt).toLocaleString("en-US")}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700">{r.message}</p>
                  <a
                    href={`mailto:${r.email}?subject=${encodeURIComponent(`Re: ${r.topic}`)}`}
                    className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-neutral-900 underline"
                  >
                    <Mail className="size-4" /> {r.email}
                  </a>
                </article>
              ))
            }
          </DataBoundary>
        </div>
      </div>
    </div>
  );
}
