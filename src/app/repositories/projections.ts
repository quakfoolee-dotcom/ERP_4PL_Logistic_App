import { toLegacyTransportOrder, type LegacyTransportOrder } from "../domain/legacyTransportOrder";
import { buildFinanceProjection, summarizeFinance } from "../domain/financeProjection";
import { buildOperationsProjection } from "../domain/operationsProjection";
import { customerCases, customerProfiles } from "../domain/businessReadiness";
import { requirementCoverage, summarizeRequirementCoverage } from "../domain/requirementsCoverage";
import { erpRepository } from "./erpRepository";
import { workflowRepository } from "./workflowRepository";
import { buildCustomerReadinessFromOrderToCash, mergeFinanceProjectionWithOrderToCash } from "./orderToCashAdapters";
export { getOrderToCashDashboardProjection, getOrderToCashEntityCounts, getOrderToCashSnapshot } from "./orderToCashProjections";

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
  return mergeFinanceProjectionWithOrderToCash(buildFinanceProjection(getErpSnapshot()));
}

export function getFinanceSummary() {
  return summarizeFinance(getFinanceProjection());
}

export function getOperationsProjection() {
  return buildOperationsProjection(getErpSnapshot());
}

export function getCustomerReadinessProjection() {
  const orderToCash = buildCustomerReadinessFromOrderToCash();
  const customersById = new Map(customerProfiles.map((customer) => [customer.id, customer]));
  const existingIdByName = new Map(customerProfiles.map((customer) => [customer.name.toLowerCase(), customer.id]));
  const customerAliasById = new Map<string, string>();
  orderToCash.customers.forEach((customer) => {
    const existingId = existingIdByName.get(customer.name.toLowerCase());
    const targetId = existingId ?? customer.id;
    customerAliasById.set(customer.id, targetId);
    customersById.set(targetId, { ...customersById.get(targetId), ...customer, id: targetId });
  });
  const casesById = new Map(customerCases.map((item) => [item.id, item]));
  orderToCash.cases.forEach((item) => {
    const customerId = customerAliasById.get(item.customerId) ?? item.customerId;
    casesById.set(item.id, { ...casesById.get(item.id), ...item, customerId });
  });
  return {
    customers: Array.from(customersById.values()),
    cases: Array.from(casesById.values()),
  };
}

export function getFreightCustomsProjection() {
  const workflow = workflowRepository.getSnapshot();
  return {
    freightFiles: workflow.freightFiles,
  };
}

export function getRequirementCoverageProjection() {
  return {
    requirements: requirementCoverage,
    summary: summarizeRequirementCoverage(requirementCoverage),
  };
}

export function getWmsWorkflowProjection() {
  const workflow = workflowRepository.getSnapshot();
  return {
    asns: workflow.asns,
    returns: workflow.returns,
    serviceEvents: workflow.serviceEvents,
  };
}

export function getTmsDispatchProjection() {
  const workflow = workflowRepository.getSnapshot();
  return {
    dispatches: workflow.dispatches,
  };
}

export function getFinanceHubWorkflowProjection() {
  const workflow = workflowRepository.getSnapshot();
  return {
    billingQueue: workflow.billingQueue,
    accountingSync: workflow.accountingSync,
  };
}
