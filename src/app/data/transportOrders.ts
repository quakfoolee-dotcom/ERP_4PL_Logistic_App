import type { LegacyTransportOrder } from "../domain/legacyTransportOrder";
import { getInitialTransportOrders } from "../repositories/projections";

export type TransportOrder = LegacyTransportOrder;

// Compatibility export for the current UI. The source of truth is now the ERP
// repository snapshot, which can later be backed by an API/database.
export const initialTransportOrders: TransportOrder[] = getInitialTransportOrders();
