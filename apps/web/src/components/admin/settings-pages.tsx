"use client";

import { useState, useEffect } from "react";
import { Trash2, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button, Input } from "@eco-globe/ui";

/* ═══════════════════════════════════════════
   SHARED HELPERS
   ═══════════════════════════════════════════ */
function useLocalStorage<T>(key: string, defaultValue: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(defaultValue);
  useEffect(() => {
    const stored = localStorage.getItem(key);
    if (stored) setValue(JSON.parse(stored));
  }, [key]);
  const set = (v: T) => { setValue(v); localStorage.setItem(key, JSON.stringify(v)); };
  return [value, set];
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-neutral-900" : "bg-neutral-200"}`}>
      <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform shadow-sm ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-5" style={{ borderBottom: "1px solid #F0F0F0" }}>
      <div><p className="text-sm font-medium text-neutral-900">{label}</p>{description && <p className="mt-0.5 text-xs text-neutral-500">{description}</p>}</div>
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
interface Category { id: string; name: string; subcategories: string[]; status: "Active" | "Inactive"; }

const defaultCategories: Category[] = [
  { id: "1", name: "Plastics", subcategories: ["HDPE", "LDPE", "PET", "PVC", "Polypropylene"], status: "Active" },
  { id: "2", name: "Biomass & Wood", subcategories: ["Wood Chips", "Sawdust", "Bark", "Pellets"], status: "Active" },
  { id: "3", name: "Rubber & Tire-Derived", subcategories: ["Crumb Rubber", "Tire Chips", "Rubber Mulch"], status: "Active" },
  { id: "4", name: "Oils & Liquid Feedstocks", subcategories: ["Used Cooking Oil", "Waste Oil", "Biodiesel"], status: "Active" },
  { id: "5", name: "Metals & Alloys", subcategories: ["Aluminum", "Copper", "Steel Scrap"], status: "Inactive" },
  { id: "6", name: "Paper & Cardboard", subcategories: ["OCC", "Mixed Paper", "Newsprint"], status: "Active" },
  { id: "7", name: "Textiles", subcategories: ["Cotton Waste", "Polyester Scrap", "Nylon"], status: "Active" },
  { id: "8", name: "Glass", subcategories: ["Clear Glass", "Colored Glass", "Cullet"], status: "Inactive" },
];

export function CategoriesPage() {
  const [categories, setCategories] = useLocalStorage<Category[]>("ecoglobe_categories", defaultCategories);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => { setExpanded((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; }); };

  const addCategory = () => {
    if (!newName.trim()) return;
    setCategories([...categories, { id: Date.now().toString(), name: newName, subcategories: [], status: "Active" }]);
    setNewName(""); setShowAdd(false);
  };

  const deleteCategory = (id: string) => setCategories(categories.filter((c) => c.id !== id));
  const toggleStatus = (id: string) => setCategories(categories.map((c) => c.id === id ? { ...c, status: c.status === "Active" ? "Inactive" : "Active" } : c));

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="px-6 py-5">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-900">Product Categories</h1>
          <Button variant="primary" size="md" onClick={() => setShowAdd(true)}>Add Category</Button>
        </div>
        <div className="flex flex-col">
          {categories.map((cat) => (
            <div key={cat.id} className="rounded-xl mb-3" style={{ border: "1px solid #F0F0F0" }}>
              <div className="flex items-center justify-between px-5 py-4">
                <button onClick={() => toggleExpand(cat.id)} className="flex flex-1 items-center gap-3">
                  {expanded.has(cat.id) ? <ChevronUp className="size-4 text-neutral-400" /> : <ChevronDown className="size-4 text-neutral-400" />}
                  <span className="text-sm font-semibold text-neutral-900">{cat.name}</span>
                  <span className="text-xs text-neutral-400">{cat.subcategories.length} subcategories</span>
                </button>
                <div className="flex items-center gap-4">
                  <Toggle checked={cat.status === "Active"} onChange={() => toggleStatus(cat.id)} />
                  <span className={`text-xs font-medium ${cat.status === "Active" ? "text-green-600" : "text-neutral-400"}`}>{cat.status}</span>
                  <button onClick={() => deleteCategory(cat.id)} className="text-neutral-400 hover:text-red-500"><Trash2 className="size-4" /></button>
                </div>
              </div>
              {expanded.has(cat.id) && (
                <div className="px-5 pb-4">
                  <div className="flex flex-wrap gap-2">
                    {cat.subcategories.map((sub, i) => (
                      <span key={i} className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">{sub}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowAdd(false)} />
            <div className="relative z-10 w-full max-w-[460px] rounded-2xl bg-white p-8" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
              <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold text-neutral-900">Add Category</h2><button onClick={() => setShowAdd(false)} className="text-neutral-400"><X className="size-5" /></button></div>
              <Input label="Category name" id="catName" placeholder="Enter category name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <div className="mt-5 flex justify-end gap-3"><Button variant="secondary" size="md" onClick={() => setShowAdd(false)}>Cancel</Button><Button variant="primary" size="md" onClick={addCategory}>Add Category</Button></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SELLER SETTINGS
   ═══════════════════════════════════════════ */
export function SellerSettingsPage() {
  const [settings, setSettings] = useLocalStorage("ecoglobe_seller_settings", {
    autoApprove: false, requireVerification: true, maxListings: "50", commissionRate: "5",
    requireCarbonData: true, minOrderValue: "100", allowDraftListings: true, requireInsurance: false,
  });
  const up = (k: string, v: string | boolean) => setSettings({ ...settings, [k]: v });

  return (
    <div className="flex h-full flex-col overflow-y-auto"><div className="max-w-[800px] px-6 py-5">
      <h1 className="mb-6 text-2xl font-bold text-neutral-900">Seller Settings</h1>
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
    </div></div>
  );
}

/* ═══════════════════════════════════════════
   BUYER SETTINGS
   ═══════════════════════════════════════════ */
export function BuyerSettingsPage() {
  const [settings, setSettings] = useLocalStorage("ecoglobe_buyer_settings", {
    autoApprove: true, requireCompanyInfo: true, allowGuestBrowse: true, requirePaymentMethod: false,
    maxOrdersPerDay: "10", enableWishlist: true, enablePriceAlerts: true, requireShippingAddress: true,
  });
  const up = (k: string, v: string | boolean) => setSettings({ ...settings, [k]: v });

  return (
    <div className="flex h-full flex-col overflow-y-auto"><div className="max-w-[800px] px-6 py-5">
      <h1 className="mb-6 text-2xl font-bold text-neutral-900">Buyer Settings</h1>
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
    </div></div>
  );
}

/* ═══════════════════════════════════════════
   ESCROW SETTINGS
   ═══════════════════════════════════════════ */
export function EscrowSettingsPage() {
  const [settings, setSettings] = useLocalStorage("ecoglobe_escrow_settings", {
    autoRelease: false, releaseDays: "7", disputeWindow: "14", requireBuyerConfirmation: true,
    escrowFeePercent: "1.5", minEscrowAmount: "500", enablePartialRelease: false, autoRefundOnCancel: true,
  });
  const up = (k: string, v: string | boolean) => setSettings({ ...settings, [k]: v });

  return (
    <div className="flex h-full flex-col overflow-y-auto"><div className="max-w-[800px] px-6 py-5">
      <h1 className="mb-6 text-2xl font-bold text-neutral-900">Escrow Settings</h1>
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
    </div></div>
  );
}

/* ═══════════════════════════════════════════
   PAYMENT SETTINGS
   ═══════════════════════════════════════════ */
export function PaymentSettingsPage() {
  const [settings, setSettings] = useLocalStorage("ecoglobe_payment_settings", {
    enableStripe: true, enableBankTransfer: true, enableACH: false,
    currency: "USD", taxRate: "7.5", enableInvoicing: true, payoutSchedule: "weekly",
    requireTaxId: true, enableMultiCurrency: false,
  });
  const up = (k: string, v: string | boolean) => setSettings({ ...settings, [k]: v });

  const payoutOptions = [{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "biweekly", label: "Bi-weekly" }, { value: "monthly", label: "Monthly" }];
  const currencyOptions = [{ value: "USD", label: "USD ($)" }, { value: "EUR", label: "EUR (€)" }, { value: "GBP", label: "GBP (£)" }];

  return (
    <div className="flex h-full flex-col overflow-y-auto"><div className="max-w-[800px] px-6 py-5">
      <h1 className="mb-6 text-2xl font-bold text-neutral-900">Payment Settings</h1>
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
    </div></div>
  );
}

/* ═══════════════════════════════════════════
   TRANSACTION RULES
   ═══════════════════════════════════════════ */
interface TxnRule { id: string; name: string; condition: string; action: string; status: "Active" | "Inactive"; }

const defaultRules: TxnRule[] = [
  { id: "1", name: "High-value transaction alert", condition: "Transaction amount > $100,000", action: "Require admin approval", status: "Active" },
  { id: "2", name: "New seller first transaction", condition: "Seller has 0 completed orders", action: "Hold in escrow for 14 days", status: "Active" },
  { id: "3", name: "Repeat buyer discount", condition: "Buyer has > 10 completed orders", action: "Apply 2% discount", status: "Inactive" },
  { id: "4", name: "Cross-border transaction", condition: "Buyer and seller in different countries", action: "Add compliance review step", status: "Active" },
  { id: "5", name: "Bulk order threshold", condition: "Order quantity > 50 tons", action: "Require manager sign-off", status: "Active" },
  { id: "6", name: "Sustainability bonus", condition: "Product has verified carbon data", action: "Highlight in marketplace", status: "Active" },
  { id: "7", name: "Dispute prevention", condition: "Seller dispute rate > 5%", action: "Flag for review before new orders", status: "Inactive" },
];

export function TransactionRulesPage() {
  const [rules, setRules] = useLocalStorage<TxnRule[]>("ecoglobe_txn_rules", defaultRules);
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
    <div className="flex h-full flex-col overflow-y-auto"><div className="px-6 py-5">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Transaction Rules</h1>
        <Button variant="primary" size="md" onClick={() => setShowAdd(true)}>Add Rule</Button>
      </div>
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
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAdd(false)} />
          <div className="relative z-10 w-full max-w-[560px] rounded-2xl bg-white p-8" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold text-neutral-900">Add Transaction Rule</h2><button onClick={() => setShowAdd(false)} className="text-neutral-400"><X className="size-5" /></button></div>
            <div className="flex flex-col gap-4">
              <Input label="Rule name" id="rn" placeholder="e.g. High-value alert" value={newRule.name} onChange={(e) => setNewRule({ ...newRule, name: e.target.value })} />
              <Input label="Condition" id="rc" placeholder="e.g. Amount > $100,000" value={newRule.condition} onChange={(e) => setNewRule({ ...newRule, condition: e.target.value })} />
              <Input label="Action" id="ra" placeholder="e.g. Require admin approval" value={newRule.action} onChange={(e) => setNewRule({ ...newRule, action: e.target.value })} />
            </div>
            <div className="mt-5 flex justify-end gap-3"><Button variant="secondary" size="md" onClick={() => setShowAdd(false)}>Cancel</Button><Button variant="primary" size="md" onClick={addRule}>Add Rule</Button></div>
          </div>
        </div>
      )}
    </div></div>
  );
}
