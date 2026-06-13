import { toLegacyTransportOrder, type LegacyTransportOrder } from "../domain/legacyTransportOrder";
import { demoErpSeed } from "../mocks/erpSeed";

export type TransportOrder = LegacyTransportOrder;

// Compatibility export for the current UI. The source of truth is now the
// normalized demo seed in src/app/mocks/erpSeed.ts.
export const initialTransportOrders: TransportOrder[] = demoErpSeed.transportOrders.map((order) =>
  toLegacyTransportOrder(order, {
    organizations: demoErpSeed.organizations,
    locations: demoErpSeed.locations,
    drivers: demoErpSeed.drivers,
    vehicles: demoErpSeed.vehicles,
  }),
);
