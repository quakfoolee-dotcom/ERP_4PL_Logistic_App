import { money } from "../domain/money";
import type { ErpSeedData, TransportMode, TransportOrderStatus, PodStatus } from "../domain/models";

const customerIds = {
  fbaSeller: "org-fba-seller",
  apLt: "org-ap-lt",
  tdJeff: "org-td-jeff",
  apPdn: "org-ap-pdn",
  apPanex: "org-ap-panex",
  apQx: "org-ap-qx",
  tdJw: "org-td-jw",
  apDb: "org-ap-db",
  apGvt: "org-ap-gvt",
  apLll: "org-ap-lll",
  apHammert: "org-ap-hammert",
  apJd: "org-ap-jd",
};

const locationIds = {
  whybank25: "loc-whybank-25",
  whybank10: "loc-whybank-10",
  yyZ9: "loc-amz-yyz9",
  yhm1: "loc-amz-yhm1",
  yow1: "loc-amz-yow1",
  yoo1: "loc-amz-yoo1",
  yyz4: "loc-amz-yyz4",
  yyz7: "loc-amz-yyz7",
  mississaugaWalmart: "loc-walmart-6175",
  saintLaurent: "loc-saint-laurent-qc",
  concord: "loc-concord",
  guelph: "loc-guelph",
  belleville: "loc-belleville",
};

function order(input: {
  id: string;
  customerId: string;
  shipmentId: string;
  originLocationId: string;
  destinationLocationId: string;
  driverIds: string[];
  mode?: TransportMode;
  pallets: number;
  status: TransportOrderStatus;
  podStatus: PodStatus;
  revenue: number;
  cost: number;
  etaDate: string;
  createdDate: string;
}) {
  return {
    id: input.id,
    customerId: input.customerId,
    shipmentId: input.shipmentId,
    originLocationId: input.originLocationId,
    destinationLocationId: input.destinationLocationId,
    assignedDriverIds: input.driverIds,
    vehicleId: input.mode === "LTL" ? "veh-small-ltl" : "veh-ftl",
    mode: input.mode ?? "FTL",
    palletCount: input.pallets,
    status: input.status,
    podStatus: input.podStatus,
    revenue: money(input.revenue * 100),
    cost: money(input.cost * 100),
    etaDate: input.etaDate,
    createdDate: input.createdDate,
  };
}

