import sanitizeHtml from "sanitize-html";

/**
 * Sanitization utility for protecting against XSS and injection attacks
 * Indonesian Business Management System
 */

/**
 * Sanitize HTML content - removes all HTML tags and dangerous content
 * Use for: User-generated text that should not contain any HTML
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return "";

  return sanitizeHtml(input, {
    allowedTags: [], // Remove all HTML tags
    allowedAttributes: {},
    disallowedTagsMode: "discard",
  }).trim();
}

/**
 * Sanitize HTML content - allows safe HTML tags for rich text
 * Use for: Content that needs basic formatting (invoices, quotations)
 */
export function sanitizeRichText(input: string | null | undefined): string {
  if (!input) return "";

  return sanitizeHtml(input, {
    allowedTags: [
      "b",
      "i",
      "em",
      "strong",
      "u",
      "p",
      "br",
      "ul",
      "ol",
      "li",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "blockquote",
      "pre",
      "code",
      "span",
      "div",
    ],
    allowedAttributes: {
      span: ["style"],
      div: ["style"],
    },
    allowedStyles: {
      "*": {
        color: [
          /^#(0x)?[0-9a-f]+$/i,
          /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/,
        ],
        "text-align": [/^left$/, /^right$/, /^center$/],
        "font-weight": [/^bold$/, /^normal$/],
      },
    },
    disallowedTagsMode: "discard",
    transformTags: {
      script: "p", // Convert dangerous tags to safe ones
      iframe: "p",
      object: "p",
      embed: "p",
    },
  }).trim();
}

/**
 * Sanitize email addresses
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return "";

  // Remove any HTML and trim
  const cleaned = sanitizeText(email);

  // Basic email format validation (simple check)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleaned)) {
    throw new Error("Invalid email format");
  }

  return cleaned.toLowerCase();
}

/**
 * Sanitize phone numbers - removes non-numeric characters except + and -
 */
export function sanitizePhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "";

  // Remove HTML first
  const cleaned = sanitizeText(phone);

  // Keep only digits, +, -, and spaces
  return cleaned.replace(/[^\d+\-\s]/g, "").trim();
}

/**
 * Sanitize URL - ensures URL is safe and valid
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return "";

  const cleaned = sanitizeText(url).trim();

  // Only allow http, https, and mailto protocols
  if (!cleaned.match(/^(https?:\/\/|mailto:)/i)) {
    throw new Error(
      "Invalid URL protocol - only http, https, and mailto are allowed",
    );
  }

  // Block javascript: protocol and other dangerous schemes
  if (cleaned.match(/^(javascript|data|vbscript|file|about):/i)) {
    throw new Error("Dangerous URL protocol detected");
  }

  return cleaned;
}

/**
 * Sanitize JSON object recursively
 * Use for: priceBreakdown, metadata, and other JSON fields
 */
export function sanitizeJsonObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    return sanitizeText(obj);
  }

  if (typeof obj === "number" || typeof obj === "boolean") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeJsonObject(item));
  }

  if (typeof obj === "object") {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Sanitize both key and value
        const sanitizedKey = sanitizeText(key);
        sanitized[sanitizedKey] = sanitizeJsonObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Sanitize Indonesian business data (client names, addresses, etc.)
 * Allows Indonesian characters and common business symbols
 */
export function sanitizeBusinessText(input: string | null | undefined): string {
  if (!input) return "";

  // Remove HTML but keep Indonesian characters
  const cleaned = sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();

  // Remove any remaining dangerous characters but keep Indonesian chars
  // Allow: letters (including Indonesian), numbers, spaces, common punctuation
  return cleaned.replace(/[<>{}\\]/g, "");
}

/**
 * Sanitize decimal/numeric input
 */
export function sanitizeNumeric(
  input: string | number | null | undefined,
): string {
  if (input === null || input === undefined) return "0";

  const str = String(input);

  // Remove HTML
  const cleaned = sanitizeText(str);

  // Keep only digits, decimal point, and minus sign
  const numeric = cleaned.replace(/[^\d.-]/g, "");

  // Validate it's a valid number
  if (isNaN(Number(numeric))) {
    throw new Error("Invalid numeric value");
  }

  return numeric;
}

/**
 * Sanitize SQL LIKE pattern (for search queries)
 * Escapes special characters to prevent SQL injection in LIKE queries
 */
export function sanitizeLikePattern(
  pattern: string | null | undefined,
): string {
  if (!pattern) return "";

  // Remove HTML first
  const cleaned = sanitizeText(pattern);

  // Escape special SQL LIKE characters: % _ [ ] ^
  return cleaned
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/\[/g, "\\[")
    .replace(/]/g, "\\]")
    .replace(/\^/g, "\\^");
}

/**
 * Comprehensive DTO sanitization
 * Use this to sanitize entire DTOs before processing
 */
export function sanitizeDto<T extends Record<string, any>>(
  dto: T,
  fieldsConfig: {
    text?: string[];
    richText?: string[];
    email?: string[];
    phone?: string[];
    url?: string[];
    json?: string[];
    business?: string[];
    numeric?: string[];
  },
): T {
  const sanitized: any = { ...dto };

  // Sanitize text fields
  fieldsConfig.text?.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = sanitizeText(sanitized[field]);
    }
  });

  // Sanitize rich text fields
  fieldsConfig.richText?.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = sanitizeRichText(sanitized[field]);
    }
  });

  // Sanitize email fields
  fieldsConfig.email?.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = sanitizeEmail(sanitized[field]);
    }
  });

  // Sanitize phone fields
  fieldsConfig.phone?.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = sanitizePhoneNumber(sanitized[field]);
    }
  });

  // Sanitize URL fields
  fieldsConfig.url?.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = sanitizeUrl(sanitized[field]);
    }
  });

  // Sanitize JSON fields
  fieldsConfig.json?.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = sanitizeJsonObject(sanitized[field]);
    }
  });

  // Sanitize business text fields
  fieldsConfig.business?.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = sanitizeBusinessText(sanitized[field]);
    }
  });

  // Sanitize numeric fields
  fieldsConfig.numeric?.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = sanitizeNumeric(sanitized[field]);
    }
  });

  return sanitized as T;
}
