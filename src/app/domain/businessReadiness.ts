export type CustomerStage = "lead" | "qualified" | "quoted" | "onboarding" | "active";
export type CustomerCaseStatus = "open" | "waiting_customer" | "resolved";
export type FreightFileStatus = "documents_needed" | "customs_review" | "released" | "devanning" | "closed" | "hold";

export interface CustomerProfileRecord {
  id: string;
  name: string;
  stage: CustomerStage;
  owner: string;
  services: string[];
  rateCard: string;
  onboardingDone: number;
  onboardingTotal: number;
  openCases: number;
  instructions: string;
  creditLimitCad: number;
}

export interface CustomerCaseRecord {
  id: string;
  customerId: string;
  subject: string;
  status: CustomerCaseStatus;
  priority: "Low" | "Medium" | "High";
  nextStep: string;
}

export interface FreightFileRecord {
  id: string;
  customer: string;
  container: string;
  vessel: string;
  terminal: string;
  eta: string;
  lastFreeDay: string;
  status: FreightFileStatus;
  broker: string;
  customsStatus: "Docs Missing" | "Submitted" | "Released" | "Hold";
  destination: string;
  milestonesDone: number;
  milestonesTotal: number;
  estimatedCostsCad: number;
  exception: string;
}

export const customerProfiles: CustomerProfileRecord[] = [
  {
    id: "cust-fba-seller",
    name: "FBA Seller",
    stage: "active",
    owner: "Ops Team",
    services: ["FBA delivery", "Container devanning", "Pallet storage", "Relabel"],
    rateCard: "FBA Delivery 2026",
    onboardingDone: 7,
    onboardingTotal: 7,
    openCases: 1,
    instructions: "Prioritize YYZ9/YHM1 appointments and flag HOLD cargo before billing.",
    creditLimitCad: 75000,
  },
  {
    id: "cust-ap-lt",
    name: "AP-LT",
    stage: "active",
    owner: "Finance",
    services: ["Linehaul", "POD management", "Driver settlement"],
    rateCard: "Long-haul Ontario/Quebec",
    onboardingDone: 6,
    onboardingTotal: 7,
    openCases: 0,
    instructions: "Require signed POD before invoice issue.",
    creditLimitCad: 45000,
  },
  {
    id: "cust-cbws",
    name: "AP-CBWS",
    stage: "onboarding",
    owner: "Customer Success",
    services: ["FBA delivery", "Exception handling"],
    rateCard: "Draft - CBWS FBA",
    onboardingDone: 4,
    onboardingTotal: 7,
    openCases: 2,
    instructions: "Rejected delivery requires same-day finance note and driver cost review.",
    creditLimitCad: 15000,
  },
  {
    id: "lead-zenith",
    name: "Zenith Marketplace",
    stage: "quoted",
    owner: "Sales",
    services: ["Customs clearance", "Container tracking", "Warehouse receiving"],
    rateCard: "Quote Q-2026-044",
    onboardingDone: 2,
    onboardingTotal: 7,
    openCases: 0,
    instructions: "Needs customs broker confirmation before go-live.",
    creditLimitCad: 25000,
  },
];

export const customerCases: CustomerCaseRecord[] = [
  {
    id: "CASE-1024",
    customerId: "cust-fba-seller",
    subject: "DRYU9624130 hold billing review",
    status: "open",
    priority: "High",
    nextStep: "Confirm relabel quantity and release invoice line.",
  },
  {
    id: "CASE-1025",
    customerId: "cust-cbws",
    subject: "Rejected delivery without matching invoice",
    status: "waiting_customer",
    priority: "High",
    nextStep: "Ask customer to approve write-off or re-delivery.",
  },
  {
    id: "CASE-1026",
    customerId: "cust-cbws",
    subject: "Portal user setup",
    status: "open",
    priority: "Medium",
    nextStep: "Collect operations and finance approvers.",
  },
];

export const freightFiles: FreightFileRecord[] = [
  {
    id: "FF-2026-0418",
    customer: "FBA Seller",
    container: "DRYU9624130",
    vessel: "Maersk Tacoma",
    terminal: "CN Brampton Ramp",
    eta: "2026-03-25",
    lastFreeDay: "2026-03-29",
    status: "hold",
    broker: "GTA Customs Broker",
    customsStatus: "Hold",
    destination: "YYZ4 / YYZ7 HOLD",
    milestonesDone: 5,
    milestonesTotal: 9,
    estimatedCostsCad: 1625,
    exception: "Relabel required before outbound dispatch.",
  },
  {
    id: "FF-2026-0422",
    customer: "FBA Seller",
    container: "BEAU6280647",
    vessel: "COSCO Pride",
    terminal: "CP Vaughan",
    eta: "2026-04-22",
    lastFreeDay: "2026-04-26",
    status: "closed",
    broker: "GTA Customs Broker",
    customsStatus: "Released",
    destination: "YHM1 Hamilton",
    milestonesDone: 9,
    milestonesTotal: 9,
    estimatedCostsCad: 2066,
    exception: "None",
  },
  {
    id: "FF-2026-0427",
    customer: "FBA Seller",
    container: "HMMU7089094",
    vessel: "Ever Summit",
    terminal: "CN Brampton Ramp",
    eta: "2026-04-27",
    lastFreeDay: "2026-05-01",
    status: "devanning",
    broker: "GTA Customs Broker",
    customsStatus: "Released",
    destination: "YYZ9 Amazon",
    milestonesDone: 7,
    milestonesTotal: 9,
    estimatedCostsCad: 2385,
    exception: "Pending POD and final storage charges.",
  },
  {
    id: "FF-2026-0503",
    customer: "Zenith Marketplace",
    container: "TLLU4409123",
    vessel: "OOCL Canada",
    terminal: "Toronto Rail",
    eta: "2026-05-03",
    lastFreeDay: "2026-05-07",
    status: "documents_needed",
    broker: "Unassigned",
    customsStatus: "Docs Missing",
    destination: "Whybank #25",
    milestonesDone: 2,
    milestonesTotal: 9,
    estimatedCostsCad: 980,
    exception: "Commercial invoice and packing list missing.",
  },
];
