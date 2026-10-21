import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson } from "./http.js";
import { parseDemoPresentation } from "./demo-presentation-domain.js";
import { listDemoPresentations } from "./demo-presentation-store.js";

export function createDemoPresentationHandler(list = listDemoPresentations) {
  return async (request: IncomingMessage, response: ServerResponse, url: URL) => {
    const path = "/api/demo-presentations";
    if (url.pathname !== path && !url.pathname.startsWith(path + "/")) return false;
    response.setHeader("cache-control", "no-store");
    if (url.pathname !== path) {
      sendJson(response, 404, { ok: false, error: "Presentation endpoint not found." });
      return true;
    }
    if (request.method !== "GET") {
      response.setHeader("allow", "GET");
      sendJson(response, 405, { ok: false, error: "Method not allowed." });
      return true;
    }
    if (url.search) {
      sendJson(response, 400, { ok: false, error: "Presentation queries are not supported." });
      return true;
    }
    try {
      // Revalidate the exact public shape at the output boundary as well as storage.
      const presentations = (await list()).map(parseDemoPresentation);
      sendJson(response, 200, { ok: true, presentations });
    } catch {
      sendJson(response, 500, { ok: false, error: "Demo presentations are unavailable." });
    }
    return true;
  };
}
export const handleDemoPresentationRoute = createDemoPresentationHandler();
