import {
  createReferenceHandler,
  isReferencePath,
} from "./market-reference-routes.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import { requireSessionAuth } from "./auth.js";
import { ApiError, type AuthContext, readJsonBody, sendJson } from "./http.js";
import {
  MarketRecordError,
  object,
  keys,
  recordInput,
  version,
  text,
  uuid,
  choice,
  invalid,
} from "./market-record-domain.js";
import { parseXlsx, XLSX_MIME, importLimits } from "./market-record-import.js";
import * as store from "./market-record-store.js";

export async function readWorkbookBody(
  request: IncomingMessage,
): Promise<Buffer> {
  if (request.headers["content-type"]?.split(";")[0]?.trim() !== XLSX_MIME)
    throw new MarketRecordError(
      415,
      "unsupported_format",
      "Upload a raw .xlsx workbook with its spreadsheet content type.",
    );
  const length = request.headers["content-length"];
  if (
    length &&
    (!/^\d+$/u.test(length) || Number(length) > importLimits.compressed)
  )
    throw new MarketRecordError(
      413,
      "file_too_large",
      "Workbook exceeds 2 MiB. Split the workbook and retry.",
    );
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const raw of request) {
    const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
    size += chunk.length;
    if (size > importLimits.compressed)
      throw new MarketRecordError(
        413,
        "file_too_large",
        "Workbook exceeds 2 MiB. Split the workbook and retry.",
      );
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
export function requireMarketAdmin(auth: AuthContext): AuthContext {
  if (!auth.isAdmin) throw new ApiError(403, "Admin access is required.");
  return auth;
}
export function createMarketRecordHandler(
  authenticate: (
    request: IncomingMessage,
  ) => Promise<AuthContext> = requireSessionAuth,
) {
  const references = createReferenceHandler(authenticate);
  return async function handler(
    request: IncomingMessage,
    response: ServerResponse,
    url: URL,
  ): Promise<boolean> {
    const prefix = "/api/admin/market-records";
    if (url.pathname !== prefix && !url.pathname.startsWith(prefix + "/"))
      return false;
    if (isReferencePath(url.pathname))
      return references(request, response, url);
    response.setHeader("cache-control", "private, no-store");
    try {
      const auth = requireMarketAdmin(await authenticate(request));
      const parts = url.pathname
          .slice(prefix.length)
          .split("/")
          .filter(Boolean),
        method = request.method;
      if (parts[0] === "imports") {
        if (parts[1] === "preview" && parts.length === 2 && method === "POST") {
          const parsed = await parseXlsx(await readWorkbookBody(request));
          sendJson(
            response,
            201,
            await store.savePreview(
              parsed.rows,
              parsed.fileSha256,
              auth.userId,
            ),
          );
          return true;
        }
        const id = uuid(parts[1], "previewId");
        if (parts.length === 2 && method === "GET") {
          sendJson(response, 200, await store.getPreview(id, auth.userId));
          return true;
        }
        if (parts[2] === "commit" && parts.length === 3 && method === "POST") {
          const body = object(await readJsonBody(request));
          keys(body, ["idempotencyKey", "excludedRowKeys", "reason"]);
          const key = uuid(body.idempotencyKey, "idempotencyKey"),
            reason = text(body.reason, "reason", 1000, true)!;
          if (
            !Array.isArray(body.excludedRowKeys) ||
            body.excludedRowKeys.length > importLimits.rows ||
            body.excludedRowKeys.some(
              (v) => typeof v !== "string" || v.length > 80,
            )
          )
            invalid(
              "excludedRowKeys",
              "excludedRowKeys must be a bounded list of preview row keys.",
            );
          const excludedRowKeys = body.excludedRowKeys as string[];
          sendJson(
            response,
            200,
            await store.commitPreview(id, auth.userId, {
              idempotencyKey: key,
              excludedRowKeys,
              reason,
            }),
          );
          return true;
        }
      } else if (parts.length === 0) {
        if (method === "GET") {
          sendJson(response, 200, await store.listRecords(url.searchParams));
          return true;
        }
        if (method === "POST") {
          sendJson(response, 201, {
            ok: true,
            record: await store.createRecord(
              recordInput(await readJsonBody(request)),
              auth.userId,
            ),
          });
          return true;
        }
      } else {
        if (
          !/^[1-9]\d{0,9}$/u.test(parts[0] ?? "") ||
          Number(parts[0]) > 2147483647
        )
          invalid(
            "id",
            "Market record ID must be a positive SQL INT in decimal notation.",
          );
        const id = Number(parts[0]);
        if (parts.length === 1 && method === "GET") {
          sendJson(response, 200, {
            ok: true,
            record: await store.getRecord(id),
          });
          return true;
        }
        if (parts.length === 2 && parts[1] === "audit" && method === "GET") {
          sendJson(
            response,
            200,
            await store.recordAudit(id, url.searchParams),
          );
          return true;
        }
        if (
          (parts.length === 1 && method === "PATCH") ||
          (parts.length === 2 &&
            ["archive", "restore"].includes(parts[1]!) &&
            method === "POST") ||
          (parts.length === 3 &&
            parts[1] === "confirmations" &&
            method === "POST")
        ) {
          const body = object(await readJsonBody(request));
          keys(
            body,
            parts.length === 1
              ? ["expectedVersion", "reason", "changes"]
              : parts[1] === "confirmations"
                ? ["expectedVersion", "reason", "status", "citation"]
                : ["expectedVersion", "reason"],
          );
          const expected = version(body.expectedVersion),
            reason = text(body.reason, "reason", 1000, true)!;
          const operation =
            parts.length === 1
              ? { kind: "edit" as const, changes: body.changes }
              : parts[1] === "confirmations"
                ? {
                    kind: "review" as const,
                    field: choice(
                      parts[2],
                      ["price", "volume", "address"],
                      "field",
                    ),
                    status: body.status,
                    citation: body.citation,
                  }
                : { kind: choice(parts[1], ["archive", "restore"], "action") };
          sendJson(response, 200, {
            ok: true,
            record: await store.changeRecord(
              id,
              expected,
              auth.userId,
              reason,
              operation,
            ),
          });
          return true;
        }
      }
      throw new MarketRecordError(
        405,
        "method_not_allowed",
        "Unsupported market records operation.",
      );
    } catch (error) {
      if (error instanceof MarketRecordError) {
        sendJson(response, error.status, {
          ok: false,
          error: error.message,
          code: error.code,
          fieldErrors: error.fieldErrors,
          ...(error.fieldErrors.existingId
            ? { existingId: Number(error.fieldErrors.existingId) }
            : {}),
          ...(error.fieldErrors.currentVersion
            ? { currentVersion: error.fieldErrors.currentVersion }
            : {}),
        });
        return true;
      }
      if (error instanceof ApiError) throw error;
      sendJson(response, 500, {
        ok: false,
        error:
          "Market records operation failed. Retry or contact an administrator.",
        code: "server_error",
      });
      return true;
    }
  };
}
export const handleMarketRecordRoute = createMarketRecordHandler();
