import { formatMoney } from "./money";
import { legacyPodStatus, legacyTransportStatus } from "./statusLabels";
import type { Driver, Location, Organization, TransportOrder as DomainTransportOrder, Vehicle } from "./models";

export type LegacyTransportStatus = "\u5df2\u5b8c\u6210" | "\u8fd0\u8f93\u4e2d" | "\u5f85\u6d3e\u9001" | "\u5f02\u5e38";

export interface LegacyTransportOrder {
  id: string;
  customer: string;
  origin: string;
  dest: string;
  driver: string;
  vehicle: string;
  type: "FTL" | "LTL";
  pallets: string;
  status: LegacyTransportStatus;
  amount: string;
  cost: string;
  profit: string;
  pod: string;
  eta: string;
  created: string;
}

export interface LegacyTransportLookups {
  organizations: Organization[];
  locations: Location[];
  drivers: Driver[];
  vehicles: Vehicle[];
}

function byId<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id);
}

function locationName(locations: Location[], id: string) {
  const location = byId(locations, id);
  return location?.code ? `${location.name} (${location.code})` : location?.name ?? id;
}

export function toLegacyTransportOrder(order: DomainTransportOrder, lookups: LegacyTransportLookups): LegacyTransportOrder {
  const customer = byId(lookups.organizations, order.customerId);
  const vehicle = order.vehicleId ? byId(lookups.vehicles, order.vehicleId) : undefined;
  const drivers = order.assignedDriverIds
    .map((driverId) => byId(lookups.drivers, driverId)?.name)
    .filter(Boolean)
    .join(" / ");
  const profit = {
    amountCents: order.revenue.amountCents - order.cost.amountCents,
    currency: order.revenue.currency,
  };

  return {
    id: order.id,
    customer: customer?.name ?? order.customerId,
    origin: locationName(lookups.locations, order.originLocationId),
    dest: `${locationName(lookups.locations, order.destinationLocationId)} (${order.palletCount}P)`,
    driver: drivers || "TBD",
    vehicle: vehicle?.label ?? order.mode,
    type: order.mode,
    pallets: `${order.palletCount}P`,
    status: legacyTransportStatus[order.status],
    amount: formatMoney(order.revenue),
    cost: formatMoney(order.cost),
    profit: formatMoney(profit),
    pod: legacyPodStatus[order.podStatus],
    eta: order.etaDate,
    created: order.createdDate,
  };
}
