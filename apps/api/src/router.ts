import { Hono } from "hono";
import { createCustomerRouter } from "./controllers/customer.controller.js";
import { createOrderRouter } from "./controllers/order.controller.js";
import { createProductionRouter } from "./controllers/production.controller.js";
import { createQueueRouter } from "./controllers/queue.controller.js";
import { createTransferRouter } from "./controllers/transfer.controller.js";
import { createQualityRouter } from "./controllers/quality.controller.js";
import { createDispatchRouter } from "./controllers/dispatch.controller.js";
import { createReworkRouter } from "./controllers/rework.controller.js";
import { createCuttingRouter } from "./controllers/cutting.controller.js";
import { createStationRouter } from "./controllers/station.controller.js";
import { createPersonnelRouter } from "./controllers/personnel.controller.js";
import { createMachineRouter } from "./controllers/machine.controller.js";
import { createInventoryRouter } from "./controllers/inventory.controller.js";
import { createRecipeRouter } from "./controllers/recipe.controller.js";
import { createProductionRecordRouter } from "./controllers/production-record.controller.js";
import { createProductionOrderRouter } from "./controllers/production-order.controller.js";
import type { AppServices } from "./services.js";

export function createRouter(services: AppServices): Hono {
  const router = new Hono();

  router.route("/customers", createCustomerRouter({ customer: services.customer }));
  router.route("/orders", createOrderRouter({ order: services.order }));
  router.route("/production", createProductionRouter({ production: services.production }));
  router.route("/queues", createQueueRouter({ queue: services.queue }));
  router.route("/transfers", createTransferRouter({ transfer: services.transfer }));
  router.route("/quality", createQualityRouter({ quality: services.quality }));
  router.route("/dispatch", createDispatchRouter({ dispatch: services.dispatch }));
  router.route("/rework", createReworkRouter({ rework: services.rework }));
  router.route("/cutting", createCuttingRouter({ cutting: services.cutting }));
  router.route("/stations", createStationRouter({ station: services.station }));
  router.route("/personnel", createPersonnelRouter());
  router.route("/machines", createMachineRouter());
  router.route("/inventory", createInventoryRouter());
  router.route("/recipes", createRecipeRouter({ recipe: services.recipe }));
  router.route("/production-records", createProductionRecordRouter({ productionRecord: services.productionRecord }));
  router.route("/production-orders", createProductionOrderRouter());

  return router;
}
