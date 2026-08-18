import { ApiError } from "./http.js";

const RESEND_API_URL = "https://api.resend.com/emails";
const DEFAULT_FROM_EMAIL = "noreply@ecoglobeworld.com";
const DEFAULT_TEST_RECIPIENT = "kate@leapprosolutions.com";

export type EcoGlobeEmail = {
  to?: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export type ResendEmailPayload = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text?: string;
};

export type EmailConfig = {
  configured: boolean;
  from: string;
  testRecipient: string;
  overrideRecipients: boolean;
};

function splitRecipients(value: string | string[] | undefined) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values
    .flatMap((item) => item.split(","))
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function getEmailConfig(): EmailConfig {
  const from = process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM_EMAIL;
  const testRecipient =
    process.env.ECOGLOBE_EMAIL_TEST_RECIPIENT?.trim() || DEFAULT_TEST_RECIPIENT;
  const overrideRecipients =
    process.env.ECOGLOBE_EMAIL_OVERRIDE_ALL === "true" ||
    (process.env.NODE_ENV !== "production" &&
      process.env.ECOGLOBE_EMAIL_OVERRIDE_ALL !== "false");

  return {
    configured: Boolean(process.env.RESEND_API_KEY?.trim()),
    from,
    testRecipient,
    overrideRecipients,
  };
}

export function buildResendPayload(input: EcoGlobeEmail): ResendEmailPayload {
  const config = getEmailConfig();
  const requestedRecipients = splitRecipients(input.to);
  const recipients = config.overrideRecipients
    ? [config.testRecipient]
    : requestedRecipients;

  if (recipients.length === 0) {
    throw new ApiError(400, "At least one email recipient is required.");
  }

  if (!input.subject.trim()) {
    throw new ApiError(400, "Email subject is required.");
  }

  if (!input.html.trim()) {
    throw new ApiError(400, "Email HTML is required.");
  }

  return {
    from: config.from,
    to: recipients,
    subject: input.subject.trim(),
    html: input.html,
    ...(input.text?.trim() ? { text: input.text.trim() } : {}),
  };
}

export async function sendEcoGlobeEmail(input: EcoGlobeEmail) {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    throw new ApiError(
      503,
      "Resend is not configured. Set RESEND_API_KEY on the backend server.",
    );
  }

  const payload = buildResendPayload(input);
  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const rawBody = await response.text();
  let body: unknown;

  try {
    body = rawBody ? JSON.parse(rawBody) : undefined;
  } catch {
    body = undefined;
  }

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "message" in body
        ? String(body.message)
        : `Resend rejected the email (${response.status}).`;
    throw new ApiError(response.status, message);
  }

  const id =
    body && typeof body === "object" && "id" in body
      ? String(body.id)
      : undefined;

  return { id, payload };
}
