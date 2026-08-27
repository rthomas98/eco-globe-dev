"use client";

import { useEffect, useState } from "react";

/**
 * Admin platform settings persisted to the PlatformSettings table.
 * Values are JSON blobs keyed by the same string keys the settings pages
 * previously used for localStorage — which stays on as an offline cache.
 */

let settingsPromise: Promise<Record<string, unknown>> | null = null;

async function fetchPlatformSettings(): Promise<Record<string, unknown>> {
  const response = await fetch("/api/backend/api/platform-settings", {
    credentials: "same-origin",
  });
  const body = (await response.json()) as {
    ok: boolean;
    settings?: Array<{ settingKey: string; settingValue: string }>;
  };
  if (!response.ok || !body.ok || !Array.isArray(body.settings)) {
    throw new Error("Platform settings request failed.");
  }
  const map: Record<string, unknown> = {};
  for (const row of body.settings) {
    try {
      map[row.settingKey] = JSON.parse(row.settingValue);
    } catch {
      map[row.settingKey] = row.settingValue;
    }
  }
  return map;
}

/** One shared settings request per page load, however many hooks mount. */
function loadPlatformSettings(): Promise<Record<string, unknown>> {
  if (!settingsPromise) {
    settingsPromise = fetchPlatformSettings().catch((error) => {
      settingsPromise = null;
      throw error;
    });
  }
  return settingsPromise;
}

async function postPlatformSetting(key: string, value: unknown) {
  const response = await fetch("/api/backend/api/platform-settings", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
  if (!response.ok) {
    throw new Error(`Saving setting '${key}' failed (${response.status}).`);
  }
  // The shared cache is stale after a write; the next load refetches.
  settingsPromise = null;
}

// Saves send the full settings object, so concurrent writes must land in
// click order — otherwise an earlier save can clobber a later one.
let saveQueue: Promise<unknown> = Promise.resolve();

export function savePlatformSetting(key: string, value: unknown): Promise<unknown> {
  const next = saveQueue
    .catch(() => {})
    .then(() => postPlatformSetting(key, value));
  saveQueue = next;
  return next;
}

/**
 * Backend-persisted admin setting with the localStorage read as an
 * instant-paint fallback. Writes go to both.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Partial stored objects fill in over the defaults instead of replacing them. */
function withDefaults<T>(defaults: T, stored: unknown): T {
  if (isPlainObject(defaults) && isPlainObject(stored)) {
    return { ...defaults, ...stored } as T;
  }
  return stored as T;
}

export function usePlatformSetting<T>(
  key: string,
  defaultValue: T,
): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) setValue(withDefaults(defaultValue, JSON.parse(stored)));
    } catch {
      // Fall through to the backend value.
    }
    let cancelled = false;
    loadPlatformSettings()
      .then((map) => {
        if (!cancelled && key in map) setValue(withDefaults(defaultValue, map[key]));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = (next: T) => {
    setValue(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // localStorage is only a cache.
    }
    void savePlatformSetting(key, next).catch(() => {});
  };

  return [value, set];
}
