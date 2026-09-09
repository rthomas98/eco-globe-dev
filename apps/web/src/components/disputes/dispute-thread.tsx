"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquare, RefreshCw } from "lucide-react";
import { Button } from "@eco-globe/ui";
import {
  fetchDisputeMessages,
  sendDisputeMessage,
  type ApiDisputeMessage,
} from "@/lib/api-fulfilment";

const ROLE_LABELS: Record<string, string> = {
  buyer: "Buyer",
  seller: "Seller",
  admin: "EcoGlobe",
};

function messageTime(iso: string) {
  const date = new Date(iso);
  return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

/**
 * The live buyer/seller/EcoGlobe conversation on a dispute. Messages
 * persist to the DisputeMessages table; the other party is notified on
 * every send. Shared across the seller, buyer, and admin portals.
 */
export function DisputeThread({
  disputeId,
  viewerRole,
}: {
  disputeId: number;
  viewerRole: "buyer" | "seller" | "admin";
}) {
  const [messages, setMessages] = useState<ApiDisputeMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(() => {
    fetchDisputeMessages(disputeId)
      .then((rows) => setMessages(rows))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [disputeId]);

  useEffect(reload, [reload]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError("");
    try {
      await sendDisputeMessage(disputeId, text);
      setDraft("");
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message failed to send.");
    }
    setSending(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
          Conversation
        </h3>
        <button
          type="button"
          onClick={reload}
          className="flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-900"
        >
          <RefreshCw className="size-3.5" /> Refresh
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {loading && (
          <p className="text-sm text-neutral-500">Loading conversation...</p>
        )}
        {!loading && messages.length === 0 && (
          <p className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
            No messages yet. Start the conversation below — the other party is
            notified when you send.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.senderRole === viewerRole;
          return (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                mine
                  ? "ml-auto bg-neutral-900 text-white"
                  : m.senderRole === "admin"
                    ? "bg-violet-50 text-neutral-900"
                    : "bg-neutral-100 text-neutral-900"
              }`}
            >
              <div
                className={`mb-1 flex items-center justify-between gap-3 text-[10px] uppercase ${
                  mine ? "text-neutral-400" : "text-neutral-500"
                }`}
              >
                <span>
                  {mine ? "You" : m.senderName} · {ROLE_LABELS[m.senderRole] ?? m.senderRole}
                </span>
                <span>{messageTime(m.createdAt)}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{m.body}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl bg-neutral-50 p-4">
        <textarea
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            viewerRole === "admin"
              ? "Reply to both parties as EcoGlobe..."
              : "Explain your position or propose a resolution..."
          }
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-3 flex justify-end">
          <Button
            variant="primary"
            size="md"
            disabled={!draft.trim() || sending}
            onClick={() => void send()}
          >
            <MessageSquare className="size-4" />
            {sending ? "Sending..." : "Send message"}
          </Button>
        </div>
      </div>
    </div>
  );
}
