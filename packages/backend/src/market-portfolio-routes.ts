import type { IncomingMessage, ServerResponse } from "node:http";
import { requireSessionAuth } from "./auth.js";
import { ApiError, readJsonBody, sendJson, type AuthContext } from "./http.js";
import { MarketRecordError } from "./market-record-domain.js";
import {
  portfolioId,
  portfolioInput,
  portfolioTransition,
} from "./market-portfolio-domain.js";
import * as store from "./market-portfolio-store.js";

export function createMarketPortfolioHandler(
  authenticate: (
    request: IncomingMessage,
  ) => Promise<AuthContext> = requireSessionAuth,
  repository = store,
) {
  return async (
    request: IncomingMessage,
    response: ServerResponse,
    url: URL,
  ): Promise<boolean> => {
    const prefix = "/api/admin/market-portfolios";
    const assigned = url.pathname === "/api/market-portfolios/assigned";
    if (
      !assigned &&
      url.pathname !== prefix &&
      !url.pathname.startsWith(prefix + "/")
    )
      return false;
    response.setHeader("cache-control", "private, no-store");
    try {
      const auth = await authenticate(request);
      if (assigned) {
        if (request.method !== "GET")
          throw new ApiError(405, "Method not allowed.");
        sendJson(response, 200, {
          ok: true,
          portfolios: await repository.assignedPortfolios(auth),
        });
        return true;
      }
      if (!auth.isAdmin) throw new ApiError(403, "Admin access is required.");
      const parts = url.pathname
        .slice(prefix.length)
        .split("/")
        .filter(Boolean);
      const method = request.method;
      if (!parts.length && method === "GET") {
        sendJson(response, 200, {
          ok: true,
          portfolios: await repository.listPortfolios(url.searchParams),
        });
      } else if (!parts.length && method === "POST") {
        sendJson(response, 201, {
          ok: true,
          portfolio: await repository.createPortfolio(
            portfolioInput(await readJsonBody(request)),
            auth.userId,
          ),
        });
      } else if (parts.length) {
        const id = portfolioId(parts[0]);
        if (parts.length === 1 && method === "GET") {
          sendJson(response, 200, {
            ok: true,
            portfolio: await repository.getPortfolio(id),
          });
        } else if (parts.length === 1 && method === "PATCH") {
          const { expectedVersion, ...data } = portfolioInput(
            await readJsonBody(request),
            true,
          );
          sendJson(response, 200, {
            ok: true,
            portfolio: await repository.changePortfolio(
              id,
              expectedVersion!,
              auth.userId,
              { action: "update", data },
            ),
          });
        } else if (
          parts.length === 2 &&
          parts[1] === "audit" &&
          method === "GET"
        ) {
          sendJson(response, 200, {
            ok: true,
            events: await repository.portfolioAudit(id),
          });
        } else if (
          parts.length === 2 &&
          (parts[1] === "archive" || parts[1] === "restore") &&
          method === "POST"
        ) {
          const data = portfolioTransition(await readJsonBody(request));
          sendJson(response, 200, {
            ok: true,
            portfolio: await repository.changePortfolio(
              id,
              data.expectedVersion,
              auth.userId,
              { action: parts[1], reason: data.reason },
            ),
          });
        } else throw new ApiError(405, "Method not allowed.");
      } else throw new ApiError(405, "Method not allowed.");
    } catch (error) {
      if (error instanceof ApiError)
        sendJson(response, error.status, {
          ok: false,
          error: error.message,
          ...(error instanceof MarketRecordError
            ? { code: error.code, fieldErrors: error.fieldErrors }
            : {}),
        });
      else
        sendJson(response, 500, {
          ok: false,
          error:
            "Market portfolio operation failed. Retry or contact an administrator.",
        });
    }
    return true;
  };
}
export const handleMarketPortfolioRoute = createMarketPortfolioHandler();
