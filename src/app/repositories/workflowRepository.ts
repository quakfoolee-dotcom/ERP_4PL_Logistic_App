import { useSyncExternalStore } from "react";
import { freightFiles, type FreightFileRecord } from "../domain/businessReadiness";
import {
  accountingSyncRecords,
  asnReceivingRecords,
  billingQueueRecords,
  dispatchRecords,
  returnAuthorizations,
  serviceEvents,
  type AccountingSyncRecord,
  type AccountingSyncStatus,
  type AsnReceivingRecord,
  type BillingQueueRecord,
  type BillingQueueStatus,
  type ConditionStatus,
  type DispatchRecord,
  type ReturnAuthorizationRecord,
  type ServiceEventRecord,
} from "../domain/workflowReadiness";
import { buildWorkflowSeedFromOrderToCash, mergeWorkflowSeeds } from "./orderToCashAdapters";
import { orderToCashRepository } from "./orderToCashRepository";

const STORAGE_KEY = "erp4pl.workflowReadiness.v3";

export interface WorkflowAuditEvent {
  id: string;
  at: string;
  actor: string;
  module: "freight" | "wms" | "tms" | "finance";
  entityId: string;
  action: string;
  note: string;
}

export interface WorkflowSnapshot {
  freightFiles: FreightFileRecord[];
  asns: AsnReceivingRecord[];
  returns: ReturnAuthorizationRecord[];
  serviceEvents: ServiceEventRecord[];
  dispatches: DispatchRecord[];
  billingQueue: BillingQueueRecord[];
  accountingSync: AccountingSyncRecord[];
  auditTrail: WorkflowAuditEvent[];
}

const orderToCashWorkflowSeed = buildWorkflowSeedFromOrderToCash();

export interface InventoryDispatchRequestInput {
  sourceId: string;
  customer: string;
  warehouse: string;
  container: string;
  units: number;
  pallets: number;
  destination: string;
  note: string;
}

const defaultSnapshot: WorkflowSnapshot = {
  freightFiles: mergeWorkflowSeeds(freightFiles, orderToCashWorkflowSeed.freightFiles),
  asns: mergeWorkflowSeeds(asnReceivingRecords, orderToCashWorkflowSeed.asns),
  returns: mergeWorkflowSeeds(returnAuthorizations, orderToCashWorkflowSeed.returns),
  serviceEvents: mergeWorkflowSeeds(serviceEvents, orderToCashWorkflowSeed.serviceEvents),
  dispatches: mergeWorkflowSeeds(dispatchRecords, orderToCashWorkflowSeed.dispatches),
  billingQueue: mergeWorkflowSeeds(billingQueueRecords, orderToCashWorkflowSeed.billingQueue),
  accountingSync: mergeWorkflowSeeds(accountingSyncRecords, orderToCashWorkflowSeed.accountingSync),
  auditTrail: [],
};

type WorkflowResult = { ok: true; message: string } | { ok: false; message: string };

function clone<T>(value: T): T {
  return structuredClone(value);
}

function nowStamp() {
  return new Date().toLocaleString("en-CA");
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function appendNote(current: string, next: string) {
  return `${current} | ${nowStamp()}: ${next}`;
}

function mergeById<T extends { id: string }>(defaults: T[], saved: T[] | undefined): T[] {
  if (!Array.isArray(saved)) return clone(defaults);
  const savedById = new Map(saved.map((item) => [item.id, item]));
  const merged = defaults.map((item) => ({ ...item, ...savedById.get(item.id) }));
  const defaultIds = new Set(defaults.map((item) => item.id));
  const additions = saved.filter((item) => !defaultIds.has(item.id));
  return [...merged, ...additions];
}

function normalizeSnapshot(saved: Partial<WorkflowSnapshot>): WorkflowSnapshot {
  const normalizedFreightFiles = mergeById(defaultSnapshot.freightFiles, saved.freightFiles);
  const normalizedAsns = mergeById(defaultSnapshot.asns, saved.asns).map((asn) => {
    const file = normalizedFreightFiles.find((item) => item.id === asn.freightFileId);
    return file ? enforceAsnReceivingGate(syncAsnFromFreight(asn, file)) : asn;
  });
  return {
    freightFiles: normalizedFreightFiles,
    asns: normalizedAsns,
    returns: mergeById(defaultSnapshot.returns, saved.returns),
    serviceEvents: mergeById(defaultSnapshot.serviceEvents, saved.serviceEvents),
    dispatches: mergeById(defaultSnapshot.dispatches, saved.dispatches),
    billingQueue: mergeById(defaultSnapshot.billingQueue, saved.billingQueue),
    accountingSync: mergeById(defaultSnapshot.accountingSync, saved.accountingSync),
    auditTrail: Array.isArray(saved.auditTrail) ? saved.auditTrail : [],
  };
}

function loadSnapshot(): WorkflowSnapshot {
  if (typeof window === "undefined") return clone(defaultSnapshot);
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) return normalizeSnapshot(JSON.parse(saved));

    return clone(defaultSnapshot);
  } catch {
    return clone(defaultSnapshot);
  }
}

