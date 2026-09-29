"use client";

// Deferred: policy editors whose values the backend does not enforce yet.
// Not imported by any route. Wire back only with backend consumers.


import { useState } from "react";
import { usePlatformSetting, type PlatformSettingMeta } from "@/lib/api-platform-settings";
import { Trash2, X } from "lucide-react";
import { Button, Input } from "@eco-globe/ui";

/* ═══════════════════════════════════════════
   SHARED HELPERS
   ═══════════════════════════════════════════ */
// Settings persist only to the PlatformSettings table (no browser copy).
const useLocalStorage = usePlatformSetting;

/** Load/save state and an honest note that stored values are not enforced yet. */
function SettingsStatus({ meta }: { meta: PlatformSettingMeta }) {
  return (
    <div className="mb-6 flex flex-col gap-2">
      <p className="rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-900">
        These values are saved to EcoGlobe for reference only. Marketplace operations do not apply
        them automatically yet.
      </p>
      {meta.status === "loading" && <p className="text-xs text-neutral-500">Loading saved values…</p>}
      {meta.status === "error" && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {meta.error} Editing is disabled until saved values can be read.
        </p>
      )}
      {meta.status === "ready" && !meta.stored && meta.saveState === "idle" && (
        <p className="text-xs text-neutral-500">
          Nothing has been saved yet. The values below are starting suggestions until you change one.
        </p>
      )}
      {meta.saveState === "saving" && <p className="text-xs text-neutral-500">Saving…</p>}
      {meta.saveState === "saved" && <p role="status" className="text-xs text-emerald-700">Saved.</p>}
      {meta.saveState === "error" && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {meta.error} The previous value was restored.
        </p>
      )}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-neutral-900" : "bg-neutral-200"}`}>
      <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform shadow-sm ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-5" style={{ borderBottom: "1px solid #F0F0F0" }}>
      <div className="min-w-0"><p className="text-sm font-medium text-neutral-900">{label}</p>{description && <p className="mt-0.5 text-xs text-neutral-500">{description}</p>}</div>
      {children}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="mb-4 text-lg font-bold text-neutral-900">{title}</h2>
      <div className="rounded-xl p-5" style={{ border: "1px solid #F0F0F0" }}>{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   CATEGORIES
   ═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   SELLER SETTINGS
   ═══════════════════════════════════════════ */
export function SellerSettingsPage() {
  const [settings, setSettings, meta] = useLocalStorage("ecoglobe_seller_settings", {
    autoApprove: false, requireVerification: true, maxListings: "50", commissionRate: "5",
    requireCarbonData: true, minOrderValue: "100", allowDraftListings: true, requireInsurance: false,
  });
  const up = (k: string, v: string | boolean) => setSettings({ ...settings, [k]: v });

  return (
    <div className="flex h-full flex-col overflow-y-auto"><div className="max-w-[800px] px-4 py-5 sm:px-6">
      <h1 className="mb-4 text-2xl font-bold text-neutral-900">Seller Settings</h1>
      <SettingsStatus meta={meta} />
      <fieldset disabled={meta.status !== "ready"} className="min-w-0 disabled:opacity-60">
      <SectionCard title="Registration & Verification">
        <SettingRow label="Auto-approve new sellers" description="Automatically approve seller registrations without manual review"><Toggle checked={settings.autoApprove} onChange={(v) => up("autoApprove", v)} /></SettingRow>
        <SettingRow label="Require identity verification" description="Sellers must upload verification documents before listing"><Toggle checked={settings.requireVerification} onChange={(v) => up("requireVerification", v)} /></SettingRow>
        <SettingRow label="Require insurance proof" description="Sellers must provide insurance documentation"><Toggle checked={settings.requireInsurance} onChange={(v) => up("requireInsurance", v)} /></SettingRow>
      </SectionCard>
      <SectionCard title="Listing Rules">
        <SettingRow label="Maximum active listings" description="Maximum number of active listings per seller">
          <input type="number" value={settings.maxListings} onChange={(e) => up("maxListings", e.target.value)} className="w-20 rounded-lg px-3 py-2 text-right text-sm outline-none" style={{ border: "1px solid #E0E0E0" }} />
        </SettingRow>
        <SettingRow label="Require carbon data" description="Sellers must provide CO₂ emission data for all listings"><Toggle checked={settings.requireCarbonData} onChange={(v) => up("requireCarbonData", v)} /></SettingRow>
        <SettingRow label="Allow draft listings" description="Sellers can save incomplete listings as drafts"><Toggle checked={settings.allowDraftListings} onChange={(v) => up("allowDraftListings", v)} /></SettingRow>
      </SectionCard>
      <SectionCard title="Commission">
        <SettingRow label="Platform commission rate (%)" description="Percentage fee charged on each completed transaction">
          <div className="flex items-center gap-1"><input type="number" value={settings.commissionRate} onChange={(e) => up("commissionRate", e.target.value)} className="w-16 rounded-lg px-3 py-2 text-right text-sm outline-none" style={{ border: "1px solid #E0E0E0" }} /><span className="text-sm text-neutral-500">%</span></div>
        </SettingRow>
        <SettingRow label="Minimum order value ($)" description="Minimum transaction amount for orders">
          <div className="flex items-center gap-1"><span className="text-sm text-neutral-500">$</span><input type="number" value={settings.minOrderValue} onChange={(e) => up("minOrderValue", e.target.value)} className="w-20 rounded-lg px-3 py-2 text-right text-sm outline-none" style={{ border: "1px solid #E0E0E0" }} /></div>
        </SettingRow>
      </SectionCard>
      </fieldset>
    </div></div>
  );
}

/* ═══════════════════════════════════════════
   BUYER SETTINGS
   ═══════════════════════════════════════════ */
export function BuyerSettingsPage() {
  const [settings, setSettings, meta] = useLocalStorage("ecoglobe_buyer_settings", {
    autoApprove: true, requireCompanyInfo: true, allowGuestBrowse: true, requirePaymentMethod: false,
    maxOrdersPerDay: "10", enableWishlist: true, enablePriceAlerts: true, requireShippingAddress: true,
  });
  const up = (k: string, v: string | boolean) => setSettings({ ...settings, [k]: v });

  return (
    <div className="flex h-full flex-col overflow-y-auto"><div className="max-w-[800px] px-4 py-5 sm:px-6">
      <h1 className="mb-4 text-2xl font-bold text-neutral-900">Buyer Settings</h1>
      <SettingsStatus meta={meta} />
      <fieldset disabled={meta.status !== "ready"} className="min-w-0 disabled:opacity-60">
      <SectionCard title="Registration">
        <SettingRow label="Auto-approve new buyers" description="Automatically approve buyer accounts"><Toggle checked={settings.autoApprove} onChange={(v) => up("autoApprove", v)} /></SettingRow>
        <SettingRow label="Require company information" description="Buyers must provide company details during registration"><Toggle checked={settings.requireCompanyInfo} onChange={(v) => up("requireCompanyInfo", v)} /></SettingRow>
        <SettingRow label="Allow guest browsing" description="Non-registered users can browse the marketplace"><Toggle checked={settings.allowGuestBrowse} onChange={(v) => up("allowGuestBrowse", v)} /></SettingRow>
      </SectionCard>
      <SectionCard title="Ordering">
        <SettingRow label="Require payment method on file" description="Buyers must add a payment method before placing orders"><Toggle checked={settings.requirePaymentMethod} onChange={(v) => up("requirePaymentMethod", v)} /></SettingRow>
        <SettingRow label="Maximum orders per day" description="Limit on number of orders a buyer can place daily">
          <input type="number" value={settings.maxOrdersPerDay} onChange={(e) => up("maxOrdersPerDay", e.target.value)} className="w-20 rounded-lg px-3 py-2 text-right text-sm outline-none" style={{ border: "1px solid #E0E0E0" }} />
        </SettingRow>
        <SettingRow label="Require shipping address" description="Buyers must provide delivery address for all orders"><Toggle checked={settings.requireShippingAddress} onChange={(v) => up("requireShippingAddress", v)} /></SettingRow>
      </SectionCard>
      <SectionCard title="Features">
        <SettingRow label="Enable wishlist" description="Allow buyers to save products to a wishlist"><Toggle checked={settings.enableWishlist} onChange={(v) => up("enableWishlist", v)} /></SettingRow>
        <SettingRow label="Enable price alerts" description="Buyers can set price drop notifications for products"><Toggle checked={settings.enablePriceAlerts} onChange={(v) => up("enablePriceAlerts", v)} /></SettingRow>
      </SectionCard>
      </fieldset>
    </div></div>
  );
}

/* ═══════════════════════════════════════════
   ESCROW SETTINGS
   ═══════════════════════════════════════════ */
export function EscrowSettingsPage() {
  const [settings, setSettings, meta] = useLocalStorage("ecoglobe_escrow_settings", {
    autoRelease: false, releaseDays: "7", disputeWindow: "14", requireBuyerConfirmation: true,
    escrowFeePercent: "1.5", minEscrowAmount: "500", enablePartialRelease: false, autoRefundOnCancel: true,
  });
  const up = (k: string, v: string | boolean) => setSettings({ ...settings, [k]: v });

  return (
    <div className="flex h-full flex-col overflow-y-auto"><div className="max-w-[800px] px-4 py-5 sm:px-6">
      <h1 className="mb-4 text-2xl font-bold text-neutral-900">Escrow Settings</h1>
      <SettingsStatus meta={meta} />
      <fieldset disabled={meta.status !== "ready"} className="min-w-0 disabled:opacity-60">
      <SectionCard title="Release Rules">
        <SettingRow label="Auto-release escrow" description="Automatically release funds after delivery confirmation"><Toggle checked={settings.autoRelease} onChange={(v) => up("autoRelease", v)} /></SettingRow>
        <SettingRow label="Release waiting period (days)" description="Days to wait after delivery before auto-release">
          <input type="number" value={settings.releaseDays} onChange={(e) => up("releaseDays", e.target.value)} className="w-20 rounded-lg px-3 py-2 text-right text-sm outline-none" style={{ border: "1px solid #E0E0E0" }} />
        </SettingRow>
        <SettingRow label="Require buyer confirmation" description="Buyer must confirm receipt before funds are released"><Toggle checked={settings.requireBuyerConfirmation} onChange={(v) => up("requireBuyerConfirmation", v)} /></SettingRow>
        <SettingRow label="Enable partial release" description="Allow releasing a portion of escrowed funds"><Toggle checked={settings.enablePartialRelease} onChange={(v) => up("enablePartialRelease", v)} /></SettingRow>
      </SectionCard>
      <SectionCard title="Disputes & Refunds">
        <SettingRow label="Dispute window (days)" description="Number of days buyers can open a dispute after delivery">
          <input type="number" value={settings.disputeWindow} onChange={(e) => up("disputeWindow", e.target.value)} className="w-20 rounded-lg px-3 py-2 text-right text-sm outline-none" style={{ border: "1px solid #E0E0E0" }} />
        </SettingRow>
        <SettingRow label="Auto-refund on cancellation" description="Automatically return escrowed funds if order is cancelled"><Toggle checked={settings.autoRefundOnCancel} onChange={(v) => up("autoRefundOnCancel", v)} /></SettingRow>
      </SectionCard>
      <SectionCard title="Fees">
        <SettingRow label="Escrow service fee (%)" description="Fee charged for escrow protection">
          <div className="flex items-center gap-1"><input type="number" step="0.1" value={settings.escrowFeePercent} onChange={(e) => up("escrowFeePercent", e.target.value)} className="w-16 rounded-lg px-3 py-2 text-right text-sm outline-none" style={{ border: "1px solid #E0E0E0" }} /><span className="text-sm text-neutral-500">%</span></div>
        </SettingRow>
        <SettingRow label="Minimum escrow amount ($)" description="Minimum transaction value to require escrow">
          <div className="flex items-center gap-1"><span className="text-sm text-neutral-500">$</span><input type="number" value={settings.minEscrowAmount} onChange={(e) => up("minEscrowAmount", e.target.value)} className="w-24 rounded-lg px-3 py-2 text-right text-sm outline-none" style={{ border: "1px solid #E0E0E0" }} /></div>
        </SettingRow>
      </SectionCard>
      </fieldset>
    </div></div>
  );
}

/* ═══════════════════════════════════════════
   PAYMENT SETTINGS
   ═══════════════════════════════════════════ */
export function PaymentSettingsPage() {
  const [settings, setSettings, meta] = useLocalStorage("ecoglobe_payment_settings", {
    enableStripe: true, enableBankTransfer: true, enableACH: false,
    currency: "USD", taxRate: "7.5", enableInvoicing: true, payoutSchedule: "weekly",
    requireTaxId: true, enableMultiCurrency: false,
  });
  const up = (k: string, v: string | boolean) => setSettings({ ...settings, [k]: v });

  const payoutOptions = [{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "biweekly", label: "Bi-weekly" }, { value: "monthly", label: "Monthly" }];
  const currencyOptions = [{ value: "USD", label: "USD ($)" }, { value: "EUR", label: "EUR (€)" }, { value: "GBP", label: "GBP (£)" }];

  return (
    <div className="flex h-full flex-col overflow-y-auto"><div className="max-w-[800px] px-4 py-5 sm:px-6">
      <h1 className="mb-4 text-2xl font-bold text-neutral-900">Payment Settings</h1>
      <SettingsStatus meta={meta} />
      <fieldset disabled={meta.status !== "ready"} className="min-w-0 disabled:opacity-60">
      <SectionCard title="Payment Methods">
        <SettingRow label="Credit/Debit Cards (Stripe)" description="Accept Visa, Mastercard, Amex via Stripe"><Toggle checked={settings.enableStripe} onChange={(v) => up("enableStripe", v)} /></SettingRow>
        <SettingRow label="Bank Transfer" description="Allow direct bank wire transfers"><Toggle checked={settings.enableBankTransfer} onChange={(v) => up("enableBankTransfer", v)} /></SettingRow>
        <SettingRow label="ACH Payments" description="Enable ACH direct debit payments"><Toggle checked={settings.enableACH} onChange={(v) => up("enableACH", v)} /></SettingRow>
      </SectionCard>
      <SectionCard title="Currency & Tax">
        <SettingRow label="Default currency" description="Primary currency for the marketplace">
          <select value={settings.currency} onChange={(e) => up("currency", e.target.value)} className="rounded-lg px-3 py-2 text-sm outline-none" style={{ border: "1px solid #E0E0E0" }}>
            {currencyOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </SettingRow>
        <SettingRow label="Enable multi-currency" description="Allow transactions in multiple currencies"><Toggle checked={settings.enableMultiCurrency} onChange={(v) => up("enableMultiCurrency", v)} /></SettingRow>
        <SettingRow label="Default tax rate (%)" description="Applied to applicable transactions">
          <div className="flex items-center gap-1"><input type="number" step="0.1" value={settings.taxRate} onChange={(e) => up("taxRate", e.target.value)} className="w-16 rounded-lg px-3 py-2 text-right text-sm outline-none" style={{ border: "1px solid #E0E0E0" }} /><span className="text-sm text-neutral-500">%</span></div>
        </SettingRow>
        <SettingRow label="Require tax ID" description="Sellers must provide a valid tax identification number"><Toggle checked={settings.requireTaxId} onChange={(v) => up("requireTaxId", v)} /></SettingRow>
      </SectionCard>
      <SectionCard title="Payouts">
        <SettingRow label="Payout schedule" description="Frequency of seller payouts">
          <select value={settings.payoutSchedule} onChange={(e) => up("payoutSchedule", e.target.value)} className="rounded-lg px-3 py-2 text-sm outline-none" style={{ border: "1px solid #E0E0E0" }}>
            {payoutOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </SettingRow>
        <SettingRow label="Enable invoicing" description="Generate invoices automatically for all transactions"><Toggle checked={settings.enableInvoicing} onChange={(v) => up("enableInvoicing", v)} /></SettingRow>
      </SectionCard>
      </fieldset>
    </div></div>
  );
}

/* ═══════════════════════════════════════════
   TRANSACTION RULES
   ═══════════════════════════════════════════ */
interface TxnRule { id: string; name: string; condition: string; action: string; status: "Active" | "Inactive"; }


export function TransactionRulesPage() {
  const [rules, setRules, meta] = useLocalStorage<TxnRule[]>("ecoglobe_txn_rules", []);
  const [showAdd, setShowAdd] = useState(false);
  const [newRule, setNewRule] = useState({ name: "", condition: "", action: "" });

  const addRule = () => {
    if (!newRule.name.trim()) return;
    setRules([...rules, { id: Date.now().toString(), ...newRule, status: "Active" }]);
    setNewRule({ name: "", condition: "", action: "" }); setShowAdd(false);
  };

  const toggleRule = (id: string) => setRules(rules.map((r) => r.id === id ? { ...r, status: r.status === "Active" ? "Inactive" : "Active" } : r));
  const deleteRule = (id: string) => setRules(rules.filter((r) => r.id !== id));

  return (
    <div className="flex h-full flex-col overflow-y-auto"><div className="px-4 py-5 sm:px-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-neutral-900">Transaction Rules</h1>
        <Button variant="primary" size="md" disabled={meta.status !== "ready"} onClick={() => setShowAdd(true)}>Add Rule</Button>
      </div>
      <SettingsStatus meta={meta} />
      {meta.status === "ready" && rules.length === 0 ? (
        <p className="rounded-xl px-5 py-10 text-center text-sm text-neutral-500" style={{ border: "1px solid #F0F0F0" }}>
          No transaction rules have been recorded.
        </p>
      ) : (
      <div className="overflow-x-auto">
      <table className="w-full min-w-[700px]">
        <thead><tr className="text-left" style={{ borderBottom: "1px solid #F0F0F0" }}>
          <th className="pb-3 text-sm font-medium text-neutral-500">Rule Name</th>
          <th className="pb-3 text-sm font-medium text-neutral-500">Condition</th>
          <th className="pb-3 text-sm font-medium text-neutral-500">Action</th>
          <th className="pb-3 text-sm font-medium text-neutral-500 w-24">Status</th>
          <th className="pb-3 w-10"></th>
        </tr></thead>
        <tbody>
          {rules.map((rule) => (
            <tr key={rule.id} style={{ borderBottom: "1px solid #F8F8F8" }} className="hover:bg-neutral-50">
              <td className="py-4 text-sm font-medium text-neutral-900">{rule.name}</td>
              <td className="py-4 text-sm text-neutral-700">{rule.condition}</td>
              <td className="py-4 text-sm text-neutral-700">{rule.action}</td>
              <td className="py-4"><div className="flex items-center gap-2"><Toggle checked={rule.status === "Active"} onChange={() => toggleRule(rule.id)} /><span className={`text-xs ${rule.status === "Active" ? "text-green-600" : "text-neutral-400"}`}>{rule.status}</span></div></td>
              <td className="py-4"><button onClick={() => deleteRule(rule.id)} className="text-neutral-400 hover:text-red-500"><Trash2 className="size-4" /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      )}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAdd(false)} />
          <div className="relative z-10 w-full max-w-[560px] rounded-2xl bg-white p-8" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold text-neutral-900">Add Transaction Rule</h2><button onClick={() => setShowAdd(false)} className="text-neutral-400"><X className="size-5" /></button></div>
            <div className="flex flex-col gap-4">
              <Input label="Rule name" id="rn" value={newRule.name} onChange={(e) => setNewRule({ ...newRule, name: e.target.value })} />
              <Input label="Condition" id="rc" value={newRule.condition} onChange={(e) => setNewRule({ ...newRule, condition: e.target.value })} />
              <Input label="Action" id="ra" value={newRule.action} onChange={(e) => setNewRule({ ...newRule, action: e.target.value })} />
            </div>
            <div className="mt-5 flex justify-end gap-3"><Button variant="secondary" size="md" onClick={() => setShowAdd(false)}>Cancel</Button><Button variant="primary" size="md" onClick={addRule}>Add Rule</Button></div>
          </div>
        </div>
      )}
    </div></div>
  );
}
