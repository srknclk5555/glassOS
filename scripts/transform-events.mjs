// Transform all services to integrate EventPublisher.
// Reads each file, adds EventPublisher to imports + constructor,
// and wraps event-returning methods to publish after transaction.

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const servicesDir = join(__dirname, "..", "services");

interface ServiceConfig {
  file: string;
  imports: string[]; // current event imports
  constructorEndMarker: string; // unique string near end of constructor
  eventMethods: Array<{
    methodName: string;
    returnTypePrefix: string; // text before return/await withTenantSession
    hasEventsArray: boolean; // true if returns {events: [...]}
    singularEventField?: string; // for non-standard returns like breakageEvent
  }>;
}

const configs: ServiceConfig[] = [
  {
    file: "order.service.ts",
    imports: ['import type { OrderApprovedEvent } from "./events.js";'],
    constructorEndMarker: "private readonly db: any",
    eventMethods: [
      { methodName: "approveOrder", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true }
    ]
  },
  {
    file: "production.service.ts",
    imports: ['import type { ProductionTransferredEvent } from "./events.js";'],
    constructorEndMarker: "private readonly db: any",
    eventMethods: [
      { methodName: "transferProduction", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true }
    ]
  },
  {
    file: "production-queue.service.ts",
    imports: ['import type {', '  QueueCreatedEvent,', '  QueueStartedEvent,', '  QueueCompletedEvent,', '} from "./events.js";'],
    constructorEndMarker: "private readonly db: any",
    eventMethods: [
      { methodName: "createWorkQueue", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true },
      { methodName: "startQueue", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true },
      { methodName: "completeQueue", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true }
    ]
  },
  {
    file: "rework.service.ts",
    imports: ['import type { ReworkCreatedEvent, FireDepotAssignedEvent, ReworkMergedEvent } from "./events.js";'],
    constructorEndMarker: "private readonly db: any",
    eventMethods: [
      { methodName: "createReworkOrder", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true },
      { methodName: "createBreakageRework", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true },
      { methodName: "mergeRework", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true }
    ]
  },
  {
    file: "cutting-execution.service.ts",
    imports: ['import type {', '  CuttingSessionCreatedEvent,', '  CuttingStartedEvent,', '  CuttingCompletedEvent,', '  CuttingPausedEvent,', '  CuttingResumedEvent,', '  CuttingCancelledEvent,', '  BreakageRegisteredEvent,', '  CuttingStartedEvent as CuttingStartedEventAlias,', '} from "./events.js";'],
    constructorEndMarker: "private readonly db: any",
    eventMethods: [
      { methodName: "createSession", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true },
      { methodName: "startSession", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true },
      { methodName: "completeSession", returnTypePrefix: "await withTenantSession(async (tx, ctx) => {", hasEventsArray: true },
      { methodName: "pauseSession", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true },
      { methodName: "resumeSession", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true },
      { methodName: "cancelSession", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true },
      { methodName: "registerBreakage", singularEventField: "breakageEvent", hasEventsArray: false }
    ]
  },
  {
    file: "production-transfer.service.ts",
    imports: ['import type {', '  TransferInitiatedEvent,', '  TransferCompletedEvent,', '  TransferCancelledEvent,', '  TransferRejectedEvent,', '  ReadyStationAssignedEvent,', '  ProductionTransferredEvent,', '} from "./events.js";'],
    constructorEndMarker: "private readonly db: any",
    eventMethods: [
      { methodName: "initiateTransfer", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true },
      { methodName: "completeTransfer", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true },
      { methodName: "cancelTransfer", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true },
      { methodName: "rejectTransfer", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true },
      { methodName: "assignReadyStation", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true }
    ]
  },
  {
    file: "station-operation.service.ts",
    imports: ['import type {', '  GrindingStartedEvent,', '  GrindingCompletedEvent,', '  TemperStartedEvent,', '  TemperCompletedEvent,', '  InsulatingGlassStartedEvent,', '  InsulatingGlassCompletedEvent,', '  FurnaceCapacityCalculatedEvent,', '  LowEValidationFailedEvent,', '} from "./events.js";'],
    constructorEndMarker: "private readonly db: any",
    eventMethods: [
      { methodName: "startOperation", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true },
      { methodName: "completeOperation", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true },
      { methodName: "cancelOperation", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true },
      { methodName: "rejectOperation", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true }
    ]
  },
  {
    file: "quality-control.service.ts",
    imports: ['import type {', '  InspectionStartedEvent,', '  InspectionPassedEvent,', '  InspectionFailedEvent,', '  InspectionRejectedEvent,', '  ReworkRequestedEvent,', '  ReadyApprovedEvent,', '} from "./events.js";'],
    constructorEndMarker: "private readonly db: any",
    eventMethods: [
      { methodName: "startInspection", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true },
      { methodName: "completeInspection", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true },
      { methodName: "rejectInspection", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true },
      { methodName: "approveInspection", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true }
    ]
  },
  {
    file: "dispatch.service.ts",
    imports: ['import type {', '  DispatchCreatedEvent,', '  VehicleAssignedEvent,', '  LoadingStartedEvent,', '  LoadingCompletedEvent,', '  ShipmentStartedEvent,', '  DeliveryCompletedEvent,', '  PartialDeliveryCompletedEvent,', '  DispatchCancelledEvent,', '} from "./events.js";'],
    constructorEndMarker: "private readonly qualityControlService: QualityControlService,",
    eventMethods: [
      { methodName: "createDispatch", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true },
      { methodName: "createDelivery", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true },
      { methodName: "assignVehicle", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true },
      { methodName: "loadVehicle", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true },
      { methodName: "unloadVehicle", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true },
      { methodName: "startShipment", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true },
      { methodName: "completeDelivery", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true },
      { methodName: "completePartialDelivery", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true },
      { methodName: "cancelDispatch", returnTypePrefix: "return withTenantSession(async (tx, ctx) => {", hasEventsArray: true }
    ]
  }
];

