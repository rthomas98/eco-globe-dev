"use client";

import { useState } from "react";
import { CheckCircle2, Clock, Play, Video } from "lucide-react";

type Role = "public" | "buyer" | "seller" | "admin";

interface DemoVideo {
  id: string;
  title: string;
  audience: Role | "all";
  duration: string;
  description: string;
  steps: string[];
}

const videos: DemoVideo[] = [
  {
    id: "marketplace",
    title: "Marketplace search and quote request",
    audience: "buyer",
    duration: "4 min",
    description: "How buyers search by material, country, distance, quantity, price, and CO2 impact.",
    steps: ["Search feedstocks", "Open product detail", "Compare carbon impact", "Request quote"],
  },
  {
    id: "seller-listing",
    title: "Create and publish a feedstock listing",
    audience: "seller",
    duration: "5 min",
    description: "How sellers add specs, sustainability evidence, availability, and documents.",
    steps: ["Create listing", "Attach documents", "Submit for verification", "Track buyer interest"],
  },
  {
    id: "escrow",
    title: "Escrow, payment, and delivery confirmation",
    audience: "all",
    duration: "6 min",
    description: "How funds are held, disputes are reviewed, and releases are triggered after delivery.",
    steps: ["Fund escrow", "Track shipment", "Confirm delivery", "Release or dispute funds"],
  },
  {
    id: "admin-ops",
    title: "Admin operations control center",
    audience: "admin",
    duration: "7 min",
    description: "How admins manage users, listings, disputes, contracts, signatures, and compliance queues.",
    steps: ["Review queues", "Open detail panels", "Escalate exceptions", "Export reports"],
  },
];

const roleTitle: Record<Role, string> = {
  public: "EcoGlobe video demos",
  buyer: "Buyer video demos",
  seller: "Seller video demos",
  admin: "Admin video demos",
};

export function VideoDemoCenter({ role }: { role: Role }) {
  const available = videos.filter((video) => video.audience === "all" || video.audience === role || role === "public");
  const [selected, setSelected] = useState(available[0]);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-neutral-50">
      <div className="px-8 py-8">
        <div className="mb-6">
          <p className="mb-2 text-xs font-semibold tracking-[0.28em] text-emerald-700">VIDEO DEMO CENTER</p>
          <h1 className="text-3xl font-bold text-neutral-950">{roleTitle[role]}</h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600">
            Frontend demo library for onboarding, stakeholder walkthroughs, and phase-by-phase platform education.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3">
            {available.map((video) => (
              <button
                key={video.id}
                type="button"
                onClick={() => setSelected(video)}
                className={`w-full rounded-2xl p-5 text-left shadow-sm ring-1 transition ${
                  selected.id === video.id ? "bg-neutral-950 text-white ring-neutral-950" : "bg-white text-neutral-950 ring-neutral-200 hover:bg-neutral-50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <Video className="size-5" />
                  <span className="inline-flex items-center gap-1 text-xs">
                    <Clock className="size-3" />
                    {video.duration}
                  </span>
                </div>
                <h2 className="mt-4 font-bold">{video.title}</h2>
                <p className={`mt-1 text-sm ${selected.id === video.id ? "text-neutral-300" : "text-neutral-500"}`}>
                  {video.description}
                </p>
              </button>
            ))}
          </div>

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
            <div className="flex aspect-video items-center justify-center rounded-2xl bg-neutral-950 text-white">
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setCompleted((current) => ({ ...current, [selected.id]: true }))}
                  className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-white text-neutral-950"
                >
                  <Play className="ml-1 size-7 fill-current" />
                </button>
                <p className="text-sm text-neutral-300">Demo video placeholder</p>
                <p className="text-xs text-neutral-500">Video hosting can be connected later.</p>
              </div>
            </div>
            <div className="mt-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-neutral-950">{selected.title}</h2>
                <p className="mt-1 text-sm text-neutral-600">{selected.description}</p>
              </div>
              {completed[selected.id] && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="size-3" />
                  Watched
                </span>
              )}
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {selected.steps.map((step, index) => (
                <div key={step} className="rounded-xl bg-neutral-50 p-4">
                  <p className="text-xs font-semibold text-neutral-500">Step {index + 1}</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-950">{step}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