export const demoErpSeed: ErpSeedData = {
  organizations: [
    { id: customerIds.fbaSeller, name: "FBA Seller", type: "customer", externalCode: "FBA" },
    { id: customerIds.apLt, name: "AP-LT", type: "customer" },
    { id: customerIds.tdJeff, name: "TD-JEFF", type: "customer" },
    { id: customerIds.apPdn, name: "AP-PDN", type: "customer" },
    { id: customerIds.apPanex, name: "AP-PANEX", type: "customer" },
    { id: customerIds.apQx, name: "AP-QX", type: "customer" },
    { id: customerIds.tdJw, name: "TD-JW", type: "customer" },
    { id: customerIds.apDb, name: "AP-DB", type: "customer" },
    { id: customerIds.apGvt, name: "AP-GVT", type: "customer" },
    { id: customerIds.apLll, name: "AP-LLL", type: "customer" },
    { id: customerIds.apHammert, name: "AP-Hammert", type: "customer" },
    { id: customerIds.apJd, name: "AP-JD", type: "customer" },
    { id: "org-lh-driver", name: "LH Driver", type: "partner" },
    { id: "org-af-driver", name: "AF Driver", type: "partner" },
    { id: "org-lf-driver", name: "LF Driver", type: "partner" },
    { id: "org-ad-straightship", name: "AD Straightship", type: "carrier" },
    { id: "org-broker-gta", name: "GTA Customs Broker", type: "broker" },
  ],
  locations: [
    { id: locationIds.whybank25, name: "Whybank #25", code: "WB25", type: "warehouse", city: "Brampton", province: "ON", country: "CA" },
    { id: locationIds.whybank10, name: "Whybank #10", code: "WB10", type: "warehouse", city: "Brampton", province: "ON", country: "CA" },
    { id: locationIds.yyZ9, name: "YYZ9 Amazon FC", code: "YYZ9", type: "fulfillment_center", city: "Brampton", province: "ON", country: "CA" },
    { id: locationIds.yhm1, name: "YHM1 Hamilton Amazon", code: "YHM1", type: "fulfillment_center", city: "Hamilton", province: "ON", country: "CA" },
    { id: locationIds.yow1, name: "YOW1 Ottawa Amazon", code: "YOW1", type: "fulfillment_center", city: "Ottawa", province: "ON", country: "CA" },
    { id: locationIds.yoo1, name: "YOO1 Oakville Amazon", code: "YOO1", type: "fulfillment_center", city: "Oakville", province: "ON", country: "CA" },
    { id: locationIds.yyz4, name: "YYZ4 Amazon FC", code: "YYZ4", type: "fulfillment_center", city: "Vaughan", province: "ON", country: "CA" },
    { id: locationIds.yyz7, name: "YYZ7 Amazon FC", code: "YYZ7", type: "fulfillment_center", city: "Concord", province: "ON", country: "CA" },
    { id: locationIds.mississaugaWalmart, name: "Mississauga Walmart 6175", code: "WM6175", type: "customer_site", city: "Mississauga", province: "ON", country: "CA" },
    { id: locationIds.saintLaurent, name: "Saint-Laurent, QC", type: "customer_site", city: "Saint-Laurent", province: "QC", country: "CA" },
    { id: locationIds.concord, name: "Concord", type: "customer_site", city: "Concord", province: "ON", country: "CA" },
    { id: locationIds.guelph, name: "Guelph", type: "customer_site", city: "Guelph", province: "ON", country: "CA" },
    { id: locationIds.belleville, name: "Belleville", type: "customer_site", city: "Belleville", province: "ON", country: "CA" },
  ],
  drivers: [
    { id: "driver-lh", name: "LH", partnerId: "org-lh-driver", active: true },
    { id: "driver-af", name: "AF", partnerId: "org-af-driver", active: true },
    { id: "driver-lf", name: "LF", partnerId: "org-lf-driver", active: true },
    { id: "driver-jh", name: "JH", active: true },
  ],
  vehicles: [
    { id: "veh-ftl", label: "FTL Truck", type: "tractor_trailer" },
    { id: "veh-small-ltl", label: "LTL Truck", type: "straight_truck" },
  ],
  shipments: [
    { id: "shp-zcsu6522960", customerId: customerIds.fbaSeller, fbaShipmentId: "FBA196F8XLQJ", containerIds: ["ZCSU6522960"], status: "delivered", createdDate: "2026-03-31" },
    { id: "shp-csgu6675337", customerId: customerIds.fbaSeller, fbaShipmentId: "FBA196JLPMF8", containerIds: ["CSGU6675337"], status: "in_transit", createdDate: "2026-04-07" },
    { id: "shp-beau6280647", customerId: customerIds.fbaSeller, fbaShipmentId: "FBA197N70G67", containerIds: ["BEAU6280647"], status: "delivered", createdDate: "2026-04-22" },
    { id: "shp-hmmu7089094", customerId: customerIds.fbaSeller, fbaShipmentId: "FBA198RW2CY1", containerIds: ["HMMU7089094"], status: "in_transit", createdDate: "2026-04-27" },
    { id: "shp-hmmu4464340", customerId: customerIds.fbaSeller, fbaShipmentId: "FBA198RTQ79W", containerIds: ["HMMU4464340"], status: "warehouse_processing", createdDate: "2026-04-28" },
    { id: "shp-dryu9624130", customerId: customerIds.fbaSeller, fbaShipmentId: "FBA19CD7DG1G", containerIds: ["DRYU9624130"], status: "hold", createdDate: "2026-03-25" },
  ],
  containers: [
    { id: "ZCSU6522960", shipmentId: "shp-zcsu6522960", fbaShipmentId: "FBA196F8XLQJ", unitCount: 1231, cbm: 65.48, palletCount: 49, currentLocationId: locationIds.yyZ9, destinationLocationId: locationIds.yyZ9, status: "delivered", arrivedDate: "2026-03-31", dispatchedDate: "2026-04-05" },
    { id: "CSGU6675337", shipmentId: "shp-csgu6675337", fbaShipmentId: "FBA196JLPMF8", unitCount: 1940, cbm: 68, palletCount: 38, currentLocationId: locationIds.yyZ9, destinationLocationId: locationIds.yyZ9, status: "delivered", arrivedDate: "2026-04-07", dispatchedDate: "2026-04-08" },
    { id: "BEAU6280647", shipmentId: "shp-beau6280647", fbaShipmentId: "FBA197N70G67", unitCount: 1402, cbm: 68.28, palletCount: 36, currentLocationId: locationIds.yhm1, destinationLocationId: locationIds.yhm1, status: "delivered", arrivedDate: "2026-04-22", dispatchedDate: "2026-04-23" },
    { id: "HMMU7089094", shipmentId: "shp-hmmu7089094", fbaShipmentId: "FBA198RW2CY1", unitCount: 1032, palletCount: 46, currentLocationId: locationIds.whybank10, destinationLocationId: locationIds.yyZ9, status: "in_transit", arrivedDate: "2026-04-27", dispatchedDate: "2026-04-28" },
    { id: "HMMU4464340", shipmentId: "shp-hmmu4464340", fbaShipmentId: "FBA198RTQ79W", unitCount: 867, palletCount: 40, currentLocationId: locationIds.whybank10, destinationLocationId: locationIds.yyZ9, status: "ready_dispatch", arrivedDate: "2026-04-28" },
    { id: "DRYU9624130", shipmentId: "shp-dryu9624130", fbaShipmentId: "FBA19CD7DG1G", unitCount: 1200, cbm: 29.5, palletCount: 17, currentLocationId: locationIds.whybank25, destinationLocationId: locationIds.yyz4, status: "hold", arrivedDate: "2026-03-25" },
  ],
  warehouseZones: [
    { id: "zone-wb25-main", warehouseLocationId: locationIds.whybank25, name: "Main Sort", capacityPallets: 2000, usedPallets: 1480 },
    { id: "zone-wb10-overflow", warehouseLocationId: locationIds.whybank10, name: "Overflow", capacityPallets: 1500, usedPallets: 980 },
  ],
  handlingJobs: [
    { id: "hj-zcsu6522960", containerId: "ZCSU6522960", warehouseLocationId: locationIds.whybank25, operationType: "repalletize", status: "billed", startedDate: "2026-03-31", completedDate: "2026-04-05", billableAmount: money(327900) },
    { id: "hj-beau6280647", containerId: "BEAU6280647", warehouseLocationId: locationIds.whybank10, operationType: "sort_palletize", status: "billed", startedDate: "2026-04-22", completedDate: "2026-04-23", billableAmount: money(206600) },
    { id: "hj-dryu9624130", containerId: "DRYU9624130", warehouseLocationId: locationIds.whybank25, operationType: "relabel", status: "in_progress", startedDate: "2026-03-25", billableAmount: money(85000) },
  ],
  transportOrders: [
    order({ id: "WB-260405-ZCSU6522960", customerId: customerIds.fbaSeller, shipmentId: "shp-zcsu6522960", originLocationId: locationIds.whybank25, destinationLocationId: locationIds.yyZ9, driverIds: ["driver-lh", "driver-af"], pallets: 49, status: "completed", podStatus: "signed", revenue: 3279, cost: 810, etaDate: "2026-04-08", createdDate: "2026-04-05" }),
    order({ id: "WB-260423-BEAU6280647", customerId: customerIds.fbaSeller, shipmentId: "shp-beau6280647", originLocationId: locationIds.whybank10, destinationLocationId: locationIds.yhm1, driverIds: ["driver-lh"], pallets: 36, status: "completed", podStatus: "signed", revenue: 2066, cost: 400, etaDate: "2026-04-24", createdDate: "2026-04-22" }),
    order({ id: "WB-260408-CSGU6675337", customerId: customerIds.fbaSeller, shipmentId: "shp-csgu6675337", originLocationId: locationIds.whybank10, destinationLocationId: locationIds.yyZ9, driverIds: ["driver-lh"], pallets: 38, status: "in_transit", podStatus: "pending", revenue: 1980, cost: 380, etaDate: "2026-04-09", createdDate: "2026-04-07" }),
    order({ id: "WB-251124-LT-001", customerId: customerIds.apLt, shipmentId: "shp-ap-lt-001", originLocationId: locationIds.whybank25, destinationLocationId: locationIds.saintLaurent, driverIds: ["driver-af"], pallets: 21, status: "completed", podStatus: "signed", revenue: 2320, cost: 505, etaDate: "2025-11-24", createdDate: "2025-11-24" }),
    order({ id: "WB-251119-JEFF-001", customerId: customerIds.tdJeff, shipmentId: "shp-td-jeff-001", originLocationId: locationIds.whybank25, destinationLocationId: locationIds.mississaugaWalmart, driverIds: ["driver-lh"], pallets: 27, status: "completed", podStatus: "signed", revenue: 2095, cost: 120, etaDate: "2025-11-19", createdDate: "2025-11-19" }),
    order({ id: "WB-251118-PDN-001", customerId: customerIds.apPdn, shipmentId: "shp-ap-pdn-001", originLocationId: locationIds.whybank25, destinationLocationId: locationIds.saintLaurent, driverIds: ["driver-af"], pallets: 23, status: "completed", podStatus: "signed", revenue: 1500, cost: 705, etaDate: "2025-11-18", createdDate: "2025-11-18" }),
    order({ id: "WB-251110-PANEX-001", customerId: customerIds.apPanex, shipmentId: "shp-ap-panex-001", originLocationId: locationIds.whybank25, destinationLocationId: locationIds.yow1, driverIds: ["driver-af"], pallets: 28, status: "completed", podStatus: "signed", revenue: 1250, cost: 405, etaDate: "2025-11-10", createdDate: "2025-11-10" }),
    order({ id: "WB-251107-QX-001", customerId: customerIds.apQx, shipmentId: "shp-ap-qx-001", originLocationId: locationIds.whybank25, destinationLocationId: locationIds.yyz7, driverIds: ["driver-lf"], pallets: 23, status: "completed", podStatus: "signed", revenue: 735, cost: 257, etaDate: "2025-11-07", createdDate: "2025-11-07" }),
    order({ id: "WB-251105-JW-001", customerId: customerIds.tdJw, shipmentId: "shp-td-jw-001", originLocationId: locationIds.whybank25, destinationLocationId: locationIds.yow1, driverIds: ["driver-af"], pallets: 20, status: "completed", podStatus: "signed", revenue: 1350, cost: 405, etaDate: "2025-11-05", createdDate: "2025-11-05" }),
    order({ id: "WB-251104-HAMMERT-001", customerId: customerIds.apHammert, shipmentId: "shp-ap-hammert-001", originLocationId: locationIds.whybank25, destinationLocationId: locationIds.belleville, driverIds: ["driver-lf"], pallets: 26, status: "completed", podStatus: "signed", revenue: 360, cost: 140, etaDate: "2025-11-04", createdDate: "2025-11-04" }),
    order({ id: "WB-251104-JD-001", customerId: customerIds.apJd, shipmentId: "shp-ap-jd-001", originLocationId: locationIds.whybank25, destinationLocationId: locationIds.guelph, driverIds: ["driver-lf"], pallets: 22, status: "completed", podStatus: "signed", revenue: 420, cost: 120, etaDate: "2025-11-04", createdDate: "2025-11-04" }),
    order({ id: "WB-251103-DB-001", customerId: customerIds.apDb, shipmentId: "shp-ap-db-001", originLocationId: locationIds.whybank25, destinationLocationId: locationIds.yow1, driverIds: ["driver-af"], pallets: 22, status: "exception", podStatus: "disputed", revenue: 1300, cost: 405, etaDate: "2025-11-03", createdDate: "2025-11-03" }),
    order({ id: "WB-251102-GVT-001", customerId: customerIds.apGvt, shipmentId: "shp-ap-gvt-001", originLocationId: locationIds.whybank25, destinationLocationId: locationIds.yyZ9, driverIds: ["driver-af"], mode: "LTL", pallets: 11, status: "completed", podStatus: "signed", revenue: 290, cost: 85, etaDate: "2025-11-02", createdDate: "2025-11-02" }),
    order({ id: "WB-251101-JW-001", customerId: customerIds.tdJw, shipmentId: "shp-td-jw-002", originLocationId: locationIds.whybank25, destinationLocationId: locationIds.yoo1, driverIds: ["driver-af"], pallets: 26, status: "completed", podStatus: "signed", revenue: 400, cost: 120, etaDate: "2025-11-01", createdDate: "2025-11-01" }),
    order({ id: "WB-251101-LLL-001", customerId: customerIds.apLll, shipmentId: "shp-ap-lll-001", originLocationId: locationIds.whybank25, destinationLocationId: locationIds.yyz4, driverIds: ["driver-af"], pallets: 26, status: "completed", podStatus: "signed", revenue: 350, cost: 125, etaDate: "2025-11-01", createdDate: "2025-11-01" }),
  ],
  trackingEvents: [
    { id: "evt-zcsu-created", subjectType: "transport_order", subjectId: "WB-260405-ZCSU6522960", status: "created", occurredAt: "2026-04-05T09:12:00-04:00", locationId: locationIds.whybank25 },
    { id: "evt-zcsu-delivered", subjectType: "transport_order", subjectId: "WB-260405-ZCSU6522960", status: "delivered", occurredAt: "2026-04-08T16:30:00-04:00", locationId: locationIds.yyZ9, note: "POD signed" },
    { id: "evt-beau-delivered", subjectType: "transport_order", subjectId: "WB-260423-BEAU6280647", status: "delivered", occurredAt: "2026-04-24T11:05:00-04:00", locationId: locationIds.yhm1, note: "POD signed" },
    { id: "evt-csgu-transit", subjectType: "transport_order", subjectId: "WB-260408-CSGU6675337", status: "in_transit", occurredAt: "2026-04-08T20:00:00-04:00", locationId: locationIds.whybank10 },
  ],
  podRecords: [
    { id: "pod-zcsu6522960", transportOrderId: "WB-260405-ZCSU6522960", status: "signed", signedAt: "2026-04-08T16:30:00-04:00" },
    { id: "pod-beau6280647", transportOrderId: "WB-260423-BEAU6280647", status: "signed", signedAt: "2026-04-24T11:05:00-04:00" },
    { id: "pod-csgu6675337", transportOrderId: "WB-260408-CSGU6675337", status: "pending" },
  ],
  documents: [],
  invoices: [
    { id: "2026-0137", customerId: customerIds.fbaSeller, status: "paid", period: "2026-03", subtotal: money(327900), tax: money(42600), total: money(370500), dueDate: "2026-04-30", sourceOrderIds: ["WB-260405-ZCSU6522960"] },
    { id: "2026-0139", customerId: customerIds.fbaSeller, status: "pending", period: "2026-04", subtotal: money(257300), tax: money(33500), total: money(290800), dueDate: "2026-05-28", sourceOrderIds: ["WB-260423-BEAU6280647", "WB-260408-CSGU6675337"] },
  ],
  invoiceLines: [
    { id: "il-2026-0137-1", invoiceId: "2026-0137", sourceType: "transport_order", sourceId: "WB-260405-ZCSU6522960", description: "FBA delivery and handling", quantity: 1, unitAmount: money(327900), total: money(327900) },
    { id: "il-2026-0139-1", invoiceId: "2026-0139", sourceType: "transport_order", sourceId: "WB-260423-BEAU6280647", description: "FBA Hamilton delivery", quantity: 1, unitAmount: money(206600), total: money(206600) },
  ],
  payables: [
    { id: "AP-2026-0087", vendorId: "org-lh-driver", status: "approved", category: "driver_settlement", period: "2026-04", subtotal: money(456000), tax: money(59300), total: money(515300), dueDate: "2026-05-10", sourceOrderIds: ["WB-260423-BEAU6280647", "WB-260408-CSGU6675337"] },
    { id: "AP-2026-0088", vendorId: "org-af-driver", status: "scheduled", category: "driver_settlement", period: "2026-04", subtotal: money(572000), tax: money(74400), total: money(646400), dueDate: "2026-05-12", sourceOrderIds: ["WB-260405-ZCSU6522960"] },
  ],
  rateCards: [
    { id: "rc-fba-delivery-2026", partnerId: "org-fba-seller", name: "FBA Delivery 2026", currency: "CAD", effectiveFrom: "2026-01-01", active: true },
  ],
  rateRules: [
    { id: "rr-yyz9-pallet", rateCardId: "rc-fba-delivery-2026", service: "fba_delivery", basis: "per_pallet", zoneCode: "YYZ9", amount: money(3500), minimum: money(3500), taxable: true },
    { id: "rr-yhm1-pallet", rateCardId: "rc-fba-delivery-2026", service: "fba_delivery", basis: "per_pallet", zoneCode: "YHM1", amount: money(4000), minimum: money(4000), taxable: true },
    { id: "rr-relabel", rateCardId: "rc-fba-delivery-2026", service: "relabel", basis: "per_label", amount: money(50), taxable: true },
    { id: "rr-repalletize", rateCardId: "rc-fba-delivery-2026", service: "repalletize", basis: "per_pallet", amount: money(800), taxable: true },
  ],
  customsEntries: [
    { id: "ce-shp-dryu9624130", shipmentId: "shp-dryu9624130", brokerId: "org-broker-gta", status: "documents_needed", hsCode: "pending" },
  ],
};