function addPublisherToConstructor(content: string, endMarker: string): string {
  const idx = content.indexOf(endMarker);
  if (idx === -1) {
    console.error(`  ⚠️ Could not find constructor end marker: "${endMarker}"`);
    return content;
  }
  const lineEnd = content.indexOf("\n", idx);
  const before = content.slice(0, lineEnd + 1);
  const after = content.slice(lineEnd + 1);
  return before + "    private readonly eventPublisher: EventPublisher\n" + after;
}

function addEventPublisherImport(content: string, existingImports: string[]): string {
  const importLine = `import type { EventPublisher } from "./events.js";`;
  // Find first existing import from events.js
  for (const imp of existingImports) {
    const idx = content.indexOf(imp);
    if (idx !== -1) {
      const lineEnd = content.indexOf("\n", idx);
      return content.slice(0, lineEnd + 1) + importLine + "\n" + content.slice(lineEnd + 1);
    }
  }
  // If no existing events.js import, add after last type import
  const lastTypeImport = content.lastIndexOf('import type {');
  if (lastTypeImport !== -1) {
    const lineEnd = content.indexOf("\n", lastTypeImport);
    const nextLine = content.indexOf("\n", lineEnd + 1);
    // Find the closing } of the type import block
    const closingBrace = content.indexOf("}", lineEnd);
    const afterClose = content.indexOf("\n", closingBrace);
    return content.slice(0, afterClose + 1) + importLine + "\n" + content.slice(afterClose + 1);
  }
  return content;
}

function transformEventMethod(content: string, method: ServiceConfig["eventMethods"][0]): string {
  if (method.hasEventsArray) {
    // Standard pattern: return/await withTenantSession(...) that returns {..., events: [...]}
    // Transform: return withTenantSession(...)  →  const _result = await withTenantSession(...) + publish + return
    const target = method.returnTypePrefix;
    // Find first occurrence AFTER the method name
    const methodIdx = content.indexOf(`async ${method.methodName}(`);
    if (methodIdx === -1) {
      console.error(`  ⚠️ Method not found: ${method.methodName}`);
      return content;
    }
    const searchFrom = methodIdx;
    const prefixIdx = content.indexOf(target, searchFrom);
    if (prefixIdx === -1) {
      console.error(`  ⚠️ Prefix not found for ${method.methodName}: "${target.substring(0, 40)}"`);
      return content;
    }

    // Find the closing }); of the withTenantSession call
    // We need to find the matching closing braces
    const bodyStart = prefixIdx + target.length;
    let depth = 1;
    let pos = bodyStart;
    let inString = false;
    let stringChar = "";
    let inTemplate = false;

    while (pos < content.length && depth > 0) {
      const ch = content[pos];
      if (inString) {
        if (ch === "\\") { pos += 2; continue; }
        if (ch === stringChar) inString = false;
      } else if (inTemplate) {
        if (ch === "\\") { pos += 2; continue; }
        if (ch === "${") inString = true;
        if (ch === "`") inTemplate = false;
      } else {
        if (ch === '"' || ch === "'") { inString = true; stringChar = ch; }
        else if (ch === "`") inTemplate = true;
        else if (ch === "(" || ch === "{" || ch === "[") depth++;
        else if (ch === ")" || ch === "}" || ch === "]") depth--;
      }
      pos++;
    }

    // Now we know where the withTenantSession call ends
    // Replace `return withTenantSession(` or `await withTenantSession(` 
    // with `const _result = await withTenantSession(`
    // and add publishing + return after the closing
    
    const statement = content.slice(prefixIdx, pos);
    
    let newStatement: string;
    if (target.startsWith("return ")) {
      newStatement = target.replace("return ", "") + "\n" + 
        "    const _result = await ";
      // Actually this is getting too complex. Let me try differently.
      // Find the exact `return withTenantSession(` and replace it
    }

    // Simple approach: find and replace the exact text
    const replacement = `const _r = await ${target.replace(/^(return |await )/, "")}`;
    
    const before = content.slice(0, prefixIdx);
    const after = content.slice(pos);
    
    return before + replacement + after.slice(0, 0) + 
      `\n    await this.eventPublisher.publishMany(_r.events ?? []);\n    return _r;\n  }` + after;
  } else if (method.singularEventField) {
    // Non-standard pattern like registerBreakage
    // This needs manual handling
    return content;
  }
  return content;
}

// Process each file
for (const config of configs) {
  const filePath = join(servicesDir, config.file);
  console.log(`\n📄 Processing ${config.file}...`);
  
  let content = readFileSync(filePath, "utf-8");
  const original = content;
  
  // 1. Add EventPublisher import
  content = addEventPublisherImport(content, config.imports);
  
  // 2. Add eventPublisher to constructor
  content = addPublisherToConstructor(content, config.constructorEndMarker);
  
  // 3. Transform each event method
  for (const method of config.eventMethods) {
    content = transformEventMethod(content, method);
  }
  
  if (content !== original) {
    writeFileSync(filePath, content, "utf-8");
    console.log(`  ✅ Updated`);
  } else {
    console.log(`  ❌ No changes made`);
  }
}

console.log("\n✅ Done!");
