// ─── OpenAPI 3.0 Specification for GlassOS REST API ─────────────────────────
// Auto-generated for Sprint 2.6.0. Keep in sync with controller & DTO changes.

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "GlassOS REST API",
    description:
      "REST API for GlassOS — a glass manufacturing execution system (MES).\n\n" +
      "All endpoints are prefixed with `/api/v1`. Authentication uses Bearer JWT tokens.\n" +
      "Use `admin-token` for admin access, any other value for operator access.",
    version: "2.6.0",
    contact: { name: "GlassOS Team" },
  },
  servers: [{ url: "/api/v1", description: "API v1" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your Bearer token. Use `admin-token` for admin privileges.",
      },
    },
    schemas: {
      // ── Shared ────────────────────────────────────────────────────────────
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", enum: [false] },
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              fields: { type: "object", additionalProperties: { type: "array", items: { type: "string" } } },
            },
          },
        },
      },
      SuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", enum: [true] },
          data: {},
        },
      },

      // ── Customer ──────────────────────────────────────────────────────────
      CreateCustomerInput: {
        type: "object",
        required: ["code", "name"],
        properties: {
          code: { type: "string", description: "Unique customer code" },
          name: { type: "string", description: "Customer name" },
          taxOffice: { type: "string" },
          taxNumber: { type: "string" },
          phone: { type: "string" },
          email: { type: "string", format: "email" },
          website: { type: "string" },
          notes: { type: "string" },
          isActive: { type: "boolean", default: true },
        },
      },
      UpdateCustomerInput: {
        type: "object",
        properties: {
          name: { type: "string" },
          taxOffice: { type: "string" },
          taxNumber: { type: "string" },
          phone: { type: "string" },
          email: { type: "string", format: "email" },
          website: { type: "string" },
          notes: { type: "string" },
          isActive: { type: "boolean" },
        },
      },

      // ── Order ─────────────────────────────────────────────────────────────
      CreateOrderInput: {
        type: "object",
        required: ["orderNumber", "customerId"],
        properties: {
          orderNumber: { type: "string" },
          customerId: { type: "string" },
          orderDate: { type: "string", format: "date" },
          deliveryDate: { type: "string", format: "date" },
          status: { type: "string" },
          priority: { type: "string", enum: ["low", "normal", "high", "urgent"] },
          notes: { type: "string" },
          lines: {
            type: "array",
            items: { $ref: "#/components/schemas/OrderLineInput" },
          },
        },
      },
      OrderLineInput: {
        type: "object",
        required: ["productId", "quantity"],
        properties: {
          productId: { type: "string" },
          quantity: { type: "number" },
          unit: { type: "string" },
          notes: { type: "string" },
        },
      },
      UpdateOrderInput: {
        type: "object",
        properties: {
          deliveryDate: { type: "string", format: "date" },
          priority: { type: "string", enum: ["low", "normal", "high", "urgent"] },
          notes: { type: "string" },
          status: { type: "string" },
        },
      },

      // ── Production ────────────────────────────────────────────────────────
      CreateProductionInput: {
        type: "object",
        required: ["orderLineId"],
        properties: {
          orderLineId: { type: "string" },
          glassType: { type: "string", enum: ["normal", "tempered", "low_e"] },
          quantity: { type: "number" },
          notes: { type: "string" },
        },
      },
      AssignToStationInput: {
        type: "object",
        required: ["stationId"],
        properties: {
          stationId: { type: "string" },
          userId: { type: "string" },
        },
      },
      TransferProductionInput: {
        type: "object",
        required: ["targetStationId", "targetOperation"],
        properties: {
          targetStationId: { type: "string" },
          targetOperation: { type: "string" },
          userId: { type: "string" },
        },
      },
      UpdateStatusInput: {
        type: "object",
        required: ["status"],
        properties: {
          status: { type: "string" },
          userId: { type: "string" },
        },
      },

      // ── Queue ─────────────────────────────────────────────────────────────
      CreateWorkQueueInput: {
        type: "object",
        required: ["stationId", "operation"],
        properties: {
          stationId: { type: "string" },
          operation: { type: "string" },
          notes: { type: "string" },
        },
      },
      BasketItemInput: {
        type: "object",
        required: ["productionOrderId"],
        properties: {
          productionOrderId: { type: "string" },
        },
      },
      SelectMaterialInput: {
        type: "object",
        required: ["materialId"],
        properties: {
          materialId: { type: "string" },
        },
      },

      // ── Transfer ──────────────────────────────────────────────────────────
      InitiateTransferInput: {
        type: "object",
        required: ["productionOrderId", "fromStationId", "toStationId"],
        properties: {
          productionOrderId: { type: "string" },
          fromStationId: { type: "string" },
          toStationId: { type: "string" },
          userId: { type: "string" },
          notes: { type: "string" },
        },
      },
      ReturnTransferInput: {
        type: "object",
        required: ["productionOrderId", "fromStationId", "toStationId"],
        properties: {
          productionOrderId: { type: "string" },
          fromStationId: { type: "string" },
          toStationId: { type: "string" },
          userId: { type: "string" },
          notes: { type: "string" },
        },
      },
      AssignReadyStationInput: {
        type: "object",
        required: ["productionOrderId", "stationId"],
        properties: {
          productionOrderId: { type: "string" },
          stationId: { type: "string" },
          userId: { type: "string" },
        },
      },

      // ── Quality ───────────────────────────────────────────────────────────
      StartInspectionInput: {
        type: "object",
        required: ["productionOrderId", "inspectorId"],
        properties: {
          productionOrderId: { type: "string" },
          inspectorId: { type: "string" },
          inspectionType: { type: "string" },
          notes: { type: "string" },
        },
      },
      CompleteInspectionInput: {
        type: "object",
        required: ["result"],
        properties: {
          result: { type: "string", enum: ["pass", "fail", "rework"] },
          completedBy: { type: "string" },
        },
      },
      RejectInspectionInput: {
        type: "object",
        required: ["reason"],
        properties: {
          reason: { type: "string" },
        },
      },
      ApproveInspectionInput: {
        type: "object",
        properties: {
          approvedBy: { type: "string" },
        },
      },

      // ── Dispatch ──────────────────────────────────────────────────────────
      ReadyPoolFilter: {
        type: "object",
        properties: {
          customerId: { type: "string" },
          orderId: { type: "string" },
          orderLineId: { type: "string" },
          productType: { type: "string" },
        },
      },
      CreateDispatchInput: {
        type: "object",
        required: ["productionOrderIds"],
        properties: {
          productionOrderIds: { type: "array", items: { type: "string" } },
          notes: { type: "string" },
        },
      },
      CreateDeliveryInput: {
        type: "object",
        required: ["dispatchId", "deliveryDate"],
        properties: {
          dispatchId: { type: "string" },
          deliveryDate: { type: "string", format: "date" },
          notes: { type: "string" },
        },
      },
      AssignVehicleInput: {
        type: "object",
        required: ["vehicleId"],
        properties: {
          vehicleId: { type: "string" },
          driverId: { type: "string" },
          dispatcherId: { type: "string" },
        },
      },
      AssignDriverInput: {
        type: "object",
        required: ["driverId"],
        properties: {
          driverId: { type: "string" },
        },
      },
      AssignDispatcherInput: {
        type: "object",
        required: ["dispatcherId"],
        properties: {
          dispatcherId: { type: "string" },
        },
      },
      LoadVehicleInput: {
        type: "object",
        required: ["loadedBy"],
        properties: {
          loadedBy: { type: "string" },
        },
      },
      CompleteDeliveryInput: {
        type: "object",
        required: ["deliveredBy"],
        properties: {
          deliveredBy: { type: "string" },
        },
      },
      PartialDeliveryInput: {
        type: "object",
        required: ["deliveredOrderLineIds", "deliveredBy"],
        properties: {
          deliveredOrderLineIds: { type: "array", items: { type: "string" } },
          deliveredBy: { type: "string" },
        },
      },
      CancelDispatchInput: {
        type: "object",
        required: ["reason"],
        properties: {
          reason: { type: "string" },
        },
      },

      // ── Station ───────────────────────────────────────────────────────────
      StartOperationInput: {
        type: "object",
        required: ["stationId"],
        properties: {
          stationId: { type: "string" },
          operatorId: { type: "string" },
          glassType: { type: "string", enum: ["normal", "tempered", "low_e"] },
          notes: { type: "string" },
        },
      },
      CompleteOperationInput: {
        type: "object",
        properties: {
          completedBy: { type: "string" },
          notes: { type: "string" },
        },
      },
      CancelOperationInput: {
        type: "object",
        required: ["productionOrderId", "stationId"],
        properties: {
          productionOrderId: { type: "string" },
          stationId: { type: "string" },
          reason: { type: "string" },
        },
      },
      RejectOperationInput: {
        type: "object",
        required: ["productionOrderId", "stationId", "reason"],
        properties: {
          productionOrderId: { type: "string" },
          stationId: { type: "string" },
          reason: { type: "string" },
          operatorId: { type: "string" },
        },
      },
      PauseOperationInput: {
        type: "object",
        properties: {
          reason: { type: "string" },
        },
      },
      ResumeOperationInput: {
        type: "object",
        properties: {
          reason: { type: "string" },
        },
      },
      ValidateLowEInput: {
        type: "object",
        required: ["productionOrderId", "lowEType", "targetStationId"],
        properties: {
          productionOrderId: { type: "string" },
          lowEType: { type: "string", enum: ["temperable", "non_temperable"] },
          targetStationId: { type: "string" },
        },
      },

      // ── Rework ────────────────────────────────────────────────────────────
      CreateReworkInput: {
        type: "object",
        required: ["productionOrderId", "reworkType"],
        properties: {
          productionOrderId: { type: "string" },
          reworkType: { type: "string", enum: ["repair", "reprocess", "scrap"] },
          reason: { type: "string" },
          stationId: { type: "string" },
          notes: { type: "string" },
        },
      },
      UpdateReworkInput: {
        type: "object",
        properties: {
          status: { type: "string" },
          notes: { type: "string" },
        },
      },

      // ── Cutting ───────────────────────────────────────────────────────────
      StartCuttingInput: {
        type: "object",
        required: ["productionOrderId", "machineId", "operatorId"],
        properties: {
          productionOrderId: { type: "string" },
          machineId: { type: "string" },
          operatorId: { type: "string" },
          notes: { type: "string" },
        },
      },
      CompleteCuttingInput: {
        type: "object",
        required: ["cuttingResult"],
        properties: {
          cuttingResult: {
            type: "object",
            properties: {
              producedQuantity: { type: "number" },
              wasteQuantity: { type: "number" },
              notes: { type: "string" },
            },
          },
        },
      },
      RecordWasteInput: {
        type: "object",
        required: ["cuttingResultId", "wasteQuantity"],
        properties: {
          cuttingResultId: { type: "string" },
          wasteQuantity: { type: "number" },
          wasteReason: { type: "string" },
        },
      },
      AssignOperatorInput: {
        type: "object",
        required: ["operatorId"],
        properties: {
          operatorId: { type: "string" },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    // ═══════════════════════════════════════════════════════════════════════
    // CUSTOMERS
    // ═══════════════════════════════════════════════════════════════════════
    "/customers": {
      get: {
        tags: ["Customers"],
        summary: "List active customers",
        operationId: "listCustomers",
        responses: {
          "200": { description: "List of active customers", content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessResponse" } } } },
        },
      },
      post: {
        tags: ["Customers"],
        summary: "Create a new customer",
        operationId: "createCustomer",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateCustomerInput" } } } },
        responses: {
          "201": { description: "Customer created" },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/customers/{id}": {
      get: {
        tags: ["Customers"],
        summary: "Find customer by ID",
        operationId: "getCustomer",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Customer found" },
          "404": { description: "Customer not found" },
        },
      },
      patch: {
        tags: ["Customers"],
        summary: "Update customer",
        operationId: "updateCustomer",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateCustomerInput" } } } },
        responses: { "200": { description: "Customer updated" } },
      },
    },
    "/customers/by-code/{code}": {
      get: {
        tags: ["Customers"],
        summary: "Find customer by code",
        operationId: "getCustomerByCode",
        parameters: [{ name: "code", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Customer found" }, "404": { description: "Customer not found" } },
      },
    },
    "/customers/{id}/deactivate": {
      post: {
        tags: ["Customers"],
        summary: "Deactivate customer",
        operationId: "deactivateCustomer",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Customer deactivated" } },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // ORDERS
    // ═══════════════════════════════════════════════════════════════════════
    "/orders": {
      get: {
        tags: ["Orders"],
        summary: "List approved orders",
        operationId: "listOrders",
        responses: { "200": { description: "List of approved orders" } },
      },
      post: {
        tags: ["Orders"],
        summary: "Create a new order",
        operationId: "createOrder",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateOrderInput" } } } },
        responses: { "201": { description: "Order created" }, "400": { description: "Validation error" } },
      },
    },
    "/orders/{id}": {
      get: {
        tags: ["Orders"],
        summary: "Find order by ID",
        operationId: "getOrder",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Order found" }, "404": { description: "Order not found" } },
      },
      patch: {
        tags: ["Orders"],
        summary: "Update order",
        operationId: "updateOrder",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateOrderInput" } } } },
        responses: { "200": { description: "Order updated" } },
      },
    },
    "/orders/{id}/approve": {
      post: {
        tags: ["Orders"],
        summary: "Approve order",
        operationId: "approveOrder",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Order approved" } },
      },
    },
    "/orders/{id}/cancel": {
      post: {
        tags: ["Orders"],
        summary: "Cancel order",
        operationId: "cancelOrder",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Order cancelled" } },
      },
    },
    "/orders/{id}/lines": {
      get: {
        tags: ["Orders"],
        summary: "Get order lines",
        operationId: "getOrderLines",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Order lines" } },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // PRODUCTION
    // ═══════════════════════════════════════════════════════════════════════
    "/production": {
      get: {
        tags: ["Production"],
        summary: "Find pending cutting orders",
        operationId: "findPendingCutting",
        parameters: [{ name: "orderLineId", in: "query", schema: { type: "string" } }],
        responses: { "200": { description: "Pending cutting orders" } },
      },
      post: {
        tags: ["Production"],
        summary: "Create production order",
        operationId: "createProductionOrder",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateProductionInput" } } } },
        responses: { "201": { description: "Production order created" } },
      },
    },
    "/production/{id}": {
      get: {
        tags: ["Production"],
        summary: "Find production order by ID",
        operationId: "getProductionOrder",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Production order found" }, "404": { description: "Not found" } },
      },
    },
    "/production/{id}/validate": {
      get: {
        tags: ["Production"],
        summary: "Validate production order",
        operationId: "validateProduction",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Validation result" } },
      },
    },
    "/production/by-order-line/{orderLineId}": {
      get: {
        tags: ["Production"],
        summary: "Find production by order line",
        operationId: "getProductionByOrderLine",
        parameters: [{ name: "orderLineId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Production orders" } },
      },
    },
    "/production/{id}/assign-station": {
      post: {
        tags: ["Production"],
        summary: "Assign production to station",
        operationId: "assignToStation",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AssignToStationInput" } } } },
        responses: { "200": { description: "Assigned" } },
      },
    },
    "/production/{id}/transfer": {
      post: {
        tags: ["Production"],
        summary: "Transfer production",
        operationId: "transferProduction",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TransferProductionInput" } } } },
        responses: { "200": { description: "Transferred" } },
      },
    },
    "/production/{id}/status": {
      patch: {
        tags: ["Production"],
        summary: "Update production status",
        operationId: "updateProductionStatus",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateStatusInput" } } } },
        responses: { "200": { description: "Status updated" } },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // QUEUES
    // ═══════════════════════════════════════════════════════════════════════
    "/queues": {
      get: {
        tags: ["Queues"],
        summary: "List active queues",
        operationId: "listActiveQueues",
        responses: { "200": { description: "Active queues" } },
      },
      post: {
        tags: ["Queues"],
        summary: "Create work queue",
        operationId: "createWorkQueue",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateWorkQueueInput" } } } },
        responses: { "201": { description: "Queue created" } },
      },
    },
    "/queues/approved-orders": {
      get: {
        tags: ["Queues"],
        summary: "Load approved orders",
        operationId: "loadApprovedOrders",
        responses: { "200": { description: "Approved orders" } },
      },
    },
    "/queues/approved-lines": {
      get: {
        tags: ["Queues"],
        summary: "Load approved order lines",
        operationId: "loadApprovedOrderLines",
        responses: { "200": { description: "Approved order lines" } },
      },
    },
    "/queues/select-material": {
      post: {
        tags: ["Queues"],
        summary: "Select material",
        operationId: "selectMaterial",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/SelectMaterialInput" } } } },
        responses: { "200": { description: "Material selected" } },
      },
    },
    "/queues/{id}/start": {
      post: {
        tags: ["Queues"],
        summary: "Start queue",
        operationId: "startQueue",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Queue started" } },
      },
    },
    "/queues/{id}/complete": {
      post: {
        tags: ["Queues"],
        summary: "Complete queue",
        operationId: "completeQueue",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Queue completed" } },
      },
    },
    "/queues/{id}/basket": {
      post: {
        tags: ["Queues"],
        summary: "Add order line to basket",
        operationId: "addToBasket",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/BasketItemInput" } } } },
        responses: { "200": { description: "Added to basket" } },
      },
    },
    "/queues/{id}/basket/{productionId}": {
      delete: {
        tags: ["Queues"],
        summary: "Remove order line from basket",
        operationId: "removeFromBasket",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "productionId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "204": { description: "Removed from basket" } },
      },
    },
    "/queues/{id}/statistics": {
      get: {
        tags: ["Queues"],
        summary: "Get queue statistics",
        operationId: "getQueueStatistics",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Queue statistics" } },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TRANSFERS
    // ═══════════════════════════════════════════════════════════════════════
    "/transfers": {
      get: {
        tags: ["Transfers"],
        summary: "List all transfers",
        operationId: "listTransfers",
        responses: { "200": { description: "Transfers" } },
      },
      post: {
        tags: ["Transfers"],
        summary: "Initiate transfer",
        operationId: "initiateTransfer",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/InitiateTransferInput" } } } },
        responses: { "201": { description: "Transfer initiated" } },
      },
    },
    "/transfers/stats": {
      get: {
        tags: ["Transfers"],
        summary: "Get transfer statistics",
        operationId: "getTransferStats",
        responses: { "200": { description: "Transfer statistics" } },
      },
    },
    "/transfers/return": {
      post: {
        tags: ["Transfers"],
        summary: "Return to previous station",
        operationId: "returnTransfer",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ReturnTransferInput" } } } },
        responses: { "200": { description: "Returned" } },
      },
    },
    "/transfers/manual": {
      post: {
        tags: ["Transfers"],
        summary: "Manual transfer",
        operationId: "manualTransfer",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/InitiateTransferInput" } } } },
        responses: { "200": { description: "Manual transfer completed" } },
      },
    },
    "/transfers/assign-ready": {
      post: {
        tags: ["Transfers"],
        summary: "Assign ready station",
        operationId: "assignReadyStation",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AssignReadyStationInput" } } } },
        responses: { "200": { description: "Ready station assigned" } },
      },
    },
    "/transfers/{id}": {
      get: {
        tags: ["Transfers"],
        summary: "Find transfer by ID",
        operationId: "getTransfer",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Transfer found" } },
      },
    },
    "/transfers/{id}/complete": {
      post: {
        tags: ["Transfers"],
        summary: "Complete transfer",
        operationId: "completeTransfer",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Transfer completed" } },
      },
    },
    "/transfers/{id}/cancel": {
      post: {
        tags: ["Transfers"],
        summary: "Cancel transfer",
        operationId: "cancelTransfer",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Transfer cancelled" } },
      },
    },
    "/transfers/{id}/reject": {
      post: {
        tags: ["Transfers"],
        summary: "Reject transfer",
        operationId: "rejectTransfer",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Transfer rejected" } },
      },
    },
    "/transfers/by-production/{productionId}": {
      get: {
        tags: ["Transfers"],
        summary: "Get transfer history for production",
        operationId: "getTransferHistory",
        parameters: [{ name: "productionId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Transfer history" } },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // QUALITY
    // ═══════════════════════════════════════════════════════════════════════
    "/quality/inspections": {
      get: {
        tags: ["Quality"],
        summary: "Get inspection history",
        operationId: "getInspectionHistory",
        parameters: [{ name: "productionOrderId", in: "query", schema: { type: "string" } }],
        responses: { "200": { description: "Inspection history" } },
      },
      post: {
        tags: ["Quality"],
        summary: "Start inspection",
        operationId: "startInspection",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/StartInspectionInput" } } } },
        responses: { "201": { description: "Inspection started" } },
      },
    },
    "/quality/statistics": {
      get: {
        tags: ["Quality"],
        summary: "Get quality statistics",
        operationId: "getQualityStatistics",
        responses: { "200": { description: "Quality statistics" } },
      },
    },
    "/quality/can-proceed/{productionId}": {
      get: {
        tags: ["Quality"],
        summary: "Check if can proceed to ready",
        operationId: "canProceedToReady",
        parameters: [{ name: "productionId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Proceed check result" } },
      },
    },
    "/quality/inspections/{id}/complete": {
      post: {
        tags: ["Quality"],
        summary: "Complete inspection",
        operationId: "completeInspection",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CompleteInspectionInput" } } } },
        responses: { "200": { description: "Inspection completed" } },
      },
    },
    "/quality/inspections/{id}/reject": {
      post: {
        tags: ["Quality"],
        summary: "Reject inspection",
        operationId: "rejectInspection",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RejectInspectionInput" } } } },
        responses: { "200": { description: "Inspection rejected" } },
      },
    },
    "/quality/inspections/{id}/approve": {
      post: {
        tags: ["Quality"],
        summary: "Approve inspection",
        operationId: "approveInspection",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ApproveInspectionInput" } } } },
        responses: { "200": { description: "Inspection approved" } },
      },
    },
    "/quality/inspections/{id}/measurements": {
      post: {
        tags: ["Quality"],
        summary: "Record measurements",
        operationId: "recordMeasurements",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { measurements: {} } } } } },
        responses: { "200": { description: "Measurements recorded" } },
      },
    },
    "/quality/inspections/{id}/visual": {
      post: {
        tags: ["Quality"],
        summary: "Record visual inspection",
        operationId: "recordVisualInspection",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { visualResult: {} } } } } },
        responses: { "200": { description: "Visual inspection recorded" } },
      },
    },
    "/quality/inspections/{id}/notes": {
      post: {
        tags: ["Quality"],
        summary: "Record notes",
        operationId: "recordQualityNotes",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { notes: { type: "string" } } } } } },
        responses: { "200": { description: "Notes recorded" } },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // DISPATCH
    // ═══════════════════════════════════════════════════════════════════════
    "/dispatch/ready-productions": {
      get: {
        tags: ["Dispatch"],
        summary: "List ready productions",
        operationId: "getReadyProductions",
        parameters: [
          { name: "customerId", in: "query", schema: { type: "string" } },
          { name: "orderId", in: "query", schema: { type: "string" } },
          { name: "orderLineId", in: "query", schema: { type: "string" } },
          { name: "productType", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Ready productions" } },
      },
    },
    "/dispatch/ready-order-lines": {
      get: {
        tags: ["Dispatch"],
        summary: "List ready order lines",
        operationId: "getReadyOrderLines",
        parameters: [
          { name: "customerId", in: "query", schema: { type: "string" } },
          { name: "orderId", in: "query", schema: { type: "string" } },
          { name: "orderLineId", in: "query", schema: { type: "string" } },
          { name: "productType", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Ready order lines" } },
      },
    },
    "/dispatch/basket": {
      get: {
        tags: ["Dispatch"],
        summary: "Get dispatch basket",
        operationId: "getDispatchBasket",
        responses: { "200": { description: "Basket contents" } },
      },
      post: {
        tags: ["Dispatch"],
        summary: "Add to dispatch basket",
        operationId: "addToDispatchBasket",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/BasketItemInput" } } } },
        responses: { "200": { description: "Added to basket" } },
      },
    },
    "/dispatch/basket/statistics": {
      get: {
        tags: ["Dispatch"],
        summary: "Get basket statistics",
        operationId: "getBasketStatistics",
        responses: { "200": { description: "Basket statistics" } },
      },
    },
    "/dispatch/basket/{productionId}": {
      delete: {
        tags: ["Dispatch"],
        summary: "Remove from basket",
        operationId: "removeFromDispatchBasket",
        parameters: [{ name: "productionId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Removed from basket" } },
      },
    },
    "/dispatch": {
      post: {
        tags: ["Dispatch"],
        summary: "Create dispatch",
        operationId: "createDispatch",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateDispatchInput" } } } },
        responses: { "201": { description: "Dispatch created" } },
      },
    },
    "/dispatch/deliveries": {
      get: {
        tags: ["Dispatch"],
        summary: "Get delivery history",
        operationId: "getDeliveryHistory",
        parameters: [{ name: "productionOrderId", in: "query", schema: { type: "string" } }],
        responses: { "200": { description: "Delivery history" } },
      },
      post: {
        tags: ["Dispatch"],
        summary: "Create delivery",
        operationId: "createDelivery",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateDeliveryInput" } } } },
        responses: { "201": { description: "Delivery created" } },
      },
    },
    "/dispatch/deliveries/stats": {
      get: {
        tags: ["Dispatch"],
        summary: "Get delivery statistics",
        operationId: "getDeliveryStats",
        responses: { "200": { description: "Delivery statistics" } },
      },
    },
    "/dispatch/deliveries/counters/{orderLineId}": {
      get: {
        tags: ["Dispatch"],
        summary: "Get order line delivery counters",
        operationId: "getDeliveryCounters",
        parameters: [{ name: "orderLineId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Delivery counters" } },
      },
    },
    "/dispatch/deliveries/{id}/assign-vehicle": {
      post: {
        tags: ["Dispatch"],
        summary: "Assign vehicle to delivery",
        operationId: "assignVehicle",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AssignVehicleInput" } } } },
        responses: { "200": { description: "Vehicle assigned" } },
      },
    },
    "/dispatch/deliveries/{id}/assign-driver": {
      post: {
        tags: ["Dispatch"],
        summary: "Assign driver to delivery",
        operationId: "assignDriver",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AssignDriverInput" } } } },
        responses: { "200": { description: "Driver assigned" } },
      },
    },
    "/dispatch/deliveries/{id}/assign-dispatcher": {
      post: {
        tags: ["Dispatch"],
        summary: "Assign dispatcher to delivery",
        operationId: "assignDispatcher",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AssignDispatcherInput" } } } },
        responses: { "200": { description: "Dispatcher assigned" } },
      },
    },
    "/dispatch/deliveries/{id}/load": {
      post: {
        tags: ["Dispatch"],
        summary: "Load vehicle",
        operationId: "loadVehicle",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/LoadVehicleInput" } } } },
        responses: { "200": { description: "Vehicle loaded" } },
      },
    },
    "/dispatch/deliveries/{id}/unload": {
      post: {
        tags: ["Dispatch"],
        summary: "Unload vehicle",
        operationId: "unloadVehicle",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Vehicle unloaded" } },
      },
    },
    "/dispatch/deliveries/{id}/ship": {
      post: {
        tags: ["Dispatch"],
        summary: "Start shipment",
        operationId: "startShipment",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Shipment started" } },
      },
    },
    "/dispatch/deliveries/{id}/deliver": {
      post: {
        tags: ["Dispatch"],
        summary: "Complete delivery",
        operationId: "completeDelivery",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CompleteDeliveryInput" } } } },
        responses: { "200": { description: "Delivery completed" } },
      },
    },
    "/dispatch/deliveries/{id}/partial-deliver": {
      post: {
        tags: ["Dispatch"],
        summary: "Partial delivery",
        operationId: "partialDelivery",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/PartialDeliveryInput" } } } },
        responses: { "200": { description: "Partial delivery completed" } },
      },
    },
    "/dispatch/deliveries/{id}/cancel": {
      post: {
        tags: ["Dispatch"],
        summary: "Cancel dispatch",
        operationId: "cancelDispatch",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CancelDispatchInput" } } } },
        responses: { "200": { description: "Dispatch cancelled" } },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // REWORK
    // ═══════════════════════════════════════════════════════════════════════
    "/rework": {
      get: {
        tags: ["Rework"],
        summary: "List rework orders",
        operationId: "listReworkOrders",
        responses: { "200": { description: "Rework orders" } },
      },
      post: {
        tags: ["Rework"],
        summary: "Create rework order",
        operationId: "createReworkOrder",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateReworkInput" } } } },
        responses: { "201": { description: "Rework order created" } },
      },
    },
    "/rework/{id}": {
      get: {
        tags: ["Rework"],
        summary: "Find rework by ID",
        operationId: "getReworkOrder",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Rework order found" } },
      },
      patch: {
        tags: ["Rework"],
        summary: "Update rework order",
        operationId: "updateReworkOrder",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateReworkInput" } } } },
        responses: { "200": { description: "Rework order updated" } },
      },
    },
    "/rework/{id}/start": {
      post: {
        tags: ["Rework"],
        summary: "Start rework",
        operationId: "startRework",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Rework started" } },
      },
    },
    "/rework/{id}/complete": {
      post: {
        tags: ["Rework"],
        summary: "Complete rework",
        operationId: "completeRework",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Rework completed" } },
      },
    },
    "/rework/{id}/cancel": {
      post: {
        tags: ["Rework"],
        summary: "Cancel rework",
        operationId: "cancelRework",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Rework cancelled" } },
      },
    },
    "/rework/by-production/{productionOrderId}": {
      get: {
        tags: ["Rework"],
        summary: "Get rework history by production",
        operationId: "getReworkByProduction",
        parameters: [{ name: "productionOrderId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Rework history" } },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // CUTTING
    // ═══════════════════════════════════════════════════════════════════════
    "/cutting": {
      get: {
        tags: ["Cutting"],
        summary: "List cutting executions",
        operationId: "listCuttingExecutions",
        responses: { "200": { description: "Cutting executions" } },
      },
    },
    "/cutting/active": {
      get: {
        tags: ["Cutting"],
        summary: "Get active cutting executions",
        operationId: "getActiveCutting",
        responses: { "200": { description: "Active cutting executions" } },
      },
    },
    "/cutting/statistics": {
      get: {
        tags: ["Cutting"],
        summary: "Get cutting statistics",
        operationId: "getCuttingStatistics",
        responses: { "200": { description: "Cutting statistics" } },
      },
    },
    "/cutting/{id}": {
      get: {
        tags: ["Cutting"],
        summary: "Find cutting by ID",
        operationId: "getCuttingExecution",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Cutting execution found" } },
      },
    },
    "/cutting/{id}/start": {
      post: {
        tags: ["Cutting"],
        summary: "Start cutting",
        operationId: "startCutting",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/StartCuttingInput" } } } },
        responses: { "200": { description: "Cutting started" } },
      },
    },
    "/cutting/{id}/complete": {
      post: {
        tags: ["Cutting"],
        summary: "Complete cutting",
        operationId: "completeCutting",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CompleteCuttingInput" } } } },
        responses: { "200": { description: "Cutting completed" } },
      },
    },
    "/cutting/{id}/pause": {
      post: {
        tags: ["Cutting"],
        summary: "Pause cutting",
        operationId: "pauseCutting",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Cutting paused" } },
      },
    },
    "/cutting/{id}/resume": {
      post: {
        tags: ["Cutting"],
        summary: "Resume cutting",
        operationId: "resumeCutting",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Cutting resumed" } },
      },
    },
    "/cutting/{id}/cancel": {
      post: {
        tags: ["Cutting"],
        summary: "Cancel cutting",
        operationId: "cancelCutting",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Cutting cancelled" } },
      },
    },
    "/cutting/{id}/waste": {
      post: {
        tags: ["Cutting"],
        summary: "Record waste",
        operationId: "recordWaste",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RecordWasteInput" } } } },
        responses: { "200": { description: "Waste recorded" } },
      },
    },
    "/cutting/{id}/assign-operator": {
      post: {
        tags: ["Cutting"],
        summary: "Assign operator to cutting",
        operationId: "assignCuttingOperator",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AssignOperatorInput" } } } },
        responses: { "200": { description: "Operator assigned" } },
      },
    },
    "/cutting/by-queue/{queueId}": {
      get: {
        tags: ["Cutting"],
        summary: "Get cutting by queue ID",
        operationId: "getCuttingByQueue",
        parameters: [{ name: "queueId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Cutting executions" } },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // STATIONS
    // ═══════════════════════════════════════════════════════════════════════
    "/stations": {
      get: {
        tags: ["Stations"],
        summary: "List all stations",
        operationId: "listStations",
        responses: { "200": { description: "Stations" } },
      },
    },
    "/stations/active": {
      get: {
        tags: ["Stations"],
        summary: "Get active productions",
        operationId: "getActiveProductions",
        responses: { "200": { description: "Active productions" } },
      },
    },
    "/stations/statistics": {
      get: {
        tags: ["Stations"],
        summary: "Get station statistics",
        operationId: "getStationStatistics",
        responses: { "200": { description: "Station statistics" } },
      },
    },
    "/stations/operation-history": {
      get: {
        tags: ["Stations"],
        summary: "Get operation history",
        operationId: "getOperationHistory",
        responses: { "200": { description: "Operation history" } },
      },
    },
    "/stations/waiting-pool": {
      get: {
        tags: ["Stations"],
        summary: "Get waiting pool",
        operationId: "getWaitingPool",
        responses: { "200": { description: "Waiting pool" } },
      },
    },
    "/stations/waiting-pool/statistics": {
      get: {
        tags: ["Stations"],
        summary: "Get waiting pool statistics",
        operationId: "getWaitingPoolStats",
        responses: { "200": { description: "Waiting pool statistics" } },
      },
    },
    "/stations/waiting-pool/{productionId}": {
      post: {
        tags: ["Stations"],
        summary: "Add to waiting pool",
        operationId: "addToWaitingPool",
        parameters: [{ name: "productionId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Added to waiting pool" } },
      },
      delete: {
        tags: ["Stations"],
        summary: "Remove from waiting pool",
        operationId: "removeFromWaitingPool",
        parameters: [
          { name: "productionId", in: "path", required: true, schema: { type: "string" } },
          { name: "stationId", in: "query", schema: { type: "string" } },
        ],
        responses: { "204": { description: "Removed from waiting pool" } },
      },
    },
    "/stations/{id}/start": {
      post: {
        tags: ["Stations"],
        summary: "Start operation",
        operationId: "startOperation",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/StartOperationInput" } } } },
        responses: { "200": { description: "Operation started" } },
      },
    },
    "/stations/{id}/complete": {
      post: {
        tags: ["Stations"],
        summary: "Complete operation",
        operationId: "completeOperation",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CompleteOperationInput" } } } },
        responses: { "200": { description: "Operation completed" } },
      },
    },
    "/stations/{id}/pause": {
      post: {
        tags: ["Stations"],
        summary: "Pause operation",
        operationId: "pauseOperation",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/PauseOperationInput" } } } },
        responses: { "200": { description: "Operation paused" } },
      },
    },
    "/stations/{id}/resume": {
      post: {
        tags: ["Stations"],
        summary: "Resume operation",
        operationId: "resumeOperation",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ResumeOperationInput" } } } },
        responses: { "200": { description: "Operation resumed" } },
      },
    },
    "/stations/{id}/cancel": {
      post: {
        tags: ["Stations"],
        summary: "Cancel operation",
        operationId: "cancelOperation",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CancelOperationInput" } } } },
        responses: { "200": { description: "Operation cancelled" } },
      },
    },
    "/stations/{id}/reject": {
      post: {
        tags: ["Stations"],
        summary: "Reject operation",
        operationId: "rejectOperation",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RejectOperationInput" } } } },
        responses: { "200": { description: "Operation rejected" } },
      },
    },
    "/stations/{id}/validate-low-e": {
      post: {
        tags: ["Stations"],
        summary: "Validate Low-E glass",
        operationId: "validateLowE",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ValidateLowEInput" } } } },
        responses: { "200": { description: "Low-E validated" } },
      },
    },
    "/stations/{id}/operation-status": {
      get: {
        tags: ["Stations"],
        summary: "Get operation status",
        operationId: "getOperationStatus",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Operation status" } },
      },
    },
    "/stations/{id}/by-operation/{operationId}": {
      get: {
        tags: ["Stations"],
        summary: "Get operation by ID within station",
        operationId: "getOperationById",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "operationId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Operation details" } },
      },
    },
  },
} ;
