"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminLayout } from "./admin-layout";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function AdminDetailPage({
  breadcrumbs,
  title,
  subtitle,
  actions,
  children,
}: {
  breadcrumbs: BreadcrumbItem[];
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const back = breadcrumbs[breadcrumbs.length - 2];

  return (
    <AdminLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-6">
          {back?.href && (
            <Link
              href={back.href}
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-900"
            >
              <ArrowLeft className="size-4" />
              Back to {back.label}
            </Link>
          )}

          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <nav className="mb-2 flex items-center gap-1.5 text-xs text-neutral-500">
                {breadcrumbs.map((b, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    {b.href ? (
                      <Link href={b.href} className="hover:text-neutral-900">
                        {b.label}
                      </Link>
                    ) : (
                      <span className="text-neutral-700">{b.label}</span>
                    )}
                    {i < breadcrumbs.length - 1 && <span>/</span>}
                  </span>
                ))}
              </nav>
              <h1 className="text-3xl font-bold text-neutral-900">{title}</h1>
              {subtitle && <div className="mt-1 text-sm text-neutral-500">{subtitle}</div>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </div>

          {children}
        </div>
      </div>
    </AdminLayout>
  );
}

export function DetailCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function KeyValueGrid({ items }: { items: Array<{ label: string; value: React.ReactNode }> }) {
  return (
    <div className="grid grid-cols-2 gap-y-4">
      {items.map((kv, i) => (
        <div key={i}>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {kv.label}
          </p>
          <div className="mt-1 text-sm text-neutral-900">{kv.value}</div>
        </div>
      ))}
    </div>
  );
}
