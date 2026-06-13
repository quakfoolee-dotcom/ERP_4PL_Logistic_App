import { toLegacyTransportOrder, type LegacyTransportOrder } from "../domain/legacyTransportOrder";
import { buildFinanceProjection, summarizeFinance } from "../domain/financeProjection";
import { buildOperationsProjection } from "../domain/operationsProjection";
import { erpRepository } from "./erpRepository";

export function getErpSnapshot() {
  return erpRepository.getSnapshot();
}

export function getInitialTransportOrders(): LegacyTransportOrder[] {
  const snapshot = getErpSnapshot();
  return snapshot.transportOrders.map((order) =>
    toLegacyTransportOrder(order, {
      organizations: snapshot.organizations,
      locations: snapshot.locations,
      drivers: snapshot.drivers,
      vehicles: snapshot.vehicles,
    }),
  );
}

export function getFinanceProjection() {
  return buildFinanceProjection(getErpSnapshot());
}

export function getFinanceSummary() {
  return summarizeFinance(getFinanceProjection());
}

export function getOperationsProjection() {
  return buildOperationsProjection(getErpSnapshot());
}
