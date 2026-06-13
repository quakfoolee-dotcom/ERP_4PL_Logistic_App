import { formatMoney } from "./money";
import type { Container, ErpSeedData, Location, Money, Organization, TransportOrder } from "./models";

export interface WarehouseHandlingRow {
  id: string;
  customer: string;
  fbaShipment: string;
  type: string;
  units: number;
  cbm: number;
  pallets: string;
  dest: string;
  repalletize: string;
  total: string;
  status: string;
  arrived: string;
  dispatched: string;
}

export interface WarehouseZoneRow {
  zone: string;
  capacity: number;
  used: number;
  containers: number;
  status: string;
}

export interface WeeklyActivityRow {
  day: string;
  inbound: number;
  outbound: number;
}

export interface LiveContainerRow {
  id: string;
  pallets: number;
  dest: string;
  driver: string;
  departed: string;
  eta: string;
  status: "on-route" | "delivered" | "hold";
  notes: string;
}

export interface AppointmentRow {
  time: string;
  desc: string;
  status: "done" | "active" | "pending";
  cid: string;
}

export interface PodProjectionRow {
  file: string;
  customer: string;
  dest: string;
  driver: string;
  pallets: number;
  date: string;
  status: "confirmed" | "rejected" | "pending";
  note?: string;
}

export interface PayrollDriverRow {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  type: string;
  orders: number;
  distance: string;
  rating: number;
  base: string;
  bonus: string;
  fuel: string;
  other: string;
  total: string;
  status: string;
  period: string;
}

export interface ReimbursementRow {
  id: string;
  driver: string;
  type: string;
  amount: string;
  route: string;
  date: string;
  status: string;
  receipt: string;
}

export interface OperationsProjection {
  handlingFees: WarehouseHandlingRow[];
  inventory: WarehouseZoneRow[];
  weeklyActivity: WeeklyActivityRow[];
  liveContainers: LiveContainerRow[];
  appointments: AppointmentRow[];
  pods: PodProjectionRow[];
  payrollDrivers: PayrollDriverRow[];
  reimbursements: ReimbursementRow[];
}

function byId<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id);
}

function organizationName(organizations: Organization[], id: string) {
  return byId(organizations, id)?.name ?? id;
}

function locationLabel(locations: Location[], id: string) {
  const location = byId(locations, id);
  return location?.code ? `${location.code} ${location.name.replace(/\s*\(.+\)$/, "")}` : location?.name ?? id;
}

function locationCode(locations: Location[], id: string) {
  return byId(locations, id)?.code ?? byId(locations, id)?.name ?? id;
}

function orderForContainer(data: ErpSeedData, container: Container): TransportOrder | undefined {
  return data.transportOrders.find((order) => order.shipmentId === container.shipmentId);
}

function driversForOrder(data: ErpSeedData, order?: TransportOrder) {
  if (!order) return "TBD";
  return order.assignedDriverIds
    .map((id) => byId(data.drivers, id)?.name)
    .filter(Boolean)
    .join("+") || "TBD";
}

function handlingAmountForContainer(data: ErpSeedData, containerId: string, fallback?: Money) {
  return data.handlingJobs.find((job) => job.containerId === containerId)?.billableAmount ?? fallback ?? { amountCents: 0, currency: "CAD" as const };
}

function warehouseStatus(used: number, capacity: number) {
  const pct = capacity > 0 ? used / capacity : 0;
  if (pct > 0.9) return "\u9884\u8b66";
  if (pct > 0.75) return "\u63a5\u8fd1\u6ee1\u8f7d";
  return "\u6b63\u5e38";
}

function payrollStatus(status: string) {
  return status === "paid" || status === "approved" ? "\u5df2\u7ed3\u7b97" : "\u5f85\u7ed3\u7b97";
}

function payrollType(category: string) {
  return category.replace(/_/g, " ").replace(/\b\w/g, (value) => value.toUpperCase());
}

