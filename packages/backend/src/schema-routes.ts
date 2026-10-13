import type { IncomingMessage, ServerResponse } from "node:http";
import { requireSessionAuth } from "./auth.js";
import { getDatabaseHealth, getSchemaTables } from "./database.js";
import { ApiError, sendJson, type AuthContext } from "./http.js";

export function createSchemaHandler(
  authenticate: (
    request: IncomingMessage,
  ) => Promise<AuthContext> = requireSessionAuth,
  health = getDatabaseHealth,
  tables = getSchemaTables,
) {
  return async (
    request: IncomingMessage,
    response: ServerResponse,
    url: URL,
  ): Promise<boolean> => {
    if (request.method !== "GET" || url.pathname !== "/schema/tables")
      return false;
    response.setHeader("cache-control", "private, no-store");
    const auth = await authenticate(request);
    if (!auth.isAdmin) throw new ApiError(403, "Admin access is required.");
    const database = await health();
    if (!database.connected) {
      sendJson(response, 503, {
        ok: false,
        error: database.configured
          ? "Azure SQL is configured but not reachable."
          : "Azure SQL connection string is not configured.",
        database,
      });
      return true;
    }
    const rows = await tables();
    sendJson(response, 200, { ok: true, count: rows.length, tables: rows });
    return true;
  };
}
export const handleSchemaRoute = createSchemaHandler();
