import type { IncomingMessage, ServerResponse } from "node:http";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export type AuthContext = {
  userId: number;
  companyId?: number;
  isAdmin: boolean;
};

export type RouteMatch = {
  matched: boolean;
  params: Record<string, string>;
};

export function corsHeaders() {
  return {
    "access-control-allow-origin": process.env.CORS_ORIGIN ?? "*",
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
    "access-control-max-age": "86400",
  };
}

export function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    "content-type": "application/json",
    ...corsHeaders(),
  });
  response.end(JSON.stringify(body));
}

export function sendHtml(response: ServerResponse, status: number, body: string) {
  response.writeHead(status, {
    "content-type": "text/html; charset=utf-8",
    ...corsHeaders(),
  });
  response.end(body);
}

export async function readJsonBody<T extends Record<string, unknown>>(
  request: IncomingMessage,
) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) {
    return {} as Partial<T>;
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Partial<T>;
  } catch {
    throw new ApiError(400, "Request body must be valid JSON.");
  }
}

export function matchPath(pathname: string, pattern: string): RouteMatch {
  const pathParts = pathname.split("/").filter(Boolean);
  const patternParts = pattern.split("/").filter(Boolean);

  if (pathParts.length !== patternParts.length) {
    return { matched: false, params: {} };
  }

  const params: Record<string, string> = {};

  for (let index = 0; index < patternParts.length; index += 1) {
    const patternPart = patternParts[index];
    const pathPart = pathParts[index];

    if (!patternPart || !pathPart) {
      return { matched: false, params: {} };
    }

    if (patternPart.startsWith(":")) {
      params[patternPart.slice(1)] = decodeURIComponent(pathPart);
      continue;
    }

    if (patternPart !== pathPart) {
      return { matched: false, params: {} };
    }
  }

  return { matched: true, params };
}

export function parseId(value: string | undefined, label: string) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, `${label} must be a positive integer.`);
  }

  return id;
}

export function getRequiredString(
  body: Partial<Record<string, unknown>>,
  key: string,
  maxLength = 240,
) {
  const value = body[key];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(400, `${key} is required.`);
  }

  const trimmed = value.trim();

  if (trimmed.length > maxLength) {
    throw new ApiError(400, `${key} must be ${maxLength} characters or fewer.`);
  }

  return trimmed;
}

export function getOptionalString(
  body: Partial<Record<string, unknown>>,
  key: string,
  maxLength = 240,
) {
  const value = body[key];

  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ApiError(400, `${key} must be a string.`);
  }

  const trimmed = value.trim();

  if (trimmed.length > maxLength) {
    throw new ApiError(400, `${key} must be ${maxLength} characters or fewer.`);
  }

  return trimmed.length > 0 ? trimmed : undefined;
}

export function getOptionalNumber(body: Partial<Record<string, unknown>>, key: string) {
  const value = body[key];

  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new ApiError(400, `${key} must be a number.`);
  }

  return parsed;
}

export function getOptionalBoolean(body: Partial<Record<string, unknown>>, key: string) {
  const value = body[key];

  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new ApiError(400, `${key} must be a boolean.`);
  }

  return value;
}
