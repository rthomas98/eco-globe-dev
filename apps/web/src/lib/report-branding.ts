/**
 * Branding for printable reports opened in a separate window.
 *
 * Reports are served from a Blob URL, where root-relative paths do not
 * resolve, so the logo is referenced by an absolute URL on the app's origin.
 * The source asset is the supplied EcoGlobe wordmark (1200 × 376 px).
 */

export const REPORT_LOGO_PATH = "/images/ecoglobe-report-logo.png";
export const REPORT_LOGO_WIDTH = 1200;
export const REPORT_LOGO_HEIGHT = 376;

function escapeAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Absolute logo URL for an origin such as `window.location.origin`. */
export function reportLogoUrl(origin: string): string {
  return new URL(REPORT_LOGO_PATH, origin).href;
}

/**
 * Logo `<img>` markup. Intrinsic width/height let the browser reserve the
 * right box before load; CSS fixes the width and keeps `height: auto`, so the
 * aspect ratio is preserved on screen and in print.
 */
export function reportLogoHtml(logoUrl: string, displayWidthPx = 168): string {
  return `<img class="brand-logo" src="${escapeAttribute(logoUrl)}" alt="EcoGlobe" width="${REPORT_LOGO_WIDTH}" height="${REPORT_LOGO_HEIGHT}" style="width:${displayWidthPx}px;height:auto;display:block;" />`;
}
