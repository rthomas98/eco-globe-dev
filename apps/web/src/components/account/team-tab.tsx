"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, UserPlus, X } from "lucide-react";
import { Button, Input } from "@eco-globe/ui";
import {
  fetchTeamMembers,
  inviteTeamMember,
  removeTeamMember,
  updateTeamMember,
  type ApiTeamMember,
} from "@/lib/api-account";

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  buyer_operator: "Buyer operator",
  seller_operator: "Seller operator",
  viewer: "Viewer",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  pending_verification: "bg-amber-50 text-amber-700",
  inactive: "bg-neutral-100 text-neutral-500",
  suspended: "bg-red-50 text-red-600",
};

function statusLabel(code: string) {
  if (code === "pending_verification") return "Pending approval";
  return code.charAt(0).toUpperCase() + code.slice(1).replace(/_/g, " ");
}

/**
 * Team management: live company members with join-request approval,
 * invites by email, and removal. Shared by the seller and buyer account
 * pages — the company comes from the signed-in user's active membership.
 */
export function TeamTab({
  companyId,
  currentUserId,
  operatorRole,
}: {
  companyId?: number;
  currentUserId?: number;
  /** Default operator role for invites: seller or buyer side. */
  operatorRole: "seller_operator" | "buyer_operator";
}) {
  const [members, setMembers] = useState<ApiTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("viewer");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const reload = useCallback(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    fetchTeamMembers(companyId)
      .then((rows) => setMembers(rows))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [companyId]);

  useEffect(reload, [reload]);

  const act = async (fn: () => Promise<unknown>, memberId: number, okText: string) => {
    setBusyId(memberId);
    setMessage(null);
    try {
      await fn();
      setMessage({ kind: "ok", text: okText });
      reload();
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Something went wrong.",
      });
    }
    setBusyId(null);
  };

  const invite = async () => {
    if (!companyId || !inviteEmail.trim()) return;
    setMessage(null);
    try {
      await inviteTeamMember(companyId, inviteEmail.trim(), inviteRole);
      setMessage({ kind: "ok", text: `${inviteEmail.trim()} added to your team.` });
      setInviteEmail("");
      reload();
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Invite failed.",
      });
    }
  };

  if (!companyId) {
    return (
      <div className="px-6 py-10 text-center text-sm text-neutral-500">
        Team management is available once your account is linked to a company.
      </div>
    );
  }

  const pending = members.filter((m) => m.memberStatusCode === "pending_verification");
  const others = members.filter((m) => m.memberStatusCode !== "pending_verification");

  return (
    <div className="flex flex-col gap-6 px-6 py-6">
      {/* Invite */}
      <div className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="size-5 text-neutral-700" />
          <h3 className="text-lg font-bold text-neutral-900">Invite a teammate</h3>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              id="team-invite-email"
              label="Work email"
              type="email"
              placeholder="teammate@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-900" htmlFor="team-invite-role">
              Role
            </label>
            <select
              id="team-invite-role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="h-[42px] rounded-lg bg-white px-3 text-sm text-neutral-900"
              style={{ border: "1px solid #E0E0E0" }}
            >
              <option value="viewer">Viewer</option>
              <option value={operatorRole}>{ROLE_LABELS[operatorRole]}</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Button variant="primary" size="md" onClick={() => void invite()}>
            Send invite
          </Button>
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          The teammate needs an EcoGlobe account with this email. They get access
          immediately with the role you choose.
        </p>
      </div>

      {message && (
        <p
          className={`rounded-lg px-4 py-2.5 text-sm ${
            message.kind === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}

      {/* Pending join requests */}
      {pending.length > 0 && (
        <div className="rounded-2xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
          <div className="px-5 pt-4 pb-2">
            <h3 className="text-lg font-bold text-neutral-900">Join requests</h3>
            <p className="text-sm text-neutral-500">
              People who registered with your company name and are waiting for approval.
            </p>
          </div>
          {pending.map((m, i) => (
            <div
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              style={{ borderTop: i === 0 ? "1px solid #F0F0F0" : "1px solid #F8F8F8" }}
            >
              <div>
                <p className="text-sm font-semibold text-neutral-900">{m.userName}</p>
                <p className="text-xs text-neutral-500">{m.userEmail}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="md"
                  disabled={busyId === m.id}
                  onClick={() =>
                    void act(
                      () => removeTeamMember(m.id),
                      m.id,
                      `${m.userName}'s request was declined.`,
                    )
                  }
                >
                  <X className="size-4" /> Decline
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  disabled={busyId === m.id}
                  onClick={() =>
                    void act(
                      () =>
                        updateTeamMember(m.id, {
                          memberStatusCode: "active",
                          memberRoleCode: operatorRole,
                          permissionTierCode: "requester",
                        }),
                      m.id,
                      `${m.userName} is now an active team member.`,
                    )
                  }
                >
                  <Check className="size-4" />
                  {busyId === m.id ? "Approving..." : "Approve"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Members */}
      <div className="rounded-2xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
        <div className="px-5 pt-4 pb-2">
          <h3 className="text-lg font-bold text-neutral-900">Team members</h3>
        </div>
        {loading && (
          <p className="px-5 py-6 text-sm text-neutral-500">Loading team...</p>
        )}
        {!loading && others.length === 0 && (
          <p className="px-5 py-6 text-sm text-neutral-500">No team members yet.</p>
        )}
        {others.map((m, i) => (
          <div
            key={m.id}
            className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            style={{ borderTop: i === 0 ? "1px solid #F0F0F0" : "1px solid #F8F8F8" }}
          >
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-neutral-200 text-sm font-semibold text-neutral-600">
                {m.userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">
                  {m.userName}
                  {m.userId === currentUserId && (
                    <span className="ml-2 text-xs font-normal text-neutral-400">(you)</span>
                  )}
                </p>
                <p className="text-xs text-neutral-500">{m.userEmail}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-700">
                {ROLE_LABELS[m.memberRoleCode] ?? m.memberRoleCode}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  STATUS_STYLES[m.memberStatusCode] ?? "bg-neutral-100 text-neutral-600"
                }`}
              >
                {statusLabel(m.memberStatusCode)}
              </span>
              {m.memberRoleCode !== "owner" &&
                m.userId !== currentUserId &&
                m.memberStatusCode === "active" && (
                  <button
                    type="button"
                    disabled={busyId === m.id}
                    onClick={() =>
                      void act(
                        () => removeTeamMember(m.id),
                        m.id,
                        `${m.userName} was removed from the team.`,
                      )
                    }
                    className="text-sm font-medium text-red-600 underline underline-offset-2 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