function saveSnapshot(snapshot: WorkflowSnapshot) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // localStorage can be unavailable in private or restricted browser contexts.
  }
}

let state = loadSnapshot();
const listeners = new Set<() => void>();

function audit(
  snapshot: WorkflowSnapshot,
  module: WorkflowAuditEvent["module"],
  entityId: string,
  action: string,
  note: string,
): WorkflowSnapshot {
  const event: WorkflowAuditEvent = {
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    at: nowStamp(),
    actor: "Ops Team",
    module,
    entityId,
    action,
    note,
  };
  return { ...snapshot, auditTrail: [event, ...snapshot.auditTrail].slice(0, 250) };
}

function publish(next: WorkflowSnapshot) {
  state = next;
  saveSnapshot(state);
  listeners.forEach((listener) => listener());
}

function mapById<T extends { id: string }>(items: T[], id: string, patch: Partial<T> | ((item: T) => T)): T[] {
  return items.map((item) => {
    if (item.id !== id) return item;
    return typeof patch === "function" ? patch(item) : { ...item, ...patch };
  });
}

function customsStatusFor(file: FreightFileRecord): AsnReceivingRecord["customsReleaseStatus"] {
  if (file.customsStatus === "Released" || ["released", "devanning", "closed"].includes(file.status)) return "released";
  if (file.customsStatus === "Hold" || file.status === "hold") return "hold";
  if (file.customsStatus === "Submitted" || file.status === "customs_review") return "submitted";
  return "documents_needed";
}

function syncAsnFromFreight(asn: AsnReceivingRecord, file: FreightFileRecord): AsnReceivingRecord {
  const customsReleaseStatus = customsStatusFor(file);
  const released = customsReleaseStatus === "released";
  const receivingAppointment = released && asn.receivingAppointment === "Pending docs" ? `${file.eta} 09:00` : asn.receivingAppointment;
  return {
    ...asn,
    customsReleaseStatus,
    receivingAppointment,
    asnSource: released ? "freight_release" : asn.asnSource,
    note: released && asn.customsReleaseStatus !== "released"
      ? appendNote(asn.note, `Freight file ${file.id} released; ASN is eligible for receiving.`)
      : asn.note,
  };
}

function enforceAsnReceivingGate(asn: AsnReceivingRecord): AsnReceivingRecord {
  if (["released", "not_required"].includes(asn.customsReleaseStatus)) return asn;
  if (asn.status === "closed" || asn.status === "variance") return asn;
  return {
    ...asn,
    status: "scheduled",
    inspectionStatus: "not_started",
    conditionStatus: "unchecked",
    inventoryStatus: "not_recorded",
    receivedUnits: 0,
    varianceUnits: 0,
  };
}

function upsertAccountingSync(snapshot: WorkflowSnapshot, item: AccountingSyncRecord): WorkflowSnapshot {
  const exists = snapshot.accountingSync.some((sync) => sync.id === item.id);
  return {
    ...snapshot,
    accountingSync: exists
      ? snapshot.accountingSync.map((sync) => sync.id === item.id ? { ...sync, ...item } : sync)
      : [item, ...snapshot.accountingSync],
  };
}

function upsertBillingQueue(snapshot: WorkflowSnapshot, item: BillingQueueRecord): WorkflowSnapshot {
  const exists = snapshot.billingQueue.some((queueItem) => queueItem.id === item.id || queueItem.sourceId === item.sourceId);
  return {
    ...snapshot,
    billingQueue: exists
      ? snapshot.billingQueue.map((queueItem) => queueItem.id === item.id || queueItem.sourceId === item.sourceId ? { ...queueItem, ...item, id: queueItem.id } : queueItem)
      : [item, ...snapshot.billingQueue],
  };
}

