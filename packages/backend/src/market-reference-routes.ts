import type { IncomingMessage, ServerResponse } from "node:http";
import { requireSessionAuth } from "./auth.js";
import { ApiError, readJsonBody, sendJson, type AuthContext } from "./http.js";
import { MarketRecordError, invalid } from "./market-record-domain.js";
import { referenceId, referenceInput } from "./market-reference-domain.js";
import * as store from "./market-reference-store.js";

export const referencePrefix = "/api/admin/market-records/references";
export function isReferencePath(path: string) {
  return path === referencePrefix || path.startsWith(referencePrefix + "/");
}
export function createReferenceHandler(
  authenticate: (
    request: IncomingMessage,
  ) => Promise<AuthContext> = requireSessionAuth,
  repository: Pick<
    typeof store,
    "listReferences" | "createReference" | "downloadReference"
  > = store,
) {
  return async (
    request: IncomingMessage,
    response: ServerResponse,
    url: URL,
  ): Promise<boolean> => {
    if (!isReferencePath(url.pathname)) return false;
    response.setHeader("cache-control", "private, no-store");
    try {
      const auth = await authenticate(request);
      if (!auth.isAdmin) throw new ApiError(403, "Admin access is required.");
      // Authorization precedes path/query parsing, body consumption, PDF parsing and storage.
      const suffix = url.pathname.slice(referencePrefix.length);
      if (suffix === "" && request.method === "GET") {
        for (const key of url.searchParams.keys())
          if (key !== "recordId") invalid(key, "Unknown reference filter.");
        if (url.searchParams.getAll("recordId").length > 1)
          invalid("recordId", "Provide one recordId.");
        const recordId = url.searchParams.has("recordId")
          ? referenceId(url.searchParams.get("recordId"), "recordId")
          : undefined;
        sendJson(response, 200, {
          ok: true,
          references: await repository.listReferences(recordId),
        });
      } else if (suffix === "" && request.method === "POST") {
        if (url.search)
          invalid("query", "Upload does not accept query parameters.");
        if (
          request.headers["content-type"]?.split(";")[0]?.trim() !==
          "application/json"
        )
          throw new ApiError(415, "Upload a JSON reference request.");
        const length = request.headers["content-length"];
        if (
          length &&
          (!/^\d+$/.test(length) || Number(length) > 8 * 1024 * 1024)
        )
          throw new ApiError(413, "Request body exceeds 8 MiB.");
        const input = await referenceInput(await readJsonBody(request));
        sendJson(response, 201, {
          ok: true,
          reference: await repository.createReference(input, auth.userId),
        });
      } else {
        const match = /^\/([^/]+)\/download$/.exec(suffix);
        if (!match || request.method !== "GET")
          throw new ApiError(405, "Unsupported internal reference operation.");
        if (url.search)
          invalid("query", "Download does not accept query parameters.");
        const file = await repository.downloadReference(referenceId(match[1]));
        const encoded = encodeURIComponent(file.fileName).replace(
          /[!'()*]/g,
          (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
        );
        response.writeHead(200, {
          "content-type": "application/pdf",
          "content-disposition": `attachment; filename="reference.pdf"; filename*=UTF-8''${encoded}`,
          "content-length": String(file.bytes.length),
          "x-content-type-options": "nosniff",
          "content-security-policy":
            "sandbox; default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        });
        response.end(file.bytes);
      }
    } catch (error) {
      if (error instanceof ApiError)
        sendJson(response, error.status, {
          ok: false,
          error: error.message,
          ...(error instanceof MarketRecordError
            ? {
                code: error.code,
                fieldErrors: error.fieldErrors,
                ...(error.fieldErrors.existingId
                  ? { existingId: Number(error.fieldErrors.existingId) }
                  : {}),
              }
            : {}),
        });
      else
        sendJson(response, 500, {
          ok: false,
          error:
            "Internal reference operation failed. Retry or contact an administrator.",
        });
    }
    return true;
  };
}
