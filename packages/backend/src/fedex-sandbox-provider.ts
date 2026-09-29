import { ApiError } from "./http.js";
import { createHash } from "node:crypto";
export function record(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw new ApiError(502, "Invalid FedEx response.");
  return v as Record<string, unknown>;
}
export class FedExRejectedError extends ApiError {}
function inputRecord(v: unknown) {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw new ApiError(400, "Address and package objects are required.");
  return v as Record<string, unknown>;
}
export const array = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
function text(v: unknown, max = 100, optional = false): string {
  if (optional && (v === undefined || v === null || v === "")) return "";
  if (
    typeof v !== "string" ||
    !v.trim() ||
    v.length > max ||
    /[\x00-\x1f]/.test(v)
  )
    throw new ApiError(400, "Invalid or missing address/contact field.");
  return v.trim();
}
export function validateFedExInput(body: Record<string, unknown>) {
  const address = (v: unknown) => {
    const a = inputRecord(v);
    if (a.countryCode !== "US")
      throw new ApiError(400, "US domestic sandbox shipments only.");
    const state = text(a.stateOrProvince, 2);
    if (!/^[A-Z]{2}$/.test(state))
      throw new ApiError(400, "Use a two-letter state code.");
    const postal = text(a.postalCode, 10);
    if (!/^\d{5}(-\d{4})?$/.test(postal))
      throw new ApiError(400, "Use a US ZIP code.");
    const phone = text(a.phone, 20);
    if (!/^\+?[\d ()-]{10,20}$/.test(phone))
      throw new ApiError(400, "Valid phone required.");
    return {
      name: text(a.name, 70),
      company: text(a.company, 70, true),
      phone,
      street1: text(a.street1, 100),
      street2: text(a.street2, 100, true),
      city: text(a.city, 50),
      stateOrProvince: state,
      postalCode: postal,
      countryCode: "US",
      residential: a.residential === true,
    };
  };
  if (body.service !== "STANDARD_OVERNIGHT")
    throw new ApiError(
      400,
      "Only verified Express Standard Overnight is available in this sandbox. Ground is not authorized.",
    );
  const pkg = inputRecord(body.package);
  const n = (k: string, max: number) => {
    const v = pkg[k];
    if (typeof v !== "number" || !Number.isFinite(v) || v <= 0 || v > max)
      throw new ApiError(400, `Invalid ${k}.`);
    return v;
  };
  const box = {
    weightLb: n("weightLb", 150),
    lengthIn: n("lengthIn", 108),
    widthIn: n("widthIn", 108),
    heightIn: n("heightIn", 108),
  };
  if (box.lengthIn + 2 * (box.widthIn + box.heightIn) > 165)
    throw new ApiError(
      400,
      "Package exceeds sandbox parcel size limits. Use staff freight coordination.",
    );
  return {
    service: "STANDARD_OVERNIGHT",
    shipper: address(body.shipper),
    recipient: address(body.recipient),
    package: box,
  };
}
export type FedExInput = ReturnType<typeof validateFedExInput>;
export function fedexConfig() {
  const {
    FEDEX_MODE,
    FEDEX_CLIENT_ID,
    FEDEX_CLIENT_SECRET,
    FEDEX_ACCOUNT_NUMBER,
  } = process.env;
  if (
    FEDEX_MODE !== "sandbox" ||
    !FEDEX_CLIENT_ID ||
    !FEDEX_CLIENT_SECRET ||
    !FEDEX_ACCOUNT_NUMBER
  )
    throw new ApiError(503, "FedEx sandbox is not configured.");
  return {
    clientId: FEDEX_CLIENT_ID,
    secret: FEDEX_CLIENT_SECRET,
    account: FEDEX_ACCOUNT_NUMBER,
    scope: createHash("sha256")
      .update(`${FEDEX_CLIENT_ID}:${FEDEX_ACCOUNT_NUMBER}`)
      .digest("hex"),
  };
}
let cached: { key: string; token: string; until: number } | undefined;
async function token() {
  const c = fedexConfig();
  if (cached?.key === c.scope && cached.until > Date.now()) return cached.token;
  const r = await fetch("https://apis-sandbox.fedex.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: c.clientId,
      client_secret: c.secret,
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new ApiError(502, "FedEx sandbox authentication failed.");
  const d = record(await r.json());
  if (typeof d.access_token !== "string")
    throw new ApiError(502, "FedEx did not return an access token.");
  cached = {
    key: c.scope,
    token: d.access_token,
    until: Date.now() + Math.min(3000, Number(d.expires_in) || 0) * 1000,
  };
  return cached.token;
}
export async function fedexCall(path: string, body: unknown, method = "POST") {
  let accessToken: string;
  try {
    accessToken = await token();
  } catch {
    throw new FedExRejectedError(
      502,
      "FedEx sandbox authentication failed before shipment submission.",
    );
  }
  const r = await fetch(`https://apis-sandbox.fedex.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "x-locale": "en_US",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  let raw: unknown;
  try {
    raw = await r.json();
  } catch {
    throw new ApiError(502, `FedEx sandbox returned HTTP ${r.status}.`);
  }
  const d = record(raw);
  if (!r.ok) {
    const error = array(d.errors)[0];
    const code =
      error &&
      typeof error === "object" &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code.replace(/[^A-Z0-9._-]/g, "").slice(0, 100)
        : "REQUEST_FAILED";
    throw new (
      r.status >= 400 && r.status < 500 ? FedExRejectedError : ApiError
    )(502, `FedEx sandbox ${code} (HTTP ${r.status}).`);
  }
  return record(d.output);
}
const providerAddress = (a: FedExInput["shipper"]) => ({
  streetLines: [a.street1, ...(a.street2 ? [a.street2] : [])],
  city: a.city,
  stateOrProvinceCode: a.stateOrProvince,
  postalCode: a.postalCode,
  countryCode: a.countryCode,
  residential: a.residential,
});
function base(input: FedExInput) {
  return {
    shipper: { address: providerAddress(input.shipper) },
    recipient: { address: providerAddress(input.recipient) },
    pickupType: "DROPOFF_AT_FEDEX_LOCATION",
    serviceType: input.service,
    packagingType: "YOUR_PACKAGING",
    rateRequestType: ["ACCOUNT"],
    requestedPackageLineItems: [
      {
        weight: { units: "LB", value: input.package.weightLb },
        dimensions: {
          length: Math.ceil(input.package.lengthIn),
          width: Math.ceil(input.package.widthIn),
          height: Math.ceil(input.package.heightIn),
          units: "IN",
        },
      },
    ],
  };
}
export async function fedexQuote(input: FedExInput) {
  const d = await fedexCall("/rate/v1/rates/quotes", {
    accountNumber: { value: fedexConfig().account },
    requestedShipment: base(input),
  });
  const detail = array(d.rateReplyDetails)
    .map(record)
    .find((r) => r.serviceType === input.service);
  const rate =
    detail &&
    array(detail.ratedShipmentDetails)
      .map(record)
      .find((r) => r.rateType === "ACCOUNT");
  if (
    !rate ||
    typeof rate.totalNetCharge !== "number" ||
    rate.currency !== "USD" ||
    rate.totalNetCharge <= 0
  )
    throw new ApiError(
      502,
      "FedEx did not return a supported USD account rate.",
    );
  const cents = Math.round(rate.totalNetCharge * 100);
  if (!Number.isSafeInteger(cents))
    throw new ApiError(502, "Invalid FedEx rate.");
  return { amountCents: cents, currency: "USD", rateType: "ACCOUNT" };
}
export async function fedexBook(input: FedExInput, reference: string) {
  const contact = (a: FedExInput["shipper"]) => ({
    contact: {
      personName: a.name,
      phoneNumber: a.phone,
      companyName: a.company || a.name,
    },
    address: providerAddress(a),
  });
  const b = base(input);
  const { recipient, ...other } = b;
  void recipient;
  const d = await fedexCall("/ship/v1/shipments", {
    labelResponseOptions: "LABEL",
    accountNumber: { value: fedexConfig().account },
    requestedShipment: {
      ...other,
      shipper: contact(input.shipper),
      recipients: [contact(input.recipient)],
      shippingChargesPayment: { paymentType: "SENDER" },
      labelSpecification: {
        imageType: "PDF",
        labelStockType: "PAPER_85X11_TOP_HALF_LABEL",
      },
      totalPackageCount: 1,
      requestedPackageLineItems: b.requestedPackageLineItems.map((p) => ({
        ...p,
        customerReferences: [
          { customerReferenceType: "CUSTOMER_REFERENCE", value: reference },
        ],
      })),
    },
  });
  const shipment = record(array(d.transactionShipments)[0]);
  const tracking = shipment.masterTrackingNumber;
  if (typeof tracking !== "string" || !/^\d{8,30}$/.test(tracking))
    throw new ApiError(
      502,
      "FedEx shipment response has no valid tracking number.",
    );
  const doc = array(record(array(shipment.pieceResponses)[0]).packageDocuments)
    .map(record)
    .find((d) => typeof d.encodedLabel === "string");
  if (!doc || typeof doc.encodedLabel !== "string")
    throw new ApiError(502, "FedEx did not return PDF label bytes.");
  const label = Buffer.from(doc.encodedLabel, "base64");
  if (
    label.length > 4 * 1024 * 1024 ||
    label.subarray(0, 5).toString() !== "%PDF-"
  )
    throw new ApiError(502, "FedEx returned an invalid PDF label.");
  return { tracking, label };
}
export async function fedexTrack(tracking: string) {
  const d = await fedexCall("/track/v1/trackingnumbers", {
    includeDetailedScans: true,
    trackingInfo: [{ trackingNumberInfo: { trackingNumber: tracking } }],
  });
  const group = array(d.completeTrackResults)
    .map(record)
    .find((r) => r.trackingNumber === tracking);
  const result = group && array(group.trackResults)[0];
  if (!result)
    throw new ApiError(502, "FedEx returned no matching tracking result.");
  const r = record(result);
  if (r.error)
    throw new ApiError(
      502,
      "FedEx sandbox has no tracking result for this shipment.",
    );
  const status = record(r.latestStatusDetail);
  return {
    status: typeof status.code === "string" ? status.code : null,
    description:
      typeof status.description === "string" ? status.description : null,
    lastEventAt:
      array(r.scanEvents)
        .map(record)
        .map((e) => e.date)
        .filter(
          (date): date is string =>
            typeof date === "string" && Number.isFinite(Date.parse(date)),
        )
        .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null,
    refreshedAt: new Date().toISOString(),
    virtualized: true,
    events: array(r.scanEvents)
      .slice(0, 30)
      .map((e) => {
        const x = record(e);
        return {
          at: typeof x.date === "string" ? x.date : null,
          description:
            typeof x.eventDescription === "string" ? x.eventDescription : null,
        };
      }),
  };
}
export async function fedexCancel(tracking: string) {
  const d = await fedexCall(
    "/ship/v1/shipments/cancel",
    {
      accountNumber: { value: fedexConfig().account },
      trackingNumber: tracking,
      deletionControl: "DELETE_ALL_PACKAGES",
    },
    "PUT",
  );
  if (d.cancelledShipment !== true)
    throw new ApiError(502, "FedEx did not confirm cancellation.");
}
