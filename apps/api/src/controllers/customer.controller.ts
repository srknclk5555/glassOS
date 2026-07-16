import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { success, created, noContent, sendError } from "../lib/response.js";
import { NotFoundError } from "../lib/errors.js";
import { getCurrentUser, requireRole } from "../lib/auth.js";
import { Roles } from "../lib/config.js";
import { createCustomerSchema, updateCustomerSchema } from "../dto/customer.dto.js";
import type { CustomerService } from "@repo/db";

export function createCustomerRouter(services: { customer: CustomerService }) {
  const router = new Hono();

  /* GET /customers — list active customers */
  router.get("/", async (c) => {
    try {
      const customers = await services.customer.findActive();
      return success(c, customers);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /customers/:id — find by id */
  router.get("/:id", async (c) => {
    try {
      const id = c.req.param("id");
      const customer = await services.customer.findById(id);
      if (!customer) throw new NotFoundError(`Customer ${id} not found`);
      return success(c, customer);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /customers/by-code/:code — find by code */
  router.get("/by-code/:code", async (c) => {
    try {
      const code = c.req.param("code");
      const customer = await services.customer.findByCode(code);
      if (!customer) throw new NotFoundError(`Customer with code ${code} not found`);
      return success(c, customer);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /customers — create customer */
  router.post("/", zValidator("json", createCustomerSchema), async (c) => {
    try {
      const user = getCurrentUser(c);
      const data = c.req.valid("json");
      const customer = await services.customer.create({
        ...data,
        tenantId: user.tenantId,
        factoryId: user.factoryId,
      });
      return created(c, customer);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* PATCH /customers/:id — update customer */
  router.patch("/:id", zValidator("json", updateCustomerSchema), async (c) => {
    try {
      const id = c.req.param("id");
      const data = c.req.valid("json");
      const customer = await services.customer.update(id, data);
      if (!customer) throw new NotFoundError(`Customer ${id} not found`);
      return success(c, customer);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /customers/:id/deactivate — deactivate customer (Admin only) */
  router.post("/:id/deactivate", requireRole(Roles.Administrator), async (c) => {
    try {
      const id = c.req.param("id");
      if (!id) throw new NotFoundError("Customer id is required");
      const user = getCurrentUser(c);
      const customer = await services.customer.deactivate(id, user.sub);
      return success(c, customer);
    } catch (err) {
      return sendError(c, err);
    }
  });

  return router;
}
