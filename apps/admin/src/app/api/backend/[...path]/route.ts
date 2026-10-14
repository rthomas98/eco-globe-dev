import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  MARKET_RECORD_IMPORT_DEADLINE_MS,
  isLongMarketRecordWrite,
} from "@/lib/market-record-proxy";

const BACKEND_URL =
  process.env.ECOGLOBE_API_BASE_URL?.replace(/\/$/, "") ??
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:4050";
const SESSION_COOKIE = "ecoglobe.session";

type RouteContext = { params: Promise<{ path: string[] }> };

// Matches the web proxy so private downloads (for example FedEx sandbox test
// labels) keep their filename and no-store caching. Content-Length is left to
// Next.js because the login response body is rewritten below.
const FORWARDED_RESPONSE_HEADERS = [
  "content-type",
  "content-disposition",
  "x-content-type-options",
  // Private PDF downloads carry a sandboxing policy that must reach the browser.
  "content-security-policy",
  "cache-control",
  "etag",
  "last-modified",
];

function responseHeaders(response: Response) {
  const headers = new Headers();
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

async function proxy(request: Request, { params }: RouteContext) {
  const { path } = await params;
  const pathname = `/${path.join("/")}`;
  const target = `${BACKEND_URL}${pathname}${new URL(request.url).search}`;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const accept = request.headers.get("accept");
  if (accept) headers.set("accept", accept);
  if (sessionToken) headers.set("authorization", `Bearer ${sessionToken}`);

  const body = ["GET", "HEAD"].includes(request.method)
    ? undefined
    : await request.arrayBuffer();
  // Only market record workbook preview/commit and reference PDF uploads get an
  // explicit bound; other admin calls keep their existing behaviour.
  const signal = isLongMarketRecordWrite(pathname, request.method)
    ? AbortSignal.timeout(MARKET_RECORD_IMPORT_DEADLINE_MS)
    : undefined;
  let backendResponse: Response;
  let responseBody: ArrayBuffer;
  try {
    backendResponse = await fetch(target, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      signal,
    });
    // The deadline covers the body read too.
    responseBody = await backendResponse.arrayBuffer();
  } catch {
    if (signal?.aborted) {
      return NextResponse.json(
        {
          ok: false,
          error: `EcoGlobe backend did not respond within ${MARKET_RECORD_IMPORT_DEADLINE_MS / 1000} seconds.`,
        },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "EcoGlobe backend is unavailable." },
      { status: 502 },
    );
  }
  // The proxy intentionally forwards both successful and error responses, but
  // capture the status before consuming the body so auth-specific handling is safe.
  const backendOk = backendResponse.ok;
  const output = new NextResponse(responseBody, {
    status: backendResponse.status,
    headers: responseHeaders(backendResponse),
  });

  if (pathname === "/auth/login" && backendOk) {
    try {
      const payload = JSON.parse(new TextDecoder().decode(responseBody)) as {
        token?: string;
        expiresAt?: string;
      };
      // Never expose the bearer token to client JavaScript, even if the
      // backend returns an unexpected expiry value.
      const sanitized = { ...payload };
      delete sanitized.token;
      const sanitizedResponse = new NextResponse(JSON.stringify(sanitized), {
        status: backendResponse.status,
        headers: responseHeaders(backendResponse),
      });
      if (payload.token && payload.expiresAt) {
        const expiresAt = new Date(payload.expiresAt);
        if (
          Number.isFinite(expiresAt.getTime()) &&
          expiresAt.getTime() > Date.now()
        ) {
          sanitizedResponse.cookies.set(SESSION_COOKIE, payload.token, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            expires: expiresAt,
          });
        }
      }
      return sanitizedResponse;
    } catch {
      // Preserve the backend response if it was not JSON.
    }
  }

  if (pathname === "/auth/logout") {
    output.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
  }

  return output;
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
