export interface TransportOrder {
  id: string;
  customer: string;
  origin: string;
  dest: string;
  driver: string;
  vehicle: string;
  type: "FTL" | "LTL";
  pallets: string;
  status: "已完成" | "运输中" | "待派送" | "异常";
  amount: string;
  cost: string;
  profit: string;
  pod: string;
  eta: string;
  created: string;
}

// Demo seed data from the Brampton FBA operation. Keep this file as the local
// handoff point for an eventual API/database integration.
export const initialTransportOrders: TransportOrder[] = [
  { id: "WB-260405-ZCSU6522960", customer: "ZCSU6522960", origin: "Brampton #25 (Whybank)", dest: "YYZ9 Amazon FC (49P)", driver: "LH / AF", vehicle: "大车 FTL", type: "FTL", pallets: "49P", status: "已完成", amount: "CAD $3,279", cost: "CAD $810", profit: "CAD $2,469", pod: "已签收", eta: "2026-04-08", created: "2026-04-05" },
  { id: "WB-260423-BEAU6280647", customer: "BEAU6280647", origin: "Brampton #10", dest: "YHM1 Hamilton Amazon (36P)", driver: "LH", vehicle: "大车 FTL", type: "FTL", pallets: "36P", status: "已完成", amount: "CAD $2,066", cost: "CAD $400", profit: "CAD $1,666", pod: "已签收", eta: "2026-04-24", created: "2026-04-22" },
  { id: "WB-260408-CSGU6675337", customer: "CSGU6675337", origin: "Brampton #10", dest: "YYZ9 Amazon FC (38P)", driver: "LH", vehicle: "大车 FTL", type: "FTL", pallets: "38P", status: "运输中", amount: "CAD $1,980", cost: "CAD $380", profit: "CAD $1,600", pod: "待确认", eta: "2026-04-09", created: "2026-04-07" },
  { id: "WB-251124-LT-001", customer: "AP-LT", origin: "Brampton #25 (Whybank)", dest: "Saint-Laurent, QC (YHM1 21P)", driver: "AF", vehicle: "大车 FTL", type: "FTL", pallets: "21P", status: "已完成", amount: "CAD $2,320", cost: "CAD $505", profit: "CAD $1,815", pod: "已签收", eta: "2025-11-24", created: "2025-11-24" },
  { id: "WB-251119-JEFF-001", customer: "TD-JEFF", origin: "Brampton #25 (Whybank)", dest: "Mississauga Walmart 6175 (27P)", driver: "LH", vehicle: "大车 FTL", type: "FTL", pallets: "27P", status: "已完成", amount: "CAD $2,095", cost: "CAD $120", profit: "CAD $1,975", pod: "已签收", eta: "2025-11-19", created: "2025-11-19" },
  { id: "WB-251118-PDN-001", customer: "AP-PDN", origin: "Brampton #25 (Whybank)", dest: "Saint-Laurent, QC (23P)", driver: "AF", vehicle: "大车 FTL", type: "FTL", pallets: "23P", status: "已完成", amount: "CAD $1,500", cost: "CAD $705", profit: "CAD $795", pod: "已签收", eta: "2025-11-18", created: "2025-11-18" },
  { id: "WB-251110-PANEX-001", customer: "AP-PANEX", origin: "Brampton #25 (Whybank)", dest: "Mississauga / YOW1 (28P)", driver: "AF", vehicle: "大车 FTL", type: "FTL", pallets: "28P", status: "已完成", amount: "CAD $1,250", cost: "CAD $405", profit: "CAD $845", pod: "已签收", eta: "2025-11-10", created: "2025-11-10" },
  { id: "WB-251107-QX-001", customer: "AP-QX", origin: "Brampton #25 (Whybank)", dest: "Concord / YYZ7 Amazon (23P)", driver: "LF", vehicle: "大车 FTL", type: "FTL", pallets: "23P", status: "已完成", amount: "CAD $735", cost: "CAD $257", profit: "CAD $478", pod: "已签收", eta: "2025-11-07", created: "2025-11-07" },
  { id: "WB-251105-JW-001", customer: "TD-JW", origin: "6160 Whybank Dr", dest: "YOW1 Ottawa Amazon (20P)", driver: "AF", vehicle: "大车 FTL", type: "FTL", pallets: "20P", status: "已完成", amount: "CAD $1,350", cost: "CAD $405", profit: "CAD $945", pod: "已签收", eta: "2025-11-05", created: "2025-11-05" },
  { id: "WB-251104-HAMMERT-001", customer: "AP-Hammert", origin: "Brampton #25 (Whybank)", dest: "Belleville / YYZ9 (26P)", driver: "LF", vehicle: "大车 FTL", type: "FTL", pallets: "26P", status: "已完成", amount: "CAD $360", cost: "CAD $140", profit: "CAD $220", pod: "已签收", eta: "2025-11-04", created: "2025-11-04" },
  { id: "WB-251104-JD-001", customer: "AP-JD", origin: "Brampton #25 (Whybank)", dest: "Guelph / XYY1 Amazon (22P)", driver: "LF", vehicle: "大车 FTL", type: "FTL", pallets: "22P", status: "已完成", amount: "CAD $420", cost: "CAD $120", profit: "CAD $300", pod: "已签收", eta: "2025-11-04", created: "2025-11-04" },
  { id: "WB-251103-DB-001", customer: "AP-DB", origin: "Brampton #25 (Whybank)", dest: "Concord → YOW1 Ottawa (22P)", driver: "AF", vehicle: "大车 FTL", type: "FTL", pallets: "22P", status: "异常", amount: "CAD $1,300", cost: "CAD $405", profit: "CAD $895", pod: "争议中", eta: "2025-11-03", created: "2025-11-03" },
  { id: "WB-251102-GVT-001", customer: "AP-GVT", origin: "Brampton #25 (Whybank)", dest: "YYZ9 Amazon FC (11P)", driver: "AF", vehicle: "小车 LTL", type: "LTL", pallets: "11P", status: "已完成", amount: "CAD $290", cost: "CAD $85", profit: "CAD $205", pod: "已签收", eta: "2025-11-02", created: "2025-11-02" },
  { id: "WB-251101-JW-001", customer: "TD-JW", origin: "6160 Whybank Dr", dest: "YOO1 Oakville Amazon (26P)", driver: "AF", vehicle: "大车 FTL", type: "FTL", pallets: "26P", status: "已完成", amount: "CAD $400", cost: "CAD $120", profit: "CAD $280", pod: "已签收", eta: "2025-11-01", created: "2025-11-01" },
  { id: "WB-251101-LLL-001", customer: "AP-LLL", origin: "Brampton #25 (Whybank)", dest: "YYZ4 Amazon FC - Vaughan (26P)", driver: "AF", vehicle: "大车 FTL", type: "FTL", pallets: "26P", status: "已完成", amount: "CAD $350", cost: "CAD $125", profit: "CAD $225", pod: "已签收", eta: "2025-11-01", created: "2025-11-01" },
];
