import { Hono } from "hono";
import { swaggerUI } from "@hono/swagger-ui";
import { openApiSpec } from "./openapi.js";

export function createDocsRouter(): Hono {
  const router = new Hono();

  // Serve the OpenAPI JSON spec
  router.get("/openapi.json", (c) => {
    return c.json(openApiSpec);
  });

  // Serve Swagger UI
  router.get("/", swaggerUI({ url: "/api/v1/docs/openapi.json" }));

  return router;
}
