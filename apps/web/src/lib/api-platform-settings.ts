"use client";

import { useEffect, useState } from "react";
import { apiFetch, describeBackendError } from "./backend-client";

/**
 * Admin platform settings persisted to the PlatformSettings table as JSON
 * blobs. The backend is the only store: nothing is cached in the browser, so
 * the screen always reflects what was actually saved.
 */

let settingsPromise: Promise<Record<string, unknown>> | null = null;

async function fetchPlatformSettings(): Promise<Record<string, unknown>> {
  const body = await apiFetch<{
    ok: boolean;
    settings?: Array<{ settingKey: string; settingValue: string }>;
  }>("/api/platform-settings");
  if (!body.ok || !Array.isArray(body.settings)) {
    throw new Error("Platform settings could not be read.");
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
  await apiFetch("/api/platform-settings", {
    method: "POST",
    body: JSON.stringify({ key, value }),
  });
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

export interface PlatformSettingMeta {
  /** Loading the saved value from the backend. */
  status: "loading" | "ready" | "error";
  /** True when a value for this key has been saved before. */
  stored: boolean;
  saveState: "idle" | "saving" | "saved" | "error";
  error: string | null;
}

/**
 * Backend-persisted admin setting. The screen shows the saved value once it
 * loads; a change is only reported as saved after the backend accepts it, and
 * a failed save reverts to the last saved value and reports the error.
 */
export function usePlatformSetting<T>(
  key: string,
  defaultValue: T,
): [T, (v: T) => void, PlatformSettingMeta] {
  const [value, setValue] = useState<T>(defaultValue);
  const [saved, setSaved] = useState<T>(defaultValue);
  const [meta, setMeta] = useState<PlatformSettingMeta>({
    status: "loading",
    stored: false,
    saveState: "idle",
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    loadPlatformSettings()
      .then((map) => {
        if (cancelled) return;
        const stored = key in map;
        const next = stored ? withDefaults(defaultValue, map[key]) : defaultValue;
        setValue(next);
        setSaved(next);
        setMeta({ status: "ready", stored, saveState: "idle", error: null });
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setMeta({
            status: "error",
            stored: false,
            saveState: "idle",
            error: describeBackendError(error, "Saved settings could not be loaded."),
          });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = (next: T) => {
    setValue(next);
    setMeta((m) => ({ ...m, saveState: "saving", error: null }));
    savePlatformSetting(key, next)
      .then(() => {
        setSaved(next);
        setMeta((m) => ({ ...m, stored: true, saveState: "saved", error: null }));
      })
      .catch((error: unknown) => {
        setValue(saved);
        setMeta((m) => ({
          ...m,
          saveState: "error",
          error: describeBackendError(error, "The change was not saved."),
        }));
      });
  };

  return [value, set, meta];
}
