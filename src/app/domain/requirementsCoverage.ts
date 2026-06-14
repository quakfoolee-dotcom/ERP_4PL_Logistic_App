export type RequirementModule =
  | "ERP"
  | "CRM"
  | "Freight/Customs"
  | "WMS"
  | "TMS"
  | "Accounting"
  | "Integration"
  | "Reporting";

export type RequirementPriority = "Must" | "Should" | "Could";
export type RequirementPhase = "Phase 1" | "Phase 2" | "Phase 3";
export type CoverageStatus = "implemented" | "in_progress" | "scaffolded" | "external_dependency";

export interface RequirementCoverageItem {
  id: string;
  module: RequirementModule;
  priority: RequirementPriority;
  phase: RequirementPhase;
  title: string;
  appArea: string;
  status: CoverageStatus;
  nextAction: string;
}

export const requirementCoverage: RequirementCoverageItem[] = [
  {
    id: "ERP-001",
    module: "ERP",
    priority: "Must",
    phase: "Phase 1",
    title: "Customer master shared across CRM, WMS, TMS, freight, and finance",
    appArea: "Customer Master",
    status: "in_progress",
    nextAction: "Connect customer profile changes to audit log and rate card approval.",
  },
  {
    id: "ERP-002",
    module: "ERP",
    priority: "Must",
    phase: "Phase 1",
    title: "Create order once and reuse through shipment, warehouse, transport, POD, billing, and settlement",
    appArea: "Repository / Transport Orders",
    status: "implemented",
    nextAction: "Persist repository state through backend API when database is available.",
  },
  {
    id: "ERP-003",
    module: "ERP",
    priority: "Must",
    phase: "Phase 1",
    title: "Freight forwarding shipment file with documents, milestones, and exception log",
    appArea: "Freight & Customs",
    status: "in_progress",
    nextAction: "Attach uploaded document records to each freight file.",
  },
  {
    id: "ERP-004",
    module: "WMS",
    priority: "Must",
    phase: "Phase 1",
    title: "ASN receiving, put-away, SKU/location, photo capture, and service charges",
    appArea: "WMS Workflows",
    status: "implemented",
    nextAction: "Connect ASN receiving updates to barcode scanner and photo storage APIs.",
  },
  {
    id: "ERP-005",
    module: "TMS",
    priority: "Must",
    phase: "Phase 1",
    title: "Pick, pack, dispatch, labels, tracking, and POD confirmation",
    appArea: "TMS Dispatch",
    status: "in_progress",
    nextAction: "Connect dispatch records to carrier label and live tracking APIs.",
  },
  {
    id: "ERP-006",
    module: "Accounting",
    priority: "Must",
    phase: "Phase 1",
    title: "Billing from operational events and rate cards with AR/AP/cost settlement",
    appArea: "Finance Hub",
    status: "implemented",
    nextAction: "Add approval workflow persistence and accounting sync queue.",
  },
  {
    id: "ERP-008",
    module: "WMS",
    priority: "Must",
    phase: "Phase 1",
    title: "Returns workflow with authorization, inspection, photos, disposition, inventory, and charges",
    appArea: "WMS Workflows",
    status: "implemented",
    nextAction: "Persist return disposition and inventory adjustment in backend.",
  },
  {
    id: "ERP-009",
    module: "Integration",
    priority: "Must",
    phase: "Phase 1",
    title: "Integration/API hub and authoritative single source of truth",
    appArea: "Repository",
    status: "in_progress",
    nextAction: "Replace mock repository methods with backend endpoints.",
  },
  {
    id: "ERP-011",
    module: "Accounting",
    priority: "Must",
    phase: "Phase 1",
    title: "Centralized agreements and rate cards for all services",
    appArea: "Partner Rate Cards",
    status: "implemented",
    nextAction: "Add approval audit for rate changes and customer-specific overrides.",
  },
  {
    id: "ERP-013",
    module: "ERP",
    priority: "Must",
    phase: "Phase 1",
    title: "Role-based access control",
    appArea: "Settings / Compliance",
    status: "scaffolded",
    nextAction: "Introduce user roles and route-level permission checks.",
  },
  {
    id: "ERP-016",
    module: "ERP",
    priority: "Must",
    phase: "Phase 1",
    title: "Audit trail for material changes",
    appArea: "Compliance",
    status: "scaffolded",
    nextAction: "Capture before/after values when key records are updated.",
  },
  {
    id: "ERP-017",
    module: "WMS",
    priority: "Must",
    phase: "Phase 1",
    title: "Four warehouses, inventory by warehouse/location/bin, transfers, and cross-warehouse fulfillment",
    appArea: "Inventory / WMS Workflows",
    status: "in_progress",
    nextAction: "Add bin-level inventory movements and transfer order records.",
  },
  {
    id: "ERP-019",
    module: "CRM",
    priority: "Must",
    phase: "Phase 1",
    title: "CRM lead capture, pipeline, quote, onboarding, communications, and cases",
    appArea: "Customer Master",
    status: "in_progress",
    nextAction: "Connect lead-to-customer conversion to customer master creation.",
  },
  {
    id: "ERP-020",
    module: "CRM",
    priority: "Must",
    phase: "Phase 1",
    title: "Approved quote or contract creates customer master, rate card, service rules, portal, and billing profile",
    appArea: "Customer Master / Rate Cards",
    status: "scaffolded",
    nextAction: "Add quote approval action that creates linked customer setup tasks.",
  },
  {
    id: "ERP-026",
    module: "Freight/Customs",
    priority: "Must",
    phase: "Phase 1",
    title: "Import freight file management",
    appArea: "Freight & Customs",
    status: "in_progress",
    nextAction: "Add file-level document checklist validation.",
  },
  {
    id: "ERP-027",
    module: "Freight/Customs",
    priority: "Must",
    phase: "Phase 1",
    title: "Customs broker, documentation, clearance, hold, duty, and broker invoice",
    appArea: "Freight & Customs",
    status: "in_progress",
    nextAction: "Add broker invoice and duty disbursement cost records.",
  },
  {
    id: "ERP-028",
    module: "Freight/Customs",
    priority: "Must",
    phase: "Phase 1",
    title: "Container/vessel/terminal milestones, ETA, LFD, demurrage, pickup, devanning, and empty return",
    appArea: "Freight & Customs",
    status: "in_progress",
    nextAction: "Add automated demurrage risk calculation from LFD and pickup status.",
  },
  {
    id: "TMS-006",
    module: "TMS",
    priority: "Must",
    phase: "Phase 1",
    title: "POD, BOL, delivery photos, signature, exception notes, and completion timestamp",
    appArea: "POD Management",
    status: "implemented",
    nextAction: "Replace placeholder uploads with document storage API.",
  },
  {
    id: "ACC-004",
    module: "Accounting",
    priority: "Must",
    phase: "Phase 1",
    title: "QuickBooks or accounting sync",
    appArea: "Finance Hub Workflows",
    status: "external_dependency",
    nextAction: "Sync staging exists; activate real QuickBooks connector after credentials and field mapping are confirmed.",
  },
  {
    id: "INT-003",
    module: "Integration",
    priority: "Must",
    phase: "Phase 1",
    title: "WMS to TMS/carrier API for labels, bookings, and tracking",
    appArea: "Integration Hub",
    status: "external_dependency",
    nextAction: "Create carrier adapter once API provider is selected.",
  },
  {
    id: "KPI-001",
    module: "Reporting",
    priority: "Must",
    phase: "Phase 1",
    title: "Executive revenue, margin, cost, exception, and service dashboard",
    appArea: "Dashboard / Analytics",
    status: "implemented",
    nextAction: "Move KPI calculations to backend once production data lands.",
  },
];

export function summarizeRequirementCoverage(items = requirementCoverage) {
  const total = items.length;
  const implemented = items.filter((item) => item.status === "implemented").length;
  const inProgress = items.filter((item) => item.status === "in_progress").length;
  const scaffolded = items.filter((item) => item.status === "scaffolded").length;
  const external = items.filter((item) => item.status === "external_dependency").length;

  return {
    total,
    implemented,
    inProgress,
    scaffolded,
    external,
    covered: implemented + inProgress + scaffolded,
    coveragePct: total ? Math.round(((implemented + inProgress + scaffolded) / total) * 100) : 0,
  };
}
