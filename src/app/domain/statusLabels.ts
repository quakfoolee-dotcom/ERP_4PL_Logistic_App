import type { PodStatus, TransportOrderStatus } from "./models";

export const legacyTransportStatus: Record<TransportOrderStatus, "\u5f85\u6d3e\u9001" | "\u8fd0\u8f93\u4e2d" | "\u5df2\u5b8c\u6210" | "\u5f02\u5e38"> = {
  pending_dispatch: "\u5f85\u6d3e\u9001",
  in_transit: "\u8fd0\u8f93\u4e2d",
  completed: "\u5df2\u5b8c\u6210",
  exception: "\u5f02\u5e38",
};

export const legacyPodStatus: Record<PodStatus, "\u5f85\u786e\u8ba4" | "\u5df2\u7b7e\u6536" | "\u4e89\u8bae\u4e2d"> = {
  pending: "\u5f85\u786e\u8ba4",
  signed: "\u5df2\u7b7e\u6536",
  disputed: "\u4e89\u8bae\u4e2d",
};
