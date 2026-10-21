import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson } from "./http.js";
import { listDemoPlaylists, readDemoPlaylist } from "./demo-playlist-store.js";
import { exact, object, parseDemoPlaylist, slug, text } from "./demo-playlist-domain.js";

export function createDemoPlaylistHandler(list = listDemoPlaylists, read = readDemoPlaylist) {
  return async (request: IncomingMessage, response: ServerResponse, url: URL) => {
    const path = "/api/demo-playlists";
    if (url.pathname !== path && !url.pathname.startsWith(path + "/")) return false;
    response.setHeader("cache-control", "no-store");
    const detailSlug = url.pathname.slice(path.length + 1);
    if (url.pathname !== path && !["fuel-lsu", "all"].includes(detailSlug)) {
      sendJson(response, 404, { ok: false, error: "Playlist endpoint not found." }); return true;
    }
    if (request.method !== "GET") {
      response.setHeader("allow", "GET"); sendJson(response, 405, { ok: false, error: "Method not allowed." }); return true;
    }
    if (url.search) { sendJson(response, 400, { ok: false, error: "Playlist queries are not supported." }); return true; }
    try {
      if (url.pathname === path) {
        const playlists = (await list()).map(value => { const row = object(value); exact(row, ["slug", "name"]); return { slug: slug(row.slug), name: text(row.name, 240) }; });
        if (new Set(playlists.map(p => p.slug)).size !== playlists.length) throw new Error("Duplicate playlist");
        playlists.sort((a,b) => (a.slug === "fuel-lsu" ? 0 : 1) - (b.slug === "fuel-lsu" ? 0 : 1));
        sendJson(response, 200, { ok: true, playlists });
      } else {
        const result = await read(detailSlug);
        if (!result) sendJson(response, 404, { ok: false, error: "Playlist not found." });
        else { const detail = parseDemoPlaylist(result); if (detail.playlist.slug !== detailSlug) throw new Error("Wrong playlist"); sendJson(response, 200, detail); }
      }
    } catch { sendJson(response, 500, { ok: false, error: "Demo playlists are unavailable." }); }
    return true;
  };
}
export const handleDemoPlaylistRoute = createDemoPlaylistHandler();
