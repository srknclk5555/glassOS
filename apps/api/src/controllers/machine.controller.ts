import { Hono } from "hono";
import { success, sendError } from "../lib/response.js";

export function createMachineRouter() {
  const router = new Hono();

  router.get("/", async (c) => {
    try {
      return success(c, { message: "Machines API not yet implemented" });
    } catch (err) {
      return sendError(c, err);
    }
  });

  return router;
}
