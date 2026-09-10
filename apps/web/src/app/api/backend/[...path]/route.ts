import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.ECOGLOBE_API_BASE_URL?.replace(/\/$/, "") ??
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:4050";
const SESSION_COOKIE = "ecoglobe.session";
/**
 * Upstream deadline for one proxied request. Document uploads are larger
 * than ordinary JSON calls, so they get a longer bound.
 */
const DEFAULT_UPSTREAM_DEADLINE_MS = 25_000;
const UPLOAD_UPSTREAM_DEADLINE_MS = 60_000;
const FORWARDED_RESPONSE_HEADERS = [
  "content-type",
  "content-length",
  "content-disposition",
  "x-content-type-options",
  "cache-control",
  "etag",
  "last-modified",
];

type RouteContext = { params: Promise<{ path: string[] }> };

function responseHeaders(response: Response) {
  const headers = new Headers();
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

function upstreamDeadline(pathname: string, method: string) {
  if (pathname.startsWith("/api/listing-documents") && method === "POST") {
    return UPLOAD_UPSTREAM_DEADLINE_MS;
  }
  // Lab report PDFs are uploaded as JSON base64 through the admin lab route.
  if (/^\/api\/admin\/lab\/requests\/[^/]+\/reports$/.test(pathname) && method === "POST") {
    return UPLOAD_UPSTREAM_DEADLINE_MS;
  }
  return DEFAULT_UPSTREAM_DEADLINE_MS;
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
  const deadlineMs = upstreamDeadline(pathname, request.method);
  let backendResponse: Response;
  let responseBody: ArrayBuffer;
  try {
    // One deadline covers the upstream connection and the full body read so a
    // stalled response can never leave the browser waiting indefinitely.
    const signal = AbortSignal.timeout(deadlineMs);
    backendResponse = await fetch(target, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      signal,
    });
    responseBody = await backendResponse.arrayBuffer();
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === "TimeoutError" ||
        error.name === "AbortError" ||
        (error.cause instanceof Error &&
          (error.cause.name === "TimeoutError" || error.cause.name === "AbortError")));
    return NextResponse.json(
      {
        ok: false,
        error: timedOut
          ? `EcoGlobe backend did not respond within ${Math.round(deadlineMs / 1000)} seconds.`
          : "EcoGlobe backend is unavailable.",
      },
      { status: timedOut ? 504 : 502 },
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
      const sanitizedHeaders = responseHeaders(backendResponse);
      sanitizedHeaders.delete("content-length");
      const sanitizedResponse = new NextResponse(JSON.stringify(sanitized), {
        status: backendResponse.status,
        headers: sanitizedHeaders,
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
