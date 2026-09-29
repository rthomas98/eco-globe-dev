"use client";

import { useState } from "react";
import { Button, Input } from "@eco-globe/ui";
import { changePassword } from "@/lib/api-account";
import { describeBackendError } from "@/lib/backend-client";

/** Changes the signed-in user's password; reports success only after the backend confirms. */
export function PasswordChangeForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const submit = async () => {
    if (!current || next.length < 8) {
      setMessage({ tone: "error", text: "Enter your current password and a new password of at least 8 characters." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setMessage({ tone: "ok", text: "Password changed." });
    } catch (err) {
      setMessage({ tone: "error", text: describeBackendError(err, "The password was not changed.") });
    } finally {
      setBusy(false);
    }
  };

  return (
      <div className="flex flex-col gap-3">
        <Input label="Current password" id="current-password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        <Input label="New password" id="new-password" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        {message && (
          <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm ${message.tone === "error" ? "text-red-700" : "text-emerald-700"}`}>
            {message.text}
          </p>
        )}
        <Button variant="primary" size="md" className="w-fit" disabled={busy} onClick={() => void submit()}>
          {busy ? "Saving…" : "Change password"}
        </Button>
      </div>
  );
}
