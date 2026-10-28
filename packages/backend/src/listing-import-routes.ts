import type { IncomingMessage, ServerResponse } from "node:http";
import { requireSessionAuth } from "./auth.js";
import {
  ApiError,
  readJsonBody,
  sendJson,
  corsHeaders,
  type AuthContext,
} from "./http.js";
import { readWorkbookBody } from "./market-record-routes.js";
import { MarketRecordError } from "./market-record-domain.js";
import { XLSX_MIME } from "./market-record-import.js";
import {
  listingImportTemplate,
  parseListingXlsx,
} from "./listing-import-workbook.js";
import { validateListingImportRows } from "./listing-import-validation.js";
import * as store from "./listing-import-store.js";

const activePreviews = new Set<number>();

export function listingImportUuid(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/iu.test(
      value,
    )
  )
    throw new ApiError(400, "A UUID is required.");
  return value.toLowerCase();
}
export function listingImportCompanyId(params: URLSearchParams): number {
  const values = params.getAll("sellerCompanyId");
  if (
    values.length !== 1 ||
    !/^[1-9]\d{0,9}$/u.test(values[0]!) ||
    Number(values[0]) > 2147483647
  )
    throw new ApiError(
      400,
      "sellerCompanyId is required and must be a positive SQL INT.",
    );
  return Number(values[0]);
}
export function createListingImportHandler(
  authenticate: (
    request: IncomingMessage,
  ) => Promise<AuthContext> = requireSessionAuth,
) {
  return async (
    request: IncomingMessage,
    response: ServerResponse,
    url: URL,
  ): Promise<boolean> => {
    const prefix = "/api/listing-imports";
    if (url.pathname !== prefix && !url.pathname.startsWith(prefix + "/"))
      return false;
    response.setHeader("cache-control", "private, no-store");
    try {
      const auth = await authenticate(request);
      const companyId = listingImportCompanyId(url.searchParams);
      const name = await store.authorizeListingImport(auth, companyId);
      const parts = url.pathname
        .slice(prefix.length)
        .split("/")
        .filter(Boolean);
      if (
        parts.length === 1 &&
        parts[0] === "template" &&
        request.method === "GET"
      ) {
        const refs = await store.listingImportReferences(companyId, name);
        const bytes = await listingImportTemplate(refs);
        response.writeHead(200, {
          ...corsHeaders(),
          "content-type": XLSX_MIME,
          "content-disposition":
            'attachment; filename="ecoglobe-listing-import-template.xlsx"',
        });
        response.end(bytes);
        return true;
      }
      if (
        parts.length === 1 &&
        parts[0] === "preview" &&
        request.method === "POST"
      ) {
        if (activePreviews.has(auth.userId))
          throw new ApiError(
            429,
            "A listing preview is already in progress. Retry shortly.",
          );
        activePreviews.add(auth.userId);
        try {
          const bytes = await readWorkbookBody(request);
          const source = await parseListingXlsx(bytes);
          const refs = await store.listingImportReferences(companyId, name);
          const rows = validateListingImportRows(source, refs);
          sendJson(
            response,
            201,
            await store.saveListingImportPreview(
              auth,
              companyId,
              name,
              rows,
              bytes,
            ),
          );
          return true;
        } finally {
          activePreviews.delete(auth.userId);
        }
      }
      if (parts.length === 1 && request.method === "GET") {
        sendJson(
          response,
          200,
          await store.getListingImportPreview(
            auth,
            companyId,
            listingImportUuid(parts[0]),
          ),
        );
        return true;
      }
      if (
        parts.length === 2 &&
        parts[1] === "commit" &&
        request.method === "POST"
      ) {
        const id = listingImportUuid(parts[0]);
        const body = await readJsonBody(request);
        if (Object.keys(body).some((key) => key !== "idempotencyKey"))
          throw new ApiError(400, "Only idempotencyKey is allowed.");
        sendJson(
          response,
          200,
          await store.commitListingImport(
            auth,
            companyId,
            id,
            listingImportUuid(body.idempotencyKey),
          ),
        );
        return true;
      }
      throw new ApiError(405, "Unsupported listing import operation.");
    } catch (error) {
      if (error instanceof ApiError || error instanceof MarketRecordError) {
        sendJson(response, error.status, { ok: false, error: error.message });
        return true;
      }
      throw error;
    }
  };
}
export const handleListingImportRoute = createListingImportHandler();
