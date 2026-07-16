"use client";

import { useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Download,
  FileJson2,
  Globe2,
  Languages,
  LayoutTemplate,
  Search,
  ShieldCheck,
  Sparkles,
  TextCursorInput,
} from "lucide-react";

type Role = "buyer" | "seller" | "admin" | "public";
type PreviewArea = "Marketplace" | "Orders" | "Logistics" | "Forms";
type Direction = "ltr" | "rtl";

interface TranslationItem {
  key: string;
  source: string;
  suggestion: string;
  area: PreviewArea;
  priority: "High" | "Medium" | "Low";
}

interface LocaleCopy {
  eyebrow: string;
  title: string;
  body: string;
  primary: string;
  secondary: string;
  search: string;
  verified: string;
  price: string;
  quantityError: string;
}

interface LanguageDefinition {
  code: string;
  label: string;
  locale: string;
  region: string;
  coverage: number;
  translated: number;
  total: number;
  direction: Direction;
  currency: string;
  distanceUnit: "mi" | "km";
  copy: LocaleCopy;
  queue: TranslationItem[];
}

const languages: LanguageDefinition[] = [
  {
    code: "EN",
    label: "English",
    locale: "en-US",
    region: "United States",
    coverage: 100,
    translated: 1842,
    total: 1842,
    direction: "ltr",
    currency: "USD",
    distanceUnit: "mi",
    copy: {
      eyebrow: "VERIFIED MARKETPLACE",
      title: "Source circular materials with confidence.",
      body: "Compare verified suppliers, landed cost, carbon impact, and delivery readiness in one place.",
      primary: "Browse materials",
      secondary: "View recommendations",
      search: "Search materials, suppliers, or locations",
      verified: "Verified supplier",
      price: "Estimated landed price",
      quantityError: "Enter a quantity greater than zero.",
    },
    queue: [],
  },
  {
    code: "ES",
    label: "Spanish",
    locale: "es-MX",
    region: "Mexico and US Spanish",
    coverage: 86,
    translated: 1584,
    total: 1842,
    direction: "ltr",
    currency: "MXN",
    distanceUnit: "km",
    copy: {
      eyebrow: "MERCADO VERIFICADO",
      title: "Obtenga materiales circulares con confianza.",
      body: "Compare proveedores verificados, costo total, impacto de carbono y preparación de entrega en un solo lugar.",
      primary: "Explorar materiales",
      secondary: "Ver recomendaciones",
      search: "Buscar materiales, proveedores o ubicaciones",
      verified: "Proveedor verificado",
      price: "Precio estimado con entrega",
      quantityError: "Ingrese una cantidad mayor que cero.",
    },
    queue: [
      {
        key: "checkout.taxDisclaimer",
        source: "Taxes and fees are estimated at checkout.",
        suggestion: "Los impuestos y cargos se estiman al finalizar la compra.",
        area: "Orders",
        priority: "High",
      },
      {
        key: "logistics.proofOfDelivery",
        source: "Proof of delivery is awaiting review.",
        suggestion: "El comprobante de entrega está pendiente de revisión.",
        area: "Logistics",
        priority: "Medium",
      },
      {
        key: "forms.bankLetterHelp",
        source: "Upload a current bank verification letter.",
        suggestion: "Cargue una carta de verificación bancaria vigente.",
        area: "Forms",
        priority: "Medium",
      },
    ],
  },
  {
    code: "FR",
    label: "French",
    locale: "fr-FR",
    region: "France and Francophone markets",
    coverage: 72,
    translated: 1326,
    total: 1842,
    direction: "ltr",
    currency: "EUR",
    distanceUnit: "km",
    copy: {
      eyebrow: "PLACE DE MARCHÉ VÉRIFIÉE",
      title: "Approvisionnez-vous en matériaux circulaires en toute confiance.",
      body: "Comparez les fournisseurs vérifiés, le coût livré, l’impact carbone et la disponibilité logistique.",
      primary: "Parcourir les matériaux",
      secondary: "Voir les recommandations",
      search: "Rechercher des matériaux, fournisseurs ou lieux",
      verified: "Fournisseur vérifié",
      price: "Prix livré estimé",
      quantityError: "Saisissez une quantité supérieure à zéro.",
    },
    queue: [
      {
        key: "orders.escrowRelease",
        source: "Escrow will be released after delivery confirmation.",
        suggestion:
          "Le séquestre sera libéré après confirmation de la livraison.",
        area: "Orders",
        priority: "High",
      },
      {
        key: "marketplace.carbonBadge",
        source: "Lowest carbon option",
        suggestion: "Option à plus faible empreinte carbone",
        area: "Marketplace",
        priority: "Medium",
      },
      {
        key: "forms.expirationDate",
        source: "Expiration date is required.",
        suggestion: "La date d’expiration est obligatoire.",
        area: "Forms",
        priority: "Low",
      },
    ],
  },
  {
    code: "PT",
    label: "Portuguese",
    locale: "pt-BR",
    region: "Brazil",
    coverage: 61,
    translated: 1124,
    total: 1842,
    direction: "ltr",
    currency: "BRL",
    distanceUnit: "km",
    copy: {
      eyebrow: "MERCADO VERIFICADO",
      title: "Encontre materiais circulares com confiança.",
      body: "Compare fornecedores verificados, custo entregue, impacto de carbono e prontidão logística.",
      primary: "Explorar materiais",
      secondary: "Ver recomendações",
      search: "Buscar materiais, fornecedores ou locais",
      verified: "Fornecedor verificado",
      price: "Preço entregue estimado",
      quantityError: "Informe uma quantidade maior que zero.",
    },
    queue: [
      {
        key: "logistics.deliveryWindow",
        source: "Select an available delivery window.",
        suggestion: "Selecione uma janela de entrega disponível.",
        area: "Logistics",
        priority: "High",
      },
      {
        key: "orders.paymentTerms",
        source: "Payment terms are under review.",
        suggestion: "As condições de pagamento estão em análise.",
        area: "Orders",
        priority: "Medium",
      },
      {
        key: "marketplace.savedSearch",
        source: "This search has been saved.",
        suggestion: "Esta busca foi salva.",
        area: "Marketplace",
        priority: "Low",
      },
    ],
  },
  {
    code: "VI",
    label: "Vietnamese",
    locale: "vi-VN",
    region: "Vietnam",
    coverage: 48,
    translated: 884,
    total: 1842,
    direction: "ltr",
    currency: "VND",
    distanceUnit: "km",
    copy: {
      eyebrow: "THỊ TRƯỜNG ĐÃ XÁC MINH",
      title: "Tìm nguồn vật liệu tuần hoàn một cách tin cậy.",
      body: "So sánh nhà cung cấp đã xác minh, chi phí giao hàng, tác động carbon và khả năng giao nhận.",
      primary: "Xem vật liệu",
      secondary: "Xem đề xuất",
      search: "Tìm vật liệu, nhà cung cấp hoặc địa điểm",
      verified: "Nhà cung cấp đã xác minh",
      price: "Giá giao hàng ước tính",
      quantityError: "Nhập số lượng lớn hơn không.",
    },
    queue: [
      {
        key: "forms.authorizedSigner",
        source: "An authorized signer is required.",
        suggestion: "Cần có người ký được ủy quyền.",
        area: "Forms",
        priority: "High",
      },
      {
        key: "logistics.exceptionStatus",
        source: "A delivery exception requires attention.",
        suggestion: "Một ngoại lệ giao hàng cần được xử lý.",
        area: "Logistics",
        priority: "High",
      },
      {
        key: "orders.contractRenewal",
        source: "Contract renewal is due soon.",
        suggestion: "Hợp đồng sắp đến hạn gia hạn.",
        area: "Orders",
        priority: "Medium",
      },
    ],
  },
  {
    code: "AR",
    label: "Arabic",
    locale: "ar-SA",
    region: "Middle East",
    coverage: 34,
    translated: 626,
    total: 1842,
    direction: "rtl",
    currency: "SAR",
    distanceUnit: "km",
    copy: {
      eyebrow: "سوق موثوق",
      title: "احصل على المواد الدائرية بثقة.",
      body: "قارن بين الموردين المعتمدين والتكلفة وأثر الكربون والاستعداد للتسليم في مكان واحد.",
      primary: "تصفح المواد",
      secondary: "عرض التوصيات",
      search: "ابحث عن المواد أو الموردين أو المواقع",
      verified: "مورد معتمد",
      price: "السعر التقديري شامل التسليم",
      quantityError: "أدخل كمية أكبر من صفر.",
    },
    queue: [
      {
        key: "marketplace.supplierDistance",
        source: "Supplier distance from your facility",
        suggestion: "مسافة المورد من منشأتك",
        area: "Marketplace",
        priority: "High",
      },
      {
        key: "orders.releaseStatus",
        source: "Funds are ready for release.",
        suggestion: "الأموال جاهزة للصرف.",
        area: "Orders",
        priority: "High",
      },
      {
        key: "forms.documentType",
        source: "Select a document type.",
        suggestion: "اختر نوع المستند.",
        area: "Forms",
        priority: "Medium",
      },
    ],
  },
];

