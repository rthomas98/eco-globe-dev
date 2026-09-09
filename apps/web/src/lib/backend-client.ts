"use client";

import { COOKIE_SESSION_TOKEN } from "./demo-user";

/**
 * Default deadline for a single backend request made from the browser.
 * The Next.js proxy applies its own upstream deadline; this one guarantees
 * the UI never waits forever on a stalled connection.
 */
export const BACKEND_REQUEST_DEADLINE_MS = 20_000;

export type BackendErrorKind =
  | "timeout"
  | "network"
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "validation"
  | "server"
  | "unknown";

export class BackendApiError extends Error {
  readonly kind: BackendErrorKind;

  constructor(
    message: string,
    public readonly status?: number,
    kind?: BackendErrorKind,
  ) {
    super(message);
    this.name = "BackendApiError";
    this.kind = kind ?? kindFromStatus(status);
  }

  /** True when retrying the same request is reasonable. */
  get retryable() {
    return (
      this.kind === "timeout" ||
      this.kind === "network" ||
      this.kind === "server"
    );
  }
}

function kindFromStatus(status?: number): BackendErrorKind {
  if (status === undefined) return "unknown";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not-found";
  if (status === 409) return "conflict";
  if (status === 408 || status === 504) return "timeout";
  if (status === 502 || status === 503) return "network";
  if (status >= 500) return "server";
  if (status >= 400) return "validation";
  return "unknown";
}

export function isBackendApiError(error: unknown): error is BackendApiError {
  return error instanceof BackendApiError;
}

/** Human-readable message for any thrown value, with a stable fallback. */
export function describeBackendError(error: unknown, fallback: string) {
  if (error instanceof BackendApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

type ApiFetchOptions = RequestInit & {
  token?: string;
  /** Override the default deadline in milliseconds. */
  deadlineMs?: number;
  /** Set when the body is not JSON (for example multipart uploads). */
  rawBody?: boolean;
};

function parseJson(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function extractErrorMessage(body: unknown, status: number) {
  const record =
    body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : undefined;
  if (typeof record?.error === "string") return record.error;
  if (typeof record?.message === "string") return record.message;
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have access to this resource.";
  if (status === 404) return "The requested record was not found.";
  if (status === 504) return "The EcoGlobe backend took too long to respond.";
  if (status === 502 || status === 503)
    return "The EcoGlobe backend is unavailable right now.";
  return "The EcoGlobe backend did not accept this request.";
}

/**
 * Fetch a backend path through the same-origin proxy with a hard deadline.
 * Resolves with the parsed JSON body; throws `BackendApiError` on failure.
 */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const {
    token,
    headers,
    deadlineMs = BACKEND_REQUEST_DEADLINE_MS,
    rawBody = false,
    signal,
    ...requestOptions
  } = options;

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), deadlineMs);
  const forwardAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", forwardAbort, { once: true });
  }
  const cleanup = () => {
    window.clearTimeout(timer);
    signal?.removeEventListener("abort", forwardAbort);
  };
  const timeoutError = () =>
    new BackendApiError(
      `The request timed out after ${Math.round(deadlineMs / 1000)} seconds. Nothing you entered was lost; please try again.`,
      undefined,
      "timeout",
    );

  let response: Response;
  let text: string;
  try {
    response = await fetch(`/api/backend${path}`, {
      ...requestOptions,
      credentials: "same-origin",
      signal: controller.signal,
      headers: {
        ...(rawBody ? {} : { "content-type": "application/json" }),
        ...(token && token !== COOKIE_SESSION_TOKEN
          ? { authorization: `Bearer ${token}` }
          : {}),
        ...headers,
      },
    });
    // The deadline covers body consumption too: a stalled body must not leave
    // the UI in a "Saving…" state forever.
    text = await response.text();
  } catch (error) {
    cleanup();
    if (signal?.aborted) throw error;
    if (controller.signal.aborted) throw timeoutError();
    throw new BackendApiError(
      "Could not reach the EcoGlobe backend. Check your connection and try again.",
      undefined,
      "network",
    );
  }
  cleanup();

  const body = parseJson(text);

  if (!response.ok) {
    throw new BackendApiError(
      extractErrorMessage(body, response.status),
      response.status,
    );
  }

  return body as T;
}

/** Fetch a binary/download backend path with the same deadline handling. */
export async function apiFetchBlob(
  path: string,
  options: Pick<ApiFetchOptions, "deadlineMs" | "token"> = {},
): Promise<{ blob: Blob; contentType: string | null; fileName: string | null }> {
  const { deadlineMs = BACKEND_REQUEST_DEADLINE_MS, token } = options;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), deadlineMs);
  let response: Response;
  let blob: Blob;
  let errorText = "";
  try {
    response = await fetch(`/api/backend${path}`, {
      credentials: "same-origin",
      signal: controller.signal,
      headers:
        token && token !== COOKIE_SESSION_TOKEN
          ? { authorization: `Bearer ${token}` }
          : undefined,
    });
    if (response.ok) blob = await response.blob();
    else {
      errorText = await response.text();
      blob = new Blob();
    }
  } catch {
    throw new BackendApiError(
      controller.signal.aborted
        ? "The download timed out. Please try again."
        : "Could not reach the EcoGlobe backend.",
      undefined,
      controller.signal.aborted ? "timeout" : "network",
    );
  } finally {
    window.clearTimeout(timer);
  }
  if (!response.ok) {
    throw new BackendApiError(
      extractErrorMessage(parseJson(errorText), response.status),
      response.status,
    );
  }
  const disposition = response.headers.get("content-disposition");
  const match = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return {
    blob,
    contentType: response.headers.get("content-type"),
    fileName: match ? decodeURIComponent(match[1]) : null,
  };
}