function upsertServiceEvent(snapshot: WorkflowSnapshot, item: ServiceEventRecord): WorkflowSnapshot {
  const exists = snapshot.serviceEvents.some((event) => event.id === item.id || event.source === item.source);
  return {
    ...snapshot,
    serviceEvents: exists
      ? snapshot.serviceEvents.map((event) => event.id === item.id || event.source === item.source ? { ...event, ...item, id: event.id } : event)
      : [item, ...snapshot.serviceEvents],
  };
}

function dispatchIdForInventory(sourceId: string) {
  return `DSP-INV-${sourceId.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36).toUpperCase()}`;
}

export const workflowRepository = {
  getSnapshot(): WorkflowSnapshot {
    return state;
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  reset() {
    publish(clone(defaultSnapshot));
  },

  refreshFromOrderToCash(note = "Workflow records refreshed from customer-to-cash backbone.") {
    const seed = buildWorkflowSeedFromOrderToCash(orderToCashRepository.getSnapshot());
    publish(audit({
      ...state,
      freightFiles: mergeWorkflowSeeds(state.freightFiles, seed.freightFiles),
      asns: mergeWorkflowSeeds(state.asns, seed.asns).map((asn) => {
        const file = mergeWorkflowSeeds(state.freightFiles, seed.freightFiles).find((item) => item.id === asn.freightFileId);
        return file ? enforceAsnReceivingGate(syncAsnFromFreight(asn, file)) : asn;
      }),
      returns: mergeWorkflowSeeds(state.returns, seed.returns),
      serviceEvents: mergeWorkflowSeeds(state.serviceEvents, seed.serviceEvents),
      dispatches: mergeWorkflowSeeds(state.dispatches, seed.dispatches),
      billingQueue: mergeWorkflowSeeds(state.billingQueue, seed.billingQueue),
      accountingSync: mergeWorkflowSeeds(state.accountingSync, seed.accountingSync),
    }, "freight", "O2C", "refresh_o2c", note));
  },

  resetWmsWorkflows() {
    publish(audit({
      ...state,
      asns: clone(defaultSnapshot.asns),
      returns: clone(defaultSnapshot.returns),
      serviceEvents: clone(defaultSnapshot.serviceEvents),
    }, "wms", "WMS", "reset", "WMS workflow records reset to defaults."));
  },

  updateFreightFile(id: string, patch: Partial<FreightFileRecord>) {
    const file = state.freightFiles.find((item) => item.id === id);
    if (!file) return;
    const updatedFile = { ...file, ...patch };
    let next: WorkflowSnapshot = {
      ...state,
      freightFiles: mapById(state.freightFiles, id, updatedFile),
      asns: state.asns.map((asn) => asn.freightFileId === id ? syncAsnFromFreight(asn, updatedFile) : asn),
    };
    next = audit(next, "freight", id, "update", "Freight file updated and related ASN release state synchronized.");
    publish(next);
  },

  submitFreightDocuments(id: string): WorkflowResult {
    const file = state.freightFiles.find((item) => item.id === id);
    if (!file) return { ok: false, message: "Freight file not found." };
    const updatedFile: FreightFileRecord = {
      ...file,
      status: "customs_review",
      customsStatus: "Submitted",
      milestonesDone: Math.max(file.milestonesDone, Math.min(file.milestonesTotal, 4)),
      exception: file.exception === "None" ? "Documents submitted; awaiting customs release." : `${file.exception} | Documents submitted; awaiting customs release.`,
    };
    let next: WorkflowSnapshot = {
      ...state,
      freightFiles: mapById(state.freightFiles, id, updatedFile),
      asns: state.asns.map((asn) => asn.freightFileId === id ? enforceAsnReceivingGate(syncAsnFromFreight(asn, updatedFile)) : asn),
    };
    next = audit(next, "freight", id, "submit_docs_customs", `Freight file ${id} documents submitted; ASN remains gated until customs release.`);
    orderToCashRepository.syncFreightCustomsSubmitted(id);
    publish(next);
    return { ok: true, message: "Documents submitted. ASN remains gated until customs release." };
  },

  releaseFreightToAsn(id: string): WorkflowResult {
    const file = state.freightFiles.find((item) => item.id === id);
    if (!file) return { ok: false, message: "Freight file not found." };
    const updatedFile: FreightFileRecord = {
      ...file,
      status: file.status === "closed" ? "closed" : "released",
      customsStatus: "Released",
      milestonesDone: Math.max(file.milestonesDone, Math.min(file.milestonesTotal, 5)),
      exception: file.exception === "None" ? file.exception : "Released to warehouse receiving.",
    };
    let next: WorkflowSnapshot = {
      ...state,
      freightFiles: mapById(state.freightFiles, id, updatedFile),
      asns: state.asns.map((asn) => asn.freightFileId === id ? syncAsnFromFreight(asn, updatedFile) : asn),
    };
    next = audit(next, "freight", id, "release_to_asn", `Freight file ${id} released and ASN receiving eligibility updated.`);
    orderToCashRepository.syncFreightRelease(id);
    publish(next);
    return { ok: true, message: "Freight released to ASN receiving." };
  },

  advanceFreightMilestone(id: string): WorkflowResult {
    const file = state.freightFiles.find((item) => item.id === id);
    if (!file) return { ok: false, message: "Freight file not found." };
    this.updateFreightFile(id, { milestonesDone: Math.min(file.milestonesTotal, file.milestonesDone + 1) });
    return { ok: true, message: "Freight milestone completed." };
  },

  startAsnReceiving(id: string): WorkflowResult {
    const asn = state.asns.find((item) => item.id === id);
    if (!asn) return { ok: false, message: "ASN not found." };
    if (!["released", "not_required"].includes(asn.customsReleaseStatus)) {
      return { ok: false, message: "Customs must be released before warehouse receiving can start." };
    }
    if (asn.status !== "scheduled") {
      return { ok: false, message: "Only scheduled ASNs can start receiving." };
    }
    publish(audit({
      ...state,
      asns: mapById(state.asns, id, {
        status: "receiving",
        inspectionStatus: "not_started",
        conditionStatus: "unchecked",
        inventoryStatus: "not_recorded",
        note: appendNote(asn.note, "Receiving started at warehouse dock."),
      }),
    }, "wms", id, "start_receiving", "Warehouse receiving started."));
    orderToCashRepository.syncAsnReceiving(id, {
      stage: "Receiving",
      status: "in_progress",
      title: "Warehouse receiving started",
      note: "Receiving started at warehouse dock.",
    });
    return { ok: true, message: "Receiving started." };
  },

  verifyAsnInspection(id: string, receivedUnits: number, conditionStatus: ConditionStatus, inspectionNote: string): WorkflowResult {
    const asn = state.asns.find((item) => item.id === id);
    if (!asn) return { ok: false, message: "ASN not found." };
    if (!["released", "not_required"].includes(asn.customsReleaseStatus)) {
      return { ok: false, message: "Customs must be released before inspection can be verified." };
    }
    if (asn.status !== "receiving") {
      return { ok: false, message: "Start receiving before verifying quantity and condition." };
    }
    if (conditionStatus === "unchecked") return { ok: false, message: "Select product condition first." };
    const cleanReceivedUnits = Math.max(0, Math.round(receivedUnits || 0));
    const varianceUnits = cleanReceivedUnits - asn.expectedUnits;
    const hasConditionIssue = conditionStatus === "damaged" || conditionStatus === "mixed";
    const hasVariance = varianceUnits !== 0;
    const status = hasVariance || hasConditionIssue ? "variance" : "putaway_ready";
    const discrepancyReportId = hasVariance || hasConditionIssue ? asn.discrepancyReportId ?? `DR-${asn.id.replace("ASN-", "")}` : undefined;
    publish(audit({
      ...state,
      asns: mapById(state.asns, id, {
        receivedUnits: cleanReceivedUnits,
        varianceUnits,
        conditionStatus,
        inspectionStatus: hasConditionIssue ? "damaged" : hasVariance ? "variance" : "passed",
        status,
        discrepancyReportId,
        note: appendNote(asn.note, inspectionNote || `Inspection verified: ${cleanReceivedUnits}/${asn.expectedUnits}, condition ${conditionStatus}.`),
      }),
    }, "wms", id, "verify_inspection", hasVariance || hasConditionIssue ? "Inspection created a variance exception." : "Inspection passed and ASN is ready for put-away."));
    orderToCashRepository.syncAsnReceiving(id, {
      stage: "Inspection",
      status: hasVariance || hasConditionIssue ? "exception" : "in_progress",
      title: hasVariance || hasConditionIssue ? "Inspection variance found" : "Inspection passed",
      note: inspectionNote || `Inspection verified: ${cleanReceivedUnits}/${asn.expectedUnits}, condition ${conditionStatus}.`,
      receivedQuantity: cleanReceivedUnits,
      varianceQuantity: varianceUnits,
      condition: conditionStatus,
    });
    return { ok: true, message: hasVariance || hasConditionIssue ? "Variance found and exception created." : "Inspection passed, ready for put-away." };
  },

  resolveAsnVariance(id: string): WorkflowResult {
    const asn = state.asns.find((item) => item.id === id);
    if (!asn) return { ok: false, message: "ASN not found." };
    if (asn.status !== "variance") return { ok: false, message: "Only variance ASNs can be resolved." };
    publish(audit({
      ...state,
      asns: mapById(state.asns, id, {
        status: "putaway_ready",
        inspectionStatus: "passed",
        note: appendNote(asn.note, "Variance reviewed and approved for put-away."),
      }),
    }, "wms", id, "resolve_variance", "Variance approved for put-away."));
    orderToCashRepository.syncAsnReceiving(id, {
      stage: "Variance Review",
      status: "in_progress",
      title: "Variance resolved",
      note: "Variance reviewed and approved for put-away.",
      varianceResolved: true,
    });
    return { ok: true, message: "Variance resolved. ASN is ready for put-away." };
  },

  recordAsnInventory(id: string, putawayLocation: string): WorkflowResult {
    const asn = state.asns.find((item) => item.id === id);
    if (!asn) return { ok: false, message: "ASN not found." };
    if (asn.status !== "putaway_ready" || asn.inspectionStatus !== "passed") {
      return { ok: false, message: "Inspection must pass before inventory can be recorded." };
    }
    if (!putawayLocation.trim()) return { ok: false, message: "Enter a WMS location." };
    const cleanLocation = putawayLocation.trim();
    const serviceEventId = `SE-${asn.id.replace("ASN-", "RCV-")}`;
    const subtotalCad = money(asn.receivedUnits * 0.2);
    let next: WorkflowSnapshot = {
      ...state,
      asns: mapById(state.asns, id, {
        status: "closed",
        inventoryStatus: "recorded",
        putawayLocation: cleanLocation,
        recordedAt: nowStamp(),
        note: appendNote(asn.note, `Inventory recorded in WMS at ${cleanLocation}.`),
      }),
    };
    next = upsertServiceEvent(next, {
      id: serviceEventId,
      source: asn.id,
      customer: asn.customer,
      service: "Receiving / put-away",
      quantity: asn.receivedUnits,
      rateCad: 0.2,
      status: "approved",
    });
    next = upsertBillingQueue(next, {
      id: `BQ-${serviceEventId.replace("SE-", "")}`,
      customer: asn.customer,
      sourceType: "handling",
      sourceId: serviceEventId,
      subtotalCad,
      taxCad: money(subtotalCad * 0.13),
      status: "needs_approval",
      approvalOwner: "Finance",
      note: `Generated from WMS receiving ${asn.id} at ${cleanLocation}.`,
    });
    next = audit(next, "wms", id, "record_inventory", `Inventory recorded at ${cleanLocation}; receiving service event sent to Finance queue.`);
    publish(next);
    orderToCashRepository.syncAsnReceiving(id, {
      stage: "Inventory Recording",
      status: "completed",
      title: "Inventory recorded in WMS",
      note: `Inventory recorded in WMS at ${cleanLocation}.`,
      storageLocation: cleanLocation,
      inventoryRecorded: true,
    });
    return { ok: true, message: "Inventory recorded and Finance billing queue updated." };
  },

  updateAsn(id: string, patch: Partial<AsnReceivingRecord> | ((item: AsnReceivingRecord) => AsnReceivingRecord)) {
    publish(audit({ ...state, asns: mapById(state.asns, id, patch) }, "wms", id, "update_asn", "ASN updated."));
  },

  updateReturn(id: string, patch: Partial<ReturnAuthorizationRecord> | ((item: ReturnAuthorizationRecord) => ReturnAuthorizationRecord)) {
    publish(audit({ ...state, returns: mapById(state.returns, id, patch) }, "wms", id, "update_return", "Return authorization updated."));
  },

  updateServiceEvent(id: string, patch: Partial<ServiceEventRecord>) {
    publish(audit({ ...state, serviceEvents: mapById(state.serviceEvents, id, patch) }, "wms", id, "update_service_event", "Service event updated."));
  },

  approveServiceEventForBilling(id: string): WorkflowResult {
    const event = state.serviceEvents.find((item) => item.id === id);
    if (!event) return { ok: false, message: "Service event not found." };
    const subtotalCad = money(event.quantity * event.rateCad);
    let next: WorkflowSnapshot = {
      ...state,
      serviceEvents: mapById(state.serviceEvents, id, { status: "approved" }),
    };
    next = upsertBillingQueue(next, {
      id: `BQ-${id.replace("SE-", "")}`,
      customer: event.customer,
      sourceType: "handling",
      sourceId: event.id,
      subtotalCad,
      taxCad: money(subtotalCad * 0.13),
      status: "needs_approval",
      approvalOwner: "Finance",
      note: `Generated from WMS service event ${event.id}.`,
    });
    next = audit(next, "wms", id, "approve_service_for_billing", "Service event approved and finance billing queue updated.");
    publish(next);
    return { ok: true, message: "Service event sent to Finance Billing Queue." };
  },

  markServiceEventBilled(id: string): WorkflowResult {
    const event = state.serviceEvents.find((item) => item.id === id);
    if (!event) return { ok: false, message: "Service event not found." };
    publish(audit({
      ...state,
      serviceEvents: mapById(state.serviceEvents, id, { status: "billed" }),
      billingQueue: state.billingQueue.map((item) => item.sourceId === id ? { ...item, status: "invoiced" } : item),
    }, "finance", id, "mark_service_billed", "Service event marked billed and linked billing item invoiced."));
    return { ok: true, message: "Service event marked billed." };
  },

  updateDispatch(id: string, patch: Partial<DispatchRecord>) {
    publish(audit({ ...state, dispatches: mapById(state.dispatches, id, patch) }, "tms", id, "update_dispatch", "Dispatch record updated."));
  },

  requestInventoryDispatch(input: InventoryDispatchRequestInput): WorkflowResult {
    const id = dispatchIdForInventory(input.sourceId);
    const cleanPallets = Math.max(1, Math.round(input.pallets || Math.ceil(input.units / 40) || 1));
    const estimatedRevenueCad = money(Math.max(350, cleanPallets * 85));
    const existing = state.dispatches.find((dispatch) => dispatch.id === id);
    const dispatch: DispatchRecord = {
      id,
      customer: input.customer,
      origin: input.warehouse,
      destination: input.destination || "Customer destination TBD",
      pallets: cleanPallets,
      driver: existing?.driver ?? "TBD",
      carrier: existing?.carrier ?? "Rate compare needed",
      quotedCostCad: existing?.quotedCostCad ?? 0,
      estimatedRevenueCad,
      status: existing && existing.status !== "exception" ? existing.status : "requested",
      podRequired: true,
      exceptionNote: input.note,
    };
    const next = audit({
      ...state,
      dispatches: existing
        ? state.dispatches.map((item) => item.id === id ? { ...item, ...dispatch, status: item.status } : item)
        : [dispatch, ...state.dispatches],
    }, "tms", id, existing ? "refresh_inventory_dispatch" : "request_inventory_dispatch", `Inventory dispatch requested for ${input.container}.`);
    publish(next);
    return { ok: true, message: existing ? "Existing TMS dispatch refreshed from inventory." : "TMS dispatch requested from inventory." };
  },

  assignDispatchCarrier(id: string): WorkflowResult {
    const item = state.dispatches.find((dispatch) => dispatch.id === id);
    if (!item) return { ok: false, message: "Dispatch not found." };
    publish(audit({
      ...state,
      dispatches: mapById(state.dispatches, id, {
        carrier: item.carrier === "Unassigned" || item.carrier === "Rate compare needed" ? "LH Driver" : item.carrier,
        driver: item.driver === "TBD" ? "LH" : item.driver,
        quotedCostCad: item.quotedCostCad || 380,
        status: "assigned",
        exceptionNote: "Carrier assigned from rate comparison.",
      }),
    }, "tms", id, "assign_carrier", "Carrier assigned."));
    orderToCashRepository.syncDispatchStatus(id, "in_progress", "Carrier assigned from rate comparison.");
    return { ok: true, message: "Carrier assigned." };
  },

  moveDispatchToTransit(id: string): WorkflowResult {
    const item = state.dispatches.find((dispatch) => dispatch.id === id);
    if (!item) return { ok: false, message: "Dispatch not found." };
    if (item.status !== "assigned") return { ok: false, message: "Carrier must be assigned before transit starts." };
    publish(audit({
      ...state,
      dispatches: mapById(state.dispatches, id, { status: "in_transit", exceptionNote: "Driver departed; live tracking active." }),
    }, "tms", id, "start_transit", "Dispatch moved to in-transit."));
    orderToCashRepository.syncDispatchStatus(id, "in_progress", "Driver departed; live tracking active.");
    return { ok: true, message: "Dispatch moved to in-transit." };
  },

  moveDispatchToPod(id: string): WorkflowResult {
    const item = state.dispatches.find((dispatch) => dispatch.id === id);
    if (!item) return { ok: false, message: "Dispatch not found." };
    if (!["assigned", "in_transit"].includes(item.status)) return { ok: false, message: "Dispatch must be assigned or in transit before POD." };
    let next: WorkflowSnapshot = {
      ...state,
      dispatches: mapById(state.dispatches, id, { status: "pod_pending", exceptionNote: "Delivery completed; POD required before invoice." }),
    };
    next = upsertBillingQueue(next, {
      id: `BQ-${id.replace("DSP-", "")}`,
      customer: item.customer,
      sourceType: "transport",
      sourceId: item.id,
      subtotalCad: money(item.estimatedRevenueCad),
      taxCad: money(item.estimatedRevenueCad * 0.13),
      status: "blocked",
      approvalOwner: "Ops Team",
      note: "POD pending before final invoice issue.",
    });
    publish(audit(next, "tms", id, "move_to_pod", "Dispatch moved to POD pending and billing is blocked."));
    orderToCashRepository.syncDispatchStatus(id, "waiting_carrier", "Delivery completed; POD required before invoice.");
    return { ok: true, message: "Dispatch moved to POD pending." };
  },

  closeDispatchWithPod(id: string): WorkflowResult {
    const item = state.dispatches.find((dispatch) => dispatch.id === id);
    if (!item) return { ok: false, message: "Dispatch not found." };
    let next: WorkflowSnapshot = {
      ...state,
      dispatches: mapById(state.dispatches, id, { status: "closed", exceptionNote: "POD received and dispatch closed." }),
    };
    next = upsertBillingQueue(next, {
      id: `BQ-${id.replace("DSP-", "")}`,
      customer: item.customer,
      sourceType: "transport",
      sourceId: item.id,
      subtotalCad: money(item.estimatedRevenueCad),
      taxCad: money(item.estimatedRevenueCad * 0.13),
      status: "ready",
      approvalOwner: "Ops Team",
      note: "POD received. Ready for invoice approval.",
    });
    next = audit(next, "tms", id, "close_with_pod", "POD received; dispatch closed and billing queue released.");
    orderToCashRepository.syncDispatchStatus(id, "completed", "POD received; dispatch closed and billing queue released.");
    publish(next);
    return { ok: true, message: "POD received. Billing queue is ready." };
  },

  markDispatchException(id: string): WorkflowResult {
    const item = state.dispatches.find((dispatch) => dispatch.id === id);
    if (!item) return { ok: false, message: "Dispatch not found." };
    publish(audit({
      ...state,
      dispatches: mapById(state.dispatches, id, { status: "exception", exceptionNote: "Exception flagged for operations review." }),
    }, "tms", id, "mark_exception", "Dispatch exception flagged."));
    orderToCashRepository.syncDispatchStatus(id, "exception", "Dispatch exception flagged for operations review.");
    return { ok: true, message: "Dispatch exception flagged." };
  },

  updateBillingQueue(id: string, patch: Partial<BillingQueueRecord>) {
    publish(audit({ ...state, billingQueue: mapById(state.billingQueue, id, patch) }, "finance", id, "update_billing_queue", "Billing queue updated."));
  },

  approveBillingQueue(id: string): WorkflowResult {
    const item = state.billingQueue.find((queueItem) => queueItem.id === id);
    if (!item) return { ok: false, message: "Billing item not found." };
    if (item.status === "blocked") return { ok: false, message: "Resolve the blocker before approving this billing item." };
    publish(audit({
      ...state,
      billingQueue: mapById(state.billingQueue, id, { status: "approved" }),
    }, "finance", id, "approve_billing", "Billing item approved."));
    orderToCashRepository.syncBillingStatus(id, "pending_review", "Billing item approved and ready for invoice issue.");
    return { ok: true, message: "Billing item approved." };
  },

  markBillingBlocked(id: string): WorkflowResult {
    const item = state.billingQueue.find((queueItem) => queueItem.id === id);
    if (!item) return { ok: false, message: "Billing item not found." };
    publish(audit({
      ...state,
      billingQueue: mapById(state.billingQueue, id, { status: "blocked", note: appendNote(item.note, "Blocked for review.") }),
    }, "finance", id, "block_billing", "Billing item blocked for review."));
    orderToCashRepository.syncBillingStatus(id, "exception", "Billing item blocked for review.");
    return { ok: true, message: "Billing item blocked." };
  },

  issueInvoiceFromBilling(id: string): WorkflowResult {
    const item = state.billingQueue.find((queueItem) => queueItem.id === id);
    if (!item) return { ok: false, message: "Billing item not found." };
    if (item.status !== "approved" && item.status !== "ready") return { ok: false, message: "Billing item must be ready or approved before invoice issue." };
    const total = money(item.subtotalCad + item.taxCad);
    const invoiceId = `INV-${item.id.replace("BQ-", "")}`;
    let next: WorkflowSnapshot = {
      ...state,
      billingQueue: mapById(state.billingQueue, id, { status: "invoiced", note: appendNote(item.note, `Invoice ${invoiceId} issued.`) }),
    };
    next = upsertAccountingSync(next, {
      id: `SYNC-${invoiceId}`,
      system: "QuickBooks",
      objectType: "invoice",
      objectId: invoiceId,
      amountCad: total,
      status: "ready_to_sync",
      lastAttempt: "Not run",
    });
    next = audit(next, "finance", id, "issue_invoice", `Invoice ${invoiceId} staged for QuickBooks sync.`);
    orderToCashRepository.syncBillingStatus(id, "submitted", `Invoice ${invoiceId} issued and staged for QuickBooks sync.`);
    publish(next);
    return { ok: true, message: "Invoice issued and staged for QuickBooks sync." };
  },

  approveBillingQueueItems() {
    publish(audit({
      ...state,
      billingQueue: state.billingQueue.map((item) => item.status === "needs_approval" ? { ...item, status: "approved" } : item),
    }, "finance", "billingQueue", "batch_approve", "All approval-needed billing items approved."));
  },

  updateAccountingSync(id: string, patch: Partial<AccountingSyncRecord>) {
    publish(audit({ ...state, accountingSync: mapById(state.accountingSync, id, patch) }, "finance", id, "update_accounting_sync", "Accounting sync row updated."));
  },

  updateAccountingSyncStatus(id: string, status: AccountingSyncStatus): WorkflowResult {
    const item = state.accountingSync.find((sync) => sync.id === id);
    if (!item) return { ok: false, message: "Sync row not found." };
    publish(audit({
      ...state,
      accountingSync: mapById(state.accountingSync, id, { status, lastAttempt: status === "synced" ? nowStamp() : item.lastAttempt }),
    }, "finance", id, "update_sync_status", `Accounting sync status changed to ${status}.`));
    orderToCashRepository.syncAccountingSyncStatus(id, status === "ready_to_sync" ? "queued" : status, `Accounting sync status changed to ${status}.`);
    return { ok: true, message: status === "synced" ? "Accounting sync marked complete." : "Accounting sync status updated." };
  },
};

export function useWorkflowSnapshot() {
  return useSyncExternalStore(
    workflowRepository.subscribe,
    workflowRepository.getSnapshot,
    workflowRepository.getSnapshot,
  );
}