const previewAreas: PreviewArea[] = [
  "Marketplace",
  "Orders",
  "Logistics",
  "Forms",
];

const areaOffsets: Record<PreviewArea, number> = {
  Marketplace: 4,
  Orders: -3,
  Logistics: -8,
  Forms: -12,
};

function pseudoLocalize(value: string) {
  const expanded = value.replace(/[aeiou]/gi, (letter) => `${letter}${letter}`);
  return `［${expanded}］`;
}

function previewContent(language: LanguageDefinition, area: PreviewArea) {
  if (area === "Orders") {
    return {
      title:
        language.code === "EN"
          ? "Order EG-50021 is ready for delivery"
          : language.copy.secondary,
      body:
        language.code === "EN"
          ? "Escrow is funded and the carrier has confirmed the receiving window."
          : language.copy.body,
      primary: language.code === "EN" ? "Review order" : language.copy.primary,
      secondary: language.copy.verified,
    };
  }
  if (area === "Logistics") {
    return {
      title:
        language.code === "EN"
          ? "Your shipment is arriving today"
          : language.copy.title,
      body:
        language.code === "EN"
          ? "GreenLine Logistics is 18 miles from the receiving facility."
          : language.copy.body,
      primary:
        language.code === "EN" ? "Track shipment" : language.copy.primary,
      secondary: language.copy.price,
    };
  }
  if (area === "Forms") {
    return {
      title:
        language.code === "EN"
          ? "Complete the order request"
          : language.copy.title,
      body: language.copy.quantityError,
      primary: language.code === "EN" ? "Continue" : language.copy.primary,
      secondary: language.copy.search,
    };
  }
  return {
    title: language.copy.title,
    body: language.copy.body,
    primary: language.copy.primary,
    secondary: language.copy.verified,
  };
}

