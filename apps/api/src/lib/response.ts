import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ErrorResponse } from "./errors.js";
import { AppError } from "./errors.js";

// ─── Success Response ────────────────────────────────────────────────────────

export function success<T>(c: Context, data: T, status: ContentfulStatusCode = 200) {
  return c.json({ success: true, data }, status);
}

export function created<T>(c: Context, data: T) {
  return c.json({ success: true, data }, 201);
}

export function noContent(c: Context) {
  return c.body(null, 204);
}

// ─── Error Response ──────────────────────────────────────────────────────────

export function sendError(c: Context, err: unknown): Response {
  if (err instanceof AppError) {
    const body: ErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...("fields" in err && (err as any).fields
          ? { fields: (err as any).fields }
          : {}),
      },
    };
    return c.json(body, err.statusCode as ContentfulStatusCode);
  }

  // Unhandled — return generic 500
  console.error("Unhandled error:", err);
  return c.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    } satisfies ErrorResponse,
    500
  );
}
