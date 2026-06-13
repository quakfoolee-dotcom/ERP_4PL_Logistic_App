import type {
  Container,
  ErpSeedData,
  InvoiceHeader,
  Payable,
  TransportOrder,
  TransportOrderStatus,
  WarehouseZone,
} from "../domain/models";
import type { ErpRepository, OperationalOrderGraph } from "./erpRepository";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!response.ok) throw new Error(`ERP API request failed: ${response.status} ${response.statusText}`);
  return response.json() as Promise<T>;
}

export function createApiErpRepository(baseUrl = "/api/erp"): ErpRepository {
  let snapshotCache: ErpSeedData | null = null;

  async function snapshot() {
    snapshotCache ??= await requestJson<ErpSeedData>(`${baseUrl}/snapshot`);
    return snapshotCache;
  }

  return {
    getSnapshot() {
      if (!snapshotCache) throw new Error("ERP API snapshot has not been loaded yet.");
      return structuredClone(snapshotCache);
    },

    async listTransportOrders(): Promise<TransportOrder[]> {
      return requestJson<TransportOrder[]>(`${baseUrl}/transport-orders`);
    },

    async getOperationalOrderGraph(orderId: string): Promise<OperationalOrderGraph | null> {
      return requestJson<OperationalOrderGraph | null>(`${baseUrl}/transport-orders/${encodeURIComponent(orderId)}/graph`);
    },

    async updateTransportOrderStatus(orderId: string, status: TransportOrderStatus): Promise<TransportOrder | null> {
      const updated = await requestJson<TransportOrder | null>(`${baseUrl}/transport-orders/${encodeURIComponent(orderId)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      snapshotCache = null;
      return updated;
    },

    async listContainers(): Promise<Container[]> {
      return requestJson<Container[]>(`${baseUrl}/containers`);
    },

    async listWarehouseZones(): Promise<WarehouseZone[]> {
      return requestJson<WarehouseZone[]>(`${baseUrl}/warehouse-zones`);
    },

    async listInvoices(): Promise<InvoiceHeader[]> {
      return requestJson<InvoiceHeader[]>(`${baseUrl}/invoices`);
    },

    async listPayables(): Promise<Payable[]> {
      return requestJson<Payable[]>(`${baseUrl}/payables`);
    },
  };
}
