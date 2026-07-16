import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { createRouter } from "./router.js";
import { createDocsRouter } from "./docs/index.js";
import { createAppServices } from "./services.js";
import { authMiddleware } from "./lib/auth.js";
import { tenantMiddleware } from "./lib/tenant.js";
import { sendError } from "./lib/response.js";
import { setDefaultDbClient } from "@repo/db";
import { client } from "@repo/db";
import type { ErrorResponse } from "./lib/errors.js";

// ─── Default DB Client ─────────────────────────────────────────────────────
// Set the PostgreSQL client so services can use withTenantSession()
// without needing to import or pass the client explicitly.
setDefaultDbClient(client as never);

const app = new Hono();

// ─── Global Middleware ──────────────────────────────────────────────────────

app.use("*", cors());
app.use("*", authMiddleware);
app.use("*", tenantMiddleware());

// ─── Global Error Handler ───────────────────────────────────────────────────

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: "HTTP_ERROR",
        message: err.message,
      },
    };
    return c.json(errorResponse, err.status);
  }
  return sendError(c, err);
});

// ─── Health Check ──────────────────────────────────────────────────────────

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── API v1 Routes ─────────────────────────────────────────────────────────

const services = createAppServices();
const apiRouter = createRouter(services);
const docsRouter = createDocsRouter();

app.route("/api/v1", apiRouter);
app.route("/api/v1/docs", docsRouter);

// ─── Start Server ──────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? "3001", 10);

if (process.env.NODE_ENV !== "test") {
  serve(
    { fetch: app.fetch, port: PORT },
    (info) => {
      console.log(`GlassOS API Server started at http://localhost:${info.port}`);
      console.log(`API v1 base URL: http://localhost:${info.port}/api/v1`);
    },
  );
}

export default app;