export function buildOperationsProjection(data: ErpSeedData): OperationsProjection {
  const handlingFees = data.containers.map((container) => {
    const shipment = byId(data.shipments, container.shipmentId);
    const order = orderForContainer(data, container);
    const customer = shipment ? organizationName(data.organizations, shipment.customerId) : "Unknown";
    const amount = handlingAmountForContainer(data, container.id, order?.revenue);
    const job = data.handlingJobs.find((item) => item.containerId === container.id);
    const destination = locationLabel(data.locations, container.destinationLocationId);
    const hasHold = container.status === "hold";
    const hasRelabel = job?.operationType === "relabel";

    return {
      id: container.id,
      customer,
      fbaShipment: container.fbaShipmentId ?? shipment?.fbaShipmentId ?? "Multi-Shipment",
      type: hasRelabel ? "\u6362\u6807+\u5206\u8d27" : job?.operationType === "repalletize" ? "\u5206\u8d27+\u4e8c\u6b21\u6253\u677f" : "\u5206\u8d27\u6253\u677f",
      units: container.unitCount,
      cbm: container.cbm ?? 0,
      pallets: `${container.palletCount}P`,
      dest: hasHold ? `${destination} HOLD` : destination,
      repalletize: hasRelabel ? "\u6362\u6807 CAD $0.50/\u5f20" : job?.operationType === "repalletize" ? "8P x CAD $8" : "-",
      total: formatMoney(amount),
      status: job?.status === "billed" || order?.podStatus === "signed" ? "\u5df2\u7ed3\u7b97" : "\u5f85\u7ed3\u7b97",
      arrived: container.arrivedDate ?? "-",
      dispatched: hasHold ? "HOLD" : container.dispatchedDate ?? "Pending dispatch",
    };
  });

  const inventory = data.warehouseZones.map((zone) => {
    const warehouse = byId(data.locations, zone.warehouseLocationId);
    const containerCount = data.containers.filter((container) => container.currentLocationId === zone.warehouseLocationId).length;
    return {
      zone: `${warehouse?.name ?? zone.warehouseLocationId} - ${zone.name}`,
      capacity: zone.capacityPallets,
      used: zone.usedPallets,
      containers: containerCount,
      status: warehouseStatus(zone.usedPallets, zone.capacityPallets),
    };
  });

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeklyActivity = days.map((day, index) => {
    const dayContainers = data.containers.filter((container) => container.arrivedDate && new Date(container.arrivedDate).getDay() === ((index + 1) % 7));
    const outboundContainers = data.containers.filter((container) => container.dispatchedDate && new Date(container.dispatchedDate).getDay() === ((index + 1) % 7));
    return {
      day,
      inbound: dayContainers.reduce((total, container) => total + container.unitCount, 0),
      outbound: outboundContainers.reduce((total, container) => total + container.unitCount, 0),
    };
  });

  const liveContainers = data.containers.map((container) => {
    const order = orderForContainer(data, container);
    const status = (container.status === "hold" ? "hold" : container.status === "delivered" ? "delivered" : "on-route") as LiveContainerRow["status"];
    return {
      id: container.id,
      pallets: container.palletCount,
      dest: locationCode(data.locations, container.destinationLocationId),
      driver: driversForOrder(data, order),
      departed: status === "hold" ? "HOLD" : container.dispatchedDate ?? "Pending",
      eta: status === "hold" ? "Pending" : order?.etaDate ?? "TBD",
      status,
      notes: `${container.palletCount}P to ${locationCode(data.locations, container.destinationLocationId)}. ${order ? `Order ${order.id}.` : "No dispatch order linked yet."}`,
    };
  });

  const appointments = liveContainers.map((container) => ({
    time: container.departed === "HOLD" ? "TBD" : container.departed,
    desc: `${container.pallets}P - ${container.driver} -> ${container.dest} (${container.id})`,
    status: (container.status === "delivered" ? "done" : container.status === "hold" ? "pending" : "active") as AppointmentRow["status"],
    cid: container.id,
  }));

  const pods = data.transportOrders.map((order) => {
    const dest = locationCode(data.locations, order.destinationLocationId);
    const driver = driversForOrder(data, order);
    const status = (order.podStatus === "signed" ? "confirmed" : order.podStatus === "disputed" ? "rejected" : "pending") as PodProjectionRow["status"];
    return {
      file: `${order.customerId.replace("org-", "").toUpperCase()}-${order.createdDate.replace(/-/g, "").slice(2)}-${dest}-${order.palletCount}P-${driver.replace(/\s|\+/g, "")}.pdf`,
      customer: organizationName(data.organizations, order.customerId),
      dest,
      driver,
      pallets: order.palletCount,
      date: order.etaDate,
      status,
      note: status === "rejected" ? "Operational exception - POD dispute requires review" : undefined,
    };
  });

  const payrollDrivers = data.payables.map((payable) => {
    const vendor = organizationName(data.organizations, payable.vendorId);
    const base = { amountCents: Math.round(payable.subtotal.amountCents * 0.78), currency: payable.subtotal.currency };
    const bonus = { amountCents: Math.round(payable.subtotal.amountCents * 0.08), currency: payable.subtotal.currency };
    const fuel = { amountCents: Math.round(payable.subtotal.amountCents * 0.09), currency: payable.subtotal.currency };
    const other = { amountCents: payable.subtotal.amountCents - base.amountCents - bonus.amountCents - fuel.amountCents, currency: payable.subtotal.currency };
    return {
      id: `DRV-${vendor.replace(/[^A-Z0-9]/gi, "-").toUpperCase()}`,
      name: vendor.replace(" Driver", ""),
      phone: "647-***-****",
      vehicle: "Assigned fleet vehicle",
      type: payrollType(payable.category),
      orders: payable.sourceOrderIds.length,
      distance: `${(payable.sourceOrderIds.length * 185).toLocaleString()}km`,
      rating: 4.8,
      base: formatMoney(base),
      bonus: formatMoney(bonus),
      fuel: formatMoney(fuel),
      other: formatMoney(other),
      total: formatMoney(payable.subtotal),
      status: payrollStatus(payable.status),
      period: payable.period,
    };
  });

  const reimbursements = data.transportOrders
    .filter((order) => order.status === "exception" || order.cost.amountCents > order.revenue.amountCents * 0.45)
    .map((order, index) => ({
      id: `EXP-${order.createdDate.replace(/-/g, "").slice(2)}-${String(index + 91).padStart(4, "0")}`,
      driver: driversForOrder(data, order),
      type: order.status === "exception" ? "Exception Handling" : "Wait Time",
      amount: formatMoney({ amountCents: Math.max(8000, Math.round(order.cost.amountCents * 0.12)), currency: order.cost.currency }),
      route: `${locationCode(data.locations, order.originLocationId)} -> ${locationCode(data.locations, order.destinationLocationId)}`,
      date: order.etaDate,
      status: order.status === "exception" ? "\u5f85\u5ba1\u6838" : "\u5df2\u6279\u51c6",
      receipt: "Uploaded",
    }));

  return {
    handlingFees,
    inventory,
    weeklyActivity,
    liveContainers,
    appointments,
    pods,
    payrollDrivers,
    reimbursements,
  };
}
