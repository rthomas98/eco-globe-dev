import type { ServerResponse } from "node:http";
import { queryRowsWithParams, sql } from "./database.js";
import { ApiError, type AuthContext, sendJson } from "./http.js";
export function validateOnboardingPreferences(body: Record<string, unknown>) {
  const interests = body.feedstockInterests;
  if (
    interests !== undefined &&
    (!Array.isArray(interests) ||
      interests.length > 50 ||
      !interests.every(
        (v) => typeof v === "string" && v.trim().length > 0 && v.length <= 240,
      ))
  )
    throw new ApiError(
      400,
      "feedstockInterests must contain at most 50 nonempty strings.",
    );
  const selected: string[] | undefined =
    interests === undefined
      ? undefined
      : (interests as string[]).map((v) => v.trim());
  const other = body.otherFeedstockInterest;
  if (
    other !== undefined &&
    other !== null &&
    (typeof other !== "string" || other.length > 1000)
  )
    throw new ApiError(
      400,
      "otherFeedstockInterest must be text up to 1000 characters.",
    );
  if (
    selected?.some((v) => ["other", "others"].includes(v.toLowerCase())) &&
    (typeof other !== "string" || !other.trim())
  )
    throw new ApiError(400, "Describe your Others feedstock interest.");
  return {
    interests: selected,
    other: typeof other === "string" ? other.trim() || null : null,
  };
}
export async function readOnboardingPreferences(
  response: ServerResponse,
  auth: AuthContext,
) {
  if (!auth.companyId)
    throw new ApiError(404, "Complete company onboarding first.");
  const rows = await queryRowsWithParams(
    `SELECT CompanyId AS companyId,Industry AS industry,JobTitle AS jobTitle,Website AS website,FeedstockInterestsJson AS interestsJson,OtherFeedstockInterest AS otherFeedstockInterest FROM dbo.CompanyOnboardingPreferences WHERE CompanyId=@id`,
    [{ name: "id", type: sql.Int, value: auth.companyId }],
  );
  const row = rows[0];
  if (!row) {
    sendJson(response, 200, {
      ok: true,
      onboarding: {
        companyId: auth.companyId,
        industry: null,
        jobTitle: null,
        website: null,
        feedstockInterests: [],
        otherFeedstockInterest: null,
      },
    });
    return;
  }
  const { interestsJson, ...fields } = row;
  sendJson(response, 200, {
    ok: true,
    onboarding: {
      ...fields,
      feedstockInterests: JSON.parse(String(interestsJson)),
    },
  });
}
