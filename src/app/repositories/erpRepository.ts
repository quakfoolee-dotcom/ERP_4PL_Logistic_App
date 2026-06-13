import { demoErpSeed } from "../mocks/erpSeed";
import type {
  Container,
  ErpSeedData,
  InvoiceHeader,
  Payable,
  PodRecord,
  TrackingEvent,
  TransportOrder,
  TransportOrderStatus,
  WarehouseZone,
} from "../domain/models";

export interface OperationalOrderGraph {
  order: TransportOrder;
  shipment: ErpSeedData["shipments"][number] | null;
  containers: Container[];
  pod: PodRecord | null;
  trackingEvents: TrackingEvent[];
  invoices: InvoiceHeader[];
  payables: Payable[];
}

export interface ErpRepository {
  listTransportOrders(): Promise<TransportOrder[]>;
  getOperationalOrderGraph(orderId: string): Promise<OperationalOrderGraph | null>;
  updateTransportOrderStatus(orderId: string, status: TransportOrderStatus): Promise<TransportOrder | null>;
  listContainers(): Promise<Container[]>;
  listWarehouseZones(): Promise<WarehouseZone[]>;
  listInvoices(): Promise<InvoiceHeader[]>;
  listPayables(): Promise<Payable[]>;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function createMockErpRepository(seed: ErpSeedData = demoErpSeed): ErpRepository {
  let state = clone(seed);

  return {
    async listTransportOrders() {
      return clone(state.transportOrders);
    },

    async getOperationalOrderGraph(orderId) {
      const order = state.transportOrders.find((item) => item.id === orderId);
      if (!order) return null;
      const shipment = state.shipments.find((item) => item.id === order.shipmentId) ?? null;
      const containers = state.containers.filter((item) => shipment?.containerIds.includes(item.id));
      const pod = state.podRecords.find((item) => item.transportOrderId === order.id) ?? null;
      const trackingEvents = state.trackingEvents.filter((item) => item.subjectId === order.id);
      const invoices = state.invoices.filter((item) => item.sourceOrderIds.includes(order.id));
      const payables = state.payables.filter((item) => item.sourceOrderIds.includes(order.id));

      return clone({ order, shipment, containers, pod, trackingEvents, invoices, payables });
    },

    async updateTransportOrderStatus(orderId, status) {
      let updated: TransportOrder | null = null;
      state = {
        ...state,
        transportOrders: state.transportOrders.map((order) => {
          if (order.id !== orderId) return order;
          updated = { ...order, status };
          return updated;
        }),
      };
      return updated ? clone(updated) : null;
    },

    async listContainers() {
      return clone(state.containers);
    },

    async listWarehouseZones() {
      return clone(state.warehouseZones);
    },

    async listInvoices() {
      return clone(state.invoices);
    },

    async listPayables() {
      return clone(state.payables);
    },
  };
}

export const erpRepository = createMockErpRepository();
