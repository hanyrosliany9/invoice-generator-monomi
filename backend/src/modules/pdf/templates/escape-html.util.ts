/**
 * Shared HTML-escape helper for PDF templates.
 * Wraps every user/DB-supplied string before interpolation into Puppeteer HTML
 * to prevent stored XSS, SSRF, and local-file-read via injected markup.
 */
export const escapeHtml = (v: unknown): string =>
  v == null
    ? ""
    : String(v)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