export function LocalizationWorkspace({ role }: { role: Role }) {
  const [languageCode, setLanguageCode] = useState("ES");
  const [area, setArea] = useState<PreviewArea>("Marketplace");
  const [pseudo, setPseudo] = useState(false);
  const [selectedString, setSelectedString] = useState(0);
  const [draft, setDraft] = useState(languages[1].queue[0]?.suggestion ?? "");
  const [resolved, setResolved] = useState<Record<string, boolean>>({});
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState("");

  const selected =
    languages.find((language) => language.code === languageCode) ??
    languages[0];
  const queue = selected.queue;
  const activeString = queue[selectedString] ?? queue[0];
  const content = previewContent(selected, area);
  const completedForLocale = queue.filter(
    (item) => resolved[`${selected.code}:${item.key}`],
  ).length;
  const effectiveCoverage = Math.min(
    100,
    selected.coverage + completedForLocale,
  );

  const formatted = useMemo(() => {
    const currency = new Intl.NumberFormat(selected.locale, {
      style: "currency",
      currency: selected.currency,
      maximumFractionDigits: selected.currency === "VND" ? 0 : 2,
    }).format(1840);
    const date = new Intl.DateTimeFormat(selected.locale, {
      dateStyle: "long",
    }).format(new Date(2026, 6, 22));
    const quantity = new Intl.NumberFormat(selected.locale, {
      maximumFractionDigits: 1,
    }).format(1250.5);
    const distance =
      selected.distanceUnit === "mi"
        ? "186 mi"
        : `${new Intl.NumberFormat(selected.locale).format(299)} km`;
    return { currency, date, quantity, distance };
  }, [selected]);

  function changeLanguage(code: string) {
    const next =
      languages.find((language) => language.code === code) ?? languages[0];
    setLanguageCode(code);
    setSelectedString(0);
    setDraft(next.queue[0]?.suggestion ?? "");
    setNotice("");
  }

  function selectTranslation(index: number) {
    setSelectedString(index);
    setDraft(queue[index]?.suggestion ?? "");
  }

  function saveTranslation() {
    if (!activeString || !draft.trim()) return;
    setResolved((current) => ({
      ...current,
      [`${selected.code}:${activeString.key}`]: true,
    }));
    setNotice(`${activeString.key} saved for ${selected.label}.`);
  }

  function markReviewed() {
    setReviewed((current) => ({ ...current, [selected.code]: true }));
    setNotice(`${selected.label} locale marked ready for stakeholder review.`);
  }

  function exportLocale() {
    const payload = {
      locale: selected.locale,
      direction: selected.direction,
      messages: selected.copy,
      reviewed: Boolean(reviewed[selected.code]),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selected.locale}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice(`${selected.locale}.json export prepared.`);
  }

  const localized = (value: string) => (pseudo ? pseudoLocalize(value) : value);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl bg-neutral-950 text-white shadow-sm">
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-emerald-300">
              <Globe2 className="size-5" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                Localization control center
              </span>
            </div>
            <h2 className="mt-3 max-w-3xl text-2xl font-bold sm:text-3xl">
              Validate language quality before expanding into a new market.
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-neutral-300">
              Inspect translated experiences, coverage gaps, regional
              formatting, review status, and right-to-left readiness.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={pseudo}
              onClick={() => setPseudo((current) => !current)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${pseudo ? "bg-amber-300 text-amber-950" : "bg-white/10 text-white hover:bg-white/15"}`}
            >
              <Sparkles className="size-4" aria-hidden="true" />
              Pseudo-localization
            </button>
            <button
              type="button"
              onClick={exportLocale}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-sm font-bold text-emerald-950 hover:bg-emerald-300"
            >
              <Download className="size-4" aria-hidden="true" />
              Export locale
            </button>
          </div>
        </div>
        {notice && (
          <div
            className="border-t border-white/10 bg-white/5 px-5 py-3 text-sm text-emerald-200"
            role="status"
          >
            {notice}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200">
          <div className="flex items-center justify-between gap-3 px-1 pb-3">
            <div>
              <h2 className="font-bold text-neutral-950">Languages</h2>
              <p className="text-xs text-neutral-500">6 launch candidates</p>
            </div>
            <Languages className="size-5 text-emerald-700" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            {languages.map((language) => (
              <button
                key={language.code}
                type="button"
                aria-pressed={selected.code === language.code}
                onClick={() => changeLanguage(language.code)}
                className={`w-full rounded-xl p-3 text-left ring-1 transition ${selected.code === language.code ? "bg-neutral-950 text-white ring-neutral-950" : "bg-white text-neutral-900 ring-neutral-200 hover:bg-neutral-50"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{language.label}</p>
                    <p
                      className={`text-xs ${selected.code === language.code ? "text-neutral-300" : "text-neutral-500"}`}
                    >
                      {language.region}
                    </p>
                  </div>
                  <span className="font-mono text-xs">{language.code}</span>
                </div>
                <div
                  className={`mt-3 h-1.5 overflow-hidden rounded-full ${selected.code === language.code ? "bg-white/15" : "bg-neutral-100"}`}
                >
                  <span
                    className="block h-full rounded-full bg-emerald-400"
                    style={{ width: `${language.coverage}%` }}
                  />
                </div>
                <div
                  className={`mt-2 flex items-center justify-between text-xs ${selected.code === language.code ? "text-neutral-300" : "text-neutral-500"}`}
                >
                  <span>{language.coverage}% coverage</span>
                  <span>{language.direction.toUpperCase()}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Coverage"
              value={`${effectiveCoverage}%`}
              detail={`${selected.translated + completedForLocale} of ${selected.total} strings`}
              icon={Languages}
            />
            <MetricCard
              label="Review queue"
              value={String(Math.max(0, queue.length - completedForLocale))}
              detail="High and medium priority"
              icon={CircleAlert}
            />
            <MetricCard
              label="Text direction"
              value={selected.direction.toUpperCase()}
              detail={
                selected.direction === "rtl"
                  ? "Mirrored preview enabled"
                  : "Left-to-right layout"
              }
              icon={LayoutTemplate}
            />
            <MetricCard
              label="Review status"
              value={reviewed[selected.code] ? "Ready" : "In review"}
              detail={
                reviewed[selected.code]
                  ? "Stakeholder handoff approved"
                  : "Awaiting locale owner"
              }
              icon={ShieldCheck}
            />
          </div>

          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-neutral-950">
                  Localized experience preview
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Switch product areas to validate real marketplace copy in
                  context.
                </p>
              </div>
              <div
                className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"
                aria-label="Preview areas"
              >
                {previewAreas.map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={area === item}
                    onClick={() => setArea(item)}
                    className={`rounded-full px-3 py-2 text-xs font-bold ${area === item ? "bg-neutral-950 text-white" : "bg-neutral-50 text-neutral-600 ring-1 ring-neutral-200"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-950 via-emerald-950 to-slate-950 text-white">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 text-xs text-neutral-300">
                <span>
                  {selected.locale} · {selected.label}
                </span>
                <span>
                  {area} · {role}
                </span>
              </div>
              <div className="p-5 sm:p-8" dir={selected.direction}>
                <p className="text-xs font-semibold tracking-[0.2em] text-emerald-300">
                  {localized(selected.copy.eyebrow)}
                </p>
                <h3 className="mt-4 max-w-3xl text-3xl font-bold sm:text-4xl">
                  {localized(content.title)}
                </h3>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-300">
                  {localized(content.body)}
                </p>
                <div className="mt-6 max-w-2xl rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
                  <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-neutral-500">
                    <Search className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate text-sm">
                      {localized(selected.copy.search)}
                    </span>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="rounded-full bg-emerald-400 px-5 py-2.5 text-sm font-bold text-emerald-950"
                  >
                    {localized(content.primary)}
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-bold text-white ring-1 ring-white/20"
                  >
                    {localized(content.secondary)}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-neutral-950">
                Coverage by product area
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                See where untranslated or unreviewed copy remains.
              </p>
            </div>
            <FileJson2 className="size-5 text-neutral-400" aria-hidden="true" />
          </div>
          <div className="mt-6 space-y-4">
            {previewAreas.map((item) => {
              const coverage = Math.max(
                8,
                Math.min(100, effectiveCoverage + areaOffsets[item]),
              );
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setArea(item)}
                  className="w-full text-left"
                >
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-neutral-800">
                      {item}
                    </span>
                    <span className="text-neutral-500">{coverage}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-neutral-100">
                    <span
                      className={`block h-full rounded-full ${area === item ? "bg-emerald-600" : "bg-emerald-200"}`}
                      style={{ width: `${coverage}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <h2 className="text-lg font-bold text-neutral-950">
            Regional formatting
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Rendered with the selected locale—not hard-coded examples.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <FormatCard label="Currency" value={formatted.currency} />
            <FormatCard label="Quantity" value={`${formatted.quantity} t`} />
            <FormatCard label="Distance" value={formatted.distance} />
            <FormatCard label="Date" value={formatted.date} wide />
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
        <div className="flex flex-col gap-3 border-b border-neutral-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-neutral-950">
              Translation review queue
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Review high-impact strings before the locale advances.
            </p>
          </div>
          <button
            type="button"
            onClick={markReviewed}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-neutral-950 px-4 py-2 text-sm font-bold text-white"
          >
            <ShieldCheck className="size-4" aria-hidden="true" />
            {reviewed[selected.code]
              ? "Locale marked ready"
              : "Mark locale reviewed"}
          </button>
        </div>

        {queue.length ? (
          <div className="grid lg:grid-cols-[minmax(280px,0.75fr)_minmax(0,1.25fr)]">
            <div className="border-b border-neutral-100 p-4 lg:border-b-0 lg:border-r">
              <div className="space-y-2">
                {queue.map((item, index) => {
                  const isResolved = resolved[`${selected.code}:${item.key}`];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      aria-pressed={selectedString === index}
                      onClick={() => selectTranslation(index)}
                      className={`w-full rounded-xl p-3 text-left ring-1 ${selectedString === index ? "bg-neutral-950 text-white ring-neutral-950" : "bg-white text-neutral-900 ring-neutral-200 hover:bg-neutral-50"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-mono text-xs">{item.key}</span>
                        {isResolved ? (
                          <CheckCircle2
                            className="size-4 text-emerald-400"
                            aria-label="Saved"
                          />
                        ) : (
                          <PriorityBadge priority={item.priority} />
                        )}
                      </div>
                      <p
                        className={`mt-2 text-sm ${selectedString === index ? "text-neutral-300" : "text-neutral-500"}`}
                      >
                        {item.area}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
            {activeString && (
              <div className="p-5 sm:p-6">
                <div className="flex items-center gap-2">
                  <TextCursorInput
                    className="size-5 text-emerald-700"
                    aria-hidden="true"
                  />
                  <h3 className="font-bold text-neutral-950">
                    Translation editor
                  </h3>
                </div>
                <label className="mt-5 block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    English source
                  </span>
                  <textarea
                    readOnly
                    value={activeString.source}
                    className="min-h-24 w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700"
                  />
                </label>
                <label className="mt-4 block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    {selected.label} translation
                  </span>
                  <textarea
                    aria-label={`${selected.label} translation`}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    dir={selected.direction}
                    className="min-h-28 w-full rounded-xl border border-neutral-200 bg-white p-3 text-sm text-neutral-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-neutral-500">
                    Key: {activeString.key} · Area: {activeString.area}
                  </p>
                  <button
                    type="button"
                    disabled={!draft.trim()}
                    onClick={saveTranslation}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Check className="size-4" aria-hidden="true" />
                    Save translation
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-10 text-center">
            <CheckCircle2
              className="mx-auto size-8 text-emerald-600"
              aria-hidden="true"
            />
            <h3 className="mt-3 font-bold text-neutral-950">
              English source copy is complete
            </h3>
            <p className="mt-1 text-sm text-neutral-500">
              Select another locale to review translations and gaps.
            </p>
          </div>
        )}
      </section>

      <section className="grid gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:grid-cols-[auto_1fr]">
        <ChevronRight
          className="mt-0.5 size-5 text-blue-700"
          aria-hidden="true"
        />
        <div>
          <h2 className="font-bold text-blue-950">
            Localization readiness scope
          </h2>
          <p className="mt-1 text-sm text-blue-900/80">
            This interactive workspace validates content and presentation.
            Production rollout can later connect approved locale files to route
            prefixes, server-rendered metadata, translated validation, and
            persisted user preferences.
          </p>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Languages;
}) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200">
      <Icon
        className="size-8 rounded-xl bg-emerald-50 p-2 text-emerald-700"
        aria-hidden="true"
      />
      <p className="mt-3 text-xs font-medium text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-neutral-950">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{detail}</p>
    </section>
  );
}

function FormatCard({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={`rounded-xl bg-neutral-50 p-3 ${wide ? "col-span-2" : ""}`}>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-neutral-950">
        {value}
      </p>
    </div>
  );
}

function PriorityBadge({
  priority,
}: {
  priority: TranslationItem["priority"];
}) {
  const tone = {
    High: "bg-red-100 text-red-700",
    Medium: "bg-amber-100 text-amber-800",
    Low: "bg-blue-100 text-blue-700",
  }[priority];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tone}`}>
      {priority}
    </span>
  );
}
