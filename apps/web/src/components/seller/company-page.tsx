"use client";

import { MoreHorizontal } from "lucide-react";
import { SellerLayout } from "./seller-layout";

type Row = { label: string; value: React.ReactNode; action?: React.ReactNode };

function InfoRow({ label, value, action }: Row) {
  return (
    <div
      className="flex items-center justify-between gap-6 px-6 py-5"
      style={{ borderBottom: "1px solid #F0F0F0" }}
    >
      <span className="w-[260px] shrink-0 text-sm text-neutral-700">{label}</span>
      <div className="flex-1 text-sm text-neutral-900">{value}</div>
      {action}
    </div>
  );
}

function EditLink() {
  return (
    <button className="text-sm font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700">
      Edit
    </button>
  );
}

function SectionCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
      {title && (
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

export function SellerCompanyPage() {
  return (
    <SellerLayout title="Company">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-6">
        <h1 className="px-1 text-2xl font-bold text-neutral-900">Company</h1>

        {/* Company info */}
        <SectionCard>
          <div
            className="flex items-center justify-between gap-6 px-6 py-5"
            style={{ borderBottom: "1px solid #F0F0F0" }}
          >
            <span className="w-[260px] shrink-0 text-sm text-neutral-700">Logo</span>
            <div className="flex-1">
              <div className="flex size-14 items-center justify-center rounded-xl bg-neutral-900 text-xs font-bold text-white">
                <span className="flex flex-col items-center leading-none">
                  <span className="text-base">◆</span>
                  <span className="mt-0.5 text-[10px] tracking-wider">alo</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <button className="text-sm font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700">
                Delete
              </button>
              <button className="text-sm font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700">
                Update
              </button>
            </div>
          </div>
          <InfoRow label="Company Name" value="Alo World" action={<EditLink />} />
          <InfoRow label="Company Registration Number" value="1234567890" action={<EditLink />} />
          <InfoRow label="Industry Sector" value="Chemicals" action={<EditLink />} />
          <InfoRow label="Country" value="Louisiana" action={<EditLink />} />
          <div className="flex items-center justify-between gap-6 px-6 py-5">
            <span className="w-[260px] shrink-0 text-sm text-neutral-700">Business Address</span>
            <div className="flex-1 text-sm text-neutral-900">
              1165 Bayou Paul Ln, St Gabriel, Baton rouge, 93264 LA
            </div>
            <EditLink />
          </div>
        </SectionCard>

        {/* Authorized representative */}
        <SectionCard title="Authorized Representative">
          <InfoRow label="Full name" value="William Stanley" />
          <InfoRow label="Job Title" value="Finance Manager" />
          <InfoRow label="Work Phone" value="1234567890" />
          <div className="flex items-center justify-between gap-6 px-6 py-5">
            <span className="w-[260px] shrink-0 text-sm text-neutral-700">Work Email</span>
            <div className="flex-1 text-sm text-neutral-900">example@aloworld.com</div>
          </div>
        </SectionCard>

        {/* Documents */}
        <SectionCard title="Document">
          <InfoRow
            label="Uploaded Certifications"
            value="example document here.pdf"
            action={
              <div className="flex items-center gap-3">
                <button className="text-sm font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700">
                  Update
                </button>
                <button className="flex size-8 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700">
                  <MoreHorizontal className="size-4" />
                </button>
              </div>
            }
          />
          <div className="flex items-center justify-between gap-6 px-6 py-5">
            <span className="w-[260px] shrink-0 text-sm text-neutral-700">Compliance Status</span>
            <div className="flex-1 text-sm text-neutral-900">example document here.pdf</div>
          </div>
        </SectionCard>
      </div>
    </SellerLayout>
  );
}
