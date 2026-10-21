"use client";

import { apiFetch } from "./backend-client";
import { parseDemoPlaylistList, parseDemoPlaylistResponse, type DemoPlaylistSlug } from "./demo-playlists";

/** Public, signed-out-safe list of demo playlists, FUEL first. */
export async function fetchDemoPlaylists() {
  const body = await apiFetch<unknown>("/api/demo-playlists", { method: "GET" });
  return parseDemoPlaylistList(body);
}

/** One reviewed playlist: profiles, material examples and potential relationships. */
export async function fetchDemoPlaylist(slug: DemoPlaylistSlug) {
  const body = await apiFetch<unknown>(`/api/demo-playlists/${encodeURIComponent(slug)}`, { method: "GET" });
  return parseDemoPlaylistResponse(body, slug);
}
