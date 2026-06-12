export type AppLanguage = "zh" | "en";

export function pick(language: AppLanguage, zh: string, en: string) {
  return language === "en" ? en : zh;
}

const enTextReplacements: Array<[RegExp, string]> = [
  [/\u94a2\u9014\u7269\u6d41\u52a0\u62ff\u5927/g, "Fengtu Logistics Canada"],
  [/GTA 4PL FBA\u7269\u6d41/g, "GTA 4PL FBA Logistics"],
  [/\u8fd0\u8425\u56e2\u961f/g, "Operations Team"],
  [/\u64cd\u4f5c\u8d39\u7ba1\u7406/g, "Handling Fees"],
  [/\u8fd0\u8425\u63a7\u5236\u53f0/g, "Operations Dashboard"],
  [/\u8fd0\u8f93\u7ba1\u7406/g, "Transport Management"],
  [/\u8fd0\u8f93\u8ba2\u5355/g, "Transport Orders"],
  [/\u5728\u9014\u8ffd\u8e2a/g, "Live Tracking"],
  [/POD\u7ba1\u7406/g, "POD Management"],
  [/\u53f8\u673a\u7ba1\u7406/g, "Driver Management"],
  [/\u53f8\u673a\u6863\u6848/g, "Driver Profiles"],
  [/\u5408\u4f5c\u4f19\u4f34/g, "Partners"],
  [/\u5408\u4f5c\u65b9\u62a5\u4ef7/g, "Partner Quotes"],
  [/\u4ed3\u50a8\u7ba1\u7406/g, "Warehouse"],
  [/\u5e93\u5b58\u6982\u89c8/g, "Inventory Overview"],
  [/\u8d22\u52a1\u7ba1\u7406/g, "Finance"],
  [/\u5e94\u6536\u53d1\u7968/g, "AR Invoices"],
  [/\u5e94\u4ed8\u8d26\u6b3e/g, "AP Payables"],
  [/\u4e2d\u8f6c\u6c47\u603b/g, "Transfer Summary"],
  [/\u4e1a\u52a1\u5206\u6790/g, "Analytics"],
  [/\u5408\u89c4\u5ba1\u8ba1/g, "Compliance"],
  [/\u7cfb\u7edf\u8bbe\u7f6e/g, "System Settings"],
  [/\u672c\u5468FBA\u6536\u53d1\u4ef6\u8d8b\u52bf/g, "Weekly FBA Inbound / Outbound Trend"],
  [/FBA ?\u67dc\u5b50\u64cd\u4f5c\u660e\u7ec6/g, "FBA Container Handling"],
  [/\u4ed3\u5e93\u4f7f\u7528\u7387/g, "Warehouse Utilization"],
  [/FBA\u64cd\u4f5c\u8d39\u6784\u6210/g, "FBA Handling Fee Breakdown"],
  [/FBA\u5904\u7406\u8d39/g, "FBA Handling Revenue"],
  [/\u5165\u5e93\u4ef6\u6570/g, "Inbound Units"],
  [/\u51fa\u5e93\u4ef6\u6570/g, "Outbound Units"],
  [/\u4ed3\u50a8\u5360\u7528\u7387/g, "Utilization"],
  [/\u6d3b\u8dc3\u67dc\u5b50/g, "Active Containers"],
  [/\u5206\u8d27\+\u4e8c\u6b21\u6253\u677f/g, "Sort + Re-palletize"],
  [/\u5206\u8d27\u6253\u677f/g, "Sort / Palletize"],
  [/\u5206\u8d27\+\u591a\u4ed3\u6d3e\u9001/g, "Sort + Multi-FC Delivery"],
  [/\u6362\u6807\+\u5206\u8d27/g, "Re-label + Sort"],
  [/\u6362\u6807/g, "Re-label"],
  [/\u4e8c\u6b21\u6253\u677f/g, "Re-palletize"],
  [/\u4e8c\u6b21\u7406\u8d27/g, "Re-sort"],
  [/\u5b58\u677f/g, "Pallet storage"],
  [/\u5206\u8d27/g, "Sort"],
  [/\u6d3e\u9001\u8fd0\u8d39/g, "Delivery freight"],
  [/\u8d34\u6807/g, "Labeling"],
  [/\u5f20/g, "label"],
  [/\u5df2\u7ed3\u7b97/g, "Settled"],
  [/\u5f85\u7ed3\u7b97/g, "Pending Settlement"],
  [/\u5f85\u6d3e\u8f66/g, "Pending Dispatch"],
  [/\u5f85\u6d3e\u9001/g, "Pending Dispatch"],
  [/\u8fd0\u8f93\u4e2d/g, "In Transit"],
  [/\u5df2\u5230\u8fbe/g, "Delivered"],
  [/\u6682\u6263/g, "Hold"],
  [/\u6b63\u5e38/g, "Normal"],
  [/\u9884\u8b66/g, "Warning"],
  [/\u63a5\u8fd1\u6ee1\u8f7d/g, "Near Capacity"],
  [/\u5df2\u5b8c\u6210/g, "Completed"],
  [/\u5f02\u5e38/g, "Exception"],
  [/\u5df2\u6279\u51c6/g, "Approved"],
  [/\u5f85\u5ba1\u6838/g, "Pending Review"],
  [/\u5df2\u62d2\u7edd/g, "Rejected"],
  [/\u5df2\u7b7e\u6536/g, "Signed"],
  [/\u62d2\u6536/g, "Rejected"],
  [/\u5f85\u786e\u8ba4/g, "Pending"],
  [/\u6709\u6548/g, "Valid"],
  [/\u5373\u5c06\u5230\u671f/g, "Expiring Soon"],
  [/\u5df2\u8fc7\u671f/g, "Expired"],
  [/\u5546\u4e1a\u4fdd\u9669/g, "Commercial Insurance"],
  [/\u836f\u7269\u6d4b\u8bd5/g, "Drug Test"],
  [/\u8bc1\u4ef6\u5230\u671f\u7ba1\u7406/g, "Document Expiry"],
  [/\u5ba1\u8ba1\u65e5\u5fd7/g, "Audit Log"],
  [/\u5408\u89c4\u6e05\u5355/g, "Compliance Checklist"],
  [/\u5e74\u5ea6\u8fd0\u8425\u8d8b\u52bf/g, "Operations Trend"],
  [/\u4e1a\u52a1\u5355\u5143\u7ee9\u6548\u96f7\u8fbe/g, "BU Performance Radar"],
  [/\u70ed\u95e8\u8def\u7ebf\u7ee9\u6548/g, "Top Route Performance"],
  [/\u5ba2\u6237\u4ef7\u503c\u6392\u540d/g, "Customer Revenue Ranking"],
  [/\u6708\u5ea6/g, "Monthly"],
  [/\u5b63\u5ea6/g, "Quarterly"],
  [/\u5e74\u5ea6/g, "Annual"],
  [/\u8425\u6536/g, "Revenue"],
  [/\u8ba2\u5355\u6570/g, "Orders"],
  [/\u51c6\u65f6/g, "On-Time"],
  [/\u6bdb\u5229/g, "Margin"],
  [/\u5355/g, "orders"],
  [/\u6392\u540d/g, "Rank"],
  [/\u5ba2\u6237\u540d\u79f0/g, "Customer"],
  [/\u7d2f\u8ba1/g, "Total"],
  [/\u540c\u6bd4\u589e\u957f/g, "YoY Growth"],
  [/\u5ba2\u6237\u5c42\u7ea7/g, "Customer Tier"],
  [/\u94c2\u91d1/g, "Platinum"],
  [/\u91d1\u724c/g, "Gold"],
  [/\u94f6\u724c/g, "Silver"],
  [/\u5927\u5361\u8f66|\u5927\u8f66/g, "Truck"],
  [/\u5c0f\u8d27\u8f66|\u5c0f\u8f66/g, "Van"],
  [/\u4e2d\u578b\u8d27\u8f66/g, "Cube Truck"],
  [/\u4f11\u606f/g, "Off Duty"],
  [/\u5f85\u547d/g, "Available"],
  [/\u65b0\u5efa\u8ba2\u5355/g, "New Order"],
  [/\u65b0\u589e\u53f8\u673a/g, "New Driver"],
  [/\u641c\u7d22\u8ba2\u5355\u3001\u5ba2\u6237\u3001\u53f8\u673a\.\.\./g, "Search orders, customers, drivers..."],
  [/\u82f1\u8bed/g, "English"],
  [/\u4e2d\u6587/g, "Chinese"],
  [/\u5168\u90e8/g, "All"],
  [/\u67dc\u53f7/g, "Container #"],
  [/\u64cd\u4f5c/g, "Operation"],
  [/\u76ee\u7684\u5730/g, "Destination"],
  [/\u989d\u5916\u8d39\u7528/g, "Extra Charges"],
  [/\u72b6\u6001/g, "Status"],
  [/\u5230\u8fbe/g, "Arrived"],
  [/\u6d3e\u9001/g, "Dispatched"],
  [/\u4ef6\u6570|\u5355\u4f4d/g, "Units"],
  [/\u6258\u76d8/g, "Pallets"],
  [/\u7ed3\u7b97/g, "Settle"],
  [/\u89e3\u9664/g, "Release"],
  [/\u590d\u5236/g, "Copy"],
  [/\u5de5\u5355/g, "Work Order"],
  [/\u5bfc\u51fa/g, "Export"],
  [/\u7f16\u8f91/g, "Edit"],
  [/\u4fdd\u5b58/g, "Save"],
  [/\u6dfb\u52a0/g, "Add"],
  [/\u5220\u9664/g, "Delete"],
  [/\u66f4\u65b0/g, "Update"],
  [/\u8be6\u60c5/g, "Detail"],
  [/\u67e5\u770b/g, "View"],
  [/\u8bf7\u9009\u62e9/g, "Select"],
];

const zhTextReplacements: Array<[RegExp, string]> = [
  [/Operations Dashboard/g, "\u8fd0\u8425\u63a7\u5236\u53f0"],
  [/Transport Orders/g, "\u8fd0\u8f93\u8ba2\u5355"],
  [/Live Tracking/g, "\u5728\u9014\u8ffd\u8e2a"],
  [/POD Management/g, "POD\u7ba1\u7406"],
  [/Driver Profiles/g, "\u53f8\u673a\u6863\u6848"],
  [/Partner Quotes/g, "\u5408\u4f5c\u65b9\u62a5\u4ef7"],
  [/Warehouse Utilization/g, "\u4ed3\u5e93\u4f7f\u7528\u7387"],
  [/Warehouse/g, "\u4ed3\u50a8\u7ba1\u7406"],
  [/Handling Fees/g, "\u64cd\u4f5c\u8d39\u7ba1\u7406"],
  [/Inventory Overview/g, "\u5e93\u5b58\u6982\u89c8"],
  [/Finance/g, "\u8d22\u52a1\u7ba1\u7406"],
  [/AR Invoices/g, "\u5e94\u6536\u53d1\u7968"],
  [/AP Payables/g, "\u5e94\u4ed8\u8d26\u6b3e"],
  [/Transfer Summary/g, "\u4e2d\u8f6c\u6c47\u603b"],
  [/Analytics/g, "\u4e1a\u52a1\u5206\u6790"],
  [/Compliance/g, "\u5408\u89c4\u5ba1\u8ba1"],
  [/System Settings/g, "\u7cfb\u7edf\u8bbe\u7f6e"],
  [/FBA Container Handling/g, "FBA\u67dc\u5b50\u64cd\u4f5c\u660e\u7ec6"],
  [/Weekly FBA Inbound \/ Outbound Trend/g, "\u672c\u5468FBA\u6536\u53d1\u4ef6\u8d8b\u52bf"],
  [/FBA Handling Fee Breakdown/g, "FBA\u64cd\u4f5c\u8d39\u6784\u6210"],
  [/Inbound Units/g, "\u5165\u5e93\u4ef6\u6570"],
  [/Outbound Units/g, "\u51fa\u5e93\u4ef6\u6570"],
  [/Active Containers/g, "\u6d3b\u8dc3\u67dc\u5b50"],
  [/Sort \+ Re-palletize/g, "\u5206\u8d27+\u4e8c\u6b21\u6253\u677f"],
  [/Sort \/ Palletize/g, "\u5206\u8d27\u6253\u677f"],
  [/Sort \+ Multi-FC Delivery/g, "\u5206\u8d27+\u591a\u4ed3\u6d3e\u9001"],
  [/Re-label \+ Sort/g, "\u6362\u6807+\u5206\u8d27"],
  [/Settled/g, "\u5df2\u7ed3\u7b97"],
  [/Pending Settlement/g, "\u5f85\u7ed3\u7b97"],
  [/Pending Dispatch/g, "\u5f85\u6d3e\u9001"],
  [/In Transit/g, "\u8fd0\u8f93\u4e2d"],
  [/Delivered/g, "\u5df2\u5230\u8fbe"],
  [/Normal/g, "\u6b63\u5e38"],
  [/Warning/g, "\u9884\u8b66"],
  [/Near Capacity/g, "\u63a5\u8fd1\u6ee1\u8f7d"],
  [/Approved/g, "\u5df2\u6279\u51c6"],
  [/Pending Review/g, "\u5f85\u5ba1\u6838"],
  [/Rejected/g, "\u5df2\u62d2\u7edd"],
  [/Valid/g, "\u6709\u6548"],
  [/Expiring Soon/g, "\u5373\u5c06\u5230\u671f"],
  [/Expired/g, "\u5df2\u8fc7\u671f"],
  [/Commercial Insurance/g, "\u5546\u4e1a\u4fdd\u9669"],
  [/Drug Test/g, "\u836f\u7269\u6d4b\u8bd5"],
  [/Document Expiry/g, "\u8bc1\u4ef6\u5230\u671f\u7ba1\u7406"],
  [/Audit Log/g, "\u5ba1\u8ba1\u65e5\u5fd7"],
  [/Compliance Checklist/g, "\u5408\u89c4\u6e05\u5355"],
  [/Operations Trend/g, "\u5e74\u5ea6\u8fd0\u8425\u8d8b\u52bf"],
  [/BU Performance Radar/g, "\u4e1a\u52a1\u5355\u5143\u7ee9\u6548\u96f7\u8fbe"],
  [/Top Route Performance/g, "\u70ed\u95e8\u8def\u7ebf\u7ee9\u6548"],
  [/Customer Revenue Ranking/g, "\u5ba2\u6237\u4ef7\u503c\u6392\u540d"],
  [/Monthly/g, "\u6708\u5ea6"],
  [/Quarterly/g, "\u5b63\u5ea6"],
  [/Annual/g, "\u5e74\u5ea6"],
  [/Revenue/g, "\u8425\u6536"],
  [/Orders/g, "\u8ba2\u5355\u6570"],
  [/On-Time/g, "\u51c6\u65f6"],
  [/Margin/g, "\u6bdb\u5229"],
  [/Rank/g, "\u6392\u540d"],
  [/Customer Tier/g, "\u5ba2\u6237\u5c42\u7ea7"],
  [/Customer/g, "\u5ba2\u6237"],
  [/Platinum/g, "\u94c2\u91d1"],
  [/Gold/g, "\u91d1\u724c"],
  [/Silver/g, "\u94f6\u724c"],
  [/New Order/g, "\u65b0\u5efa\u8ba2\u5355"],
  [/New Driver/g, "\u65b0\u589e\u53f8\u673a"],
  [/Search orders, customers, drivers\.\.\./g, "\u641c\u7d22\u8ba2\u5355\u3001\u5ba2\u6237\u3001\u53f8\u673a..."],
  [/English/g, "\u82f1\u8bed"],
  [/Chinese/g, "\u4e2d\u6587"],
  [/All/g, "\u5168\u90e8"],
  [/Container #/g, "\u67dc\u53f7"],
  [/Operation/g, "\u64cd\u4f5c"],
  [/Destination/g, "\u76ee\u7684\u5730"],
  [/Extra Charges/g, "\u989d\u5916\u8d39\u7528"],
  [/Status/g, "\u72b6\u6001"],
  [/Arrived/g, "\u5230\u8fbe"],
  [/Dispatched/g, "\u6d3e\u9001"],
  [/Units/g, "\u4ef6\u6570"],
  [/Pallets/g, "\u6258\u76d8"],
  [/Settle/g, "\u7ed3\u7b97"],
  [/Release/g, "\u89e3\u9664"],
  [/Copy/g, "\u590d\u5236"],
  [/Work Order/g, "\u5de5\u5355"],
  [/Export/g, "\u5bfc\u51fa"],
  [/Edit/g, "\u7f16\u8f91"],
  [/Save/g, "\u4fdd\u5b58"],
  [/Add/g, "\u6dfb\u52a0"],
  [/Delete/g, "\u5220\u9664"],
  [/Update/g, "\u66f4\u65b0"],
  [/Detail/g, "\u8be6\u60c5"],
  [/View/g, "\u67e5\u770b"],
  [/Select/g, "\u8bf7\u9009\u62e9"],
];

const cjkPattern = /\p{Script=Han}+/gu;

function applyTextReplacements(value: string, replacements: Array<[RegExp, string]>) {
  return replacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

export function localizeText(value: string, language: AppLanguage) {
  const translated = applyTextReplacements(value, language === "en" ? enTextReplacements : zhTextReplacements);
  if (language === "en") {
    return translated
      .replace(/FBA Container Handling\s+FBA Container Handling/g, "FBA Container Handling")
      .replace(/Inbound Units\s+Inbound Units/g, "Inbound Units")
      .replace(/Outbound Units\s+Outbound Units/g, "Outbound Units")
      .replace(/Utilization\s+Utilization/g, "Utilization")
      .replace(/Active Containers\s+Active Containers/g, "Active Containers")
      .replace(/Weekly FBA Inbound \/ Outbound Trend\s+Weekly FBA Inbound \/ Outbound/g, "Weekly FBA Inbound / Outbound")
      .replace(/Warehouse Utilization\s+GTA Warehouse Zone Utilization/g, "GTA Warehouse Zone Utilization")
      .replace(cjkPattern, "")
      .replace(/\s+([,.:;%])/g, "$1")
      .replace(/\s{2,}/g, " ")
      .trimStart();
  }
  return translated;
}

export function installLanguageDomSanitizer(language: AppLanguage) {
  if (typeof document === "undefined") return () => undefined;

  const root = document.getElementById("root");
  if (!root) return () => undefined;

  const originalText = new WeakMap<Text, string>();
  let mutating = false;

  const sanitizeTextNode = (node: Text) => {
    const original = originalText.get(node) ?? node.nodeValue ?? "";
    if (!originalText.has(node)) originalText.set(node, original);
    const next = localizeText(original, language);
    if (node.nodeValue !== next) node.nodeValue = next;
  };

  const sanitizeAttributes = (element: Element) => {
    ["placeholder", "title", "aria-label"].forEach((attr) => {
      const current = element.getAttribute(attr);
      if (!current) return;
      const dataAttr = `data-i18n-original-${attr}`;
      const original = element.getAttribute(dataAttr) ?? current;
      if (!element.hasAttribute(dataAttr)) element.setAttribute(dataAttr, original);
      const next = localizeText(original, language);
      if (current !== next) element.setAttribute(attr, next);
    });
  };

  const sanitize = (target: Node) => {
    if (target.nodeType === Node.TEXT_NODE) {
      sanitizeTextNode(target as Text);
      return;
    }
    if (target.nodeType !== Node.ELEMENT_NODE) return;
    const element = target as Element;
    if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(element.tagName)) return;
    sanitizeAttributes(element);
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();
    while (node) {
      if (node.nodeType === Node.TEXT_NODE) sanitizeTextNode(node as Text);
      if (node.nodeType === Node.ELEMENT_NODE) sanitizeAttributes(node as Element);
      node = walker.nextNode();
    }
  };

  const run = () => {
    mutating = true;
    sanitize(root);
    mutating = false;
  };

  run();
  const observer = new MutationObserver((mutations) => {
    if (mutating) return;
    mutating = true;
    mutations.forEach((mutation) => {
      if (mutation.type === "characterData") {
        originalText.set(mutation.target as Text, mutation.target.nodeValue ?? "");
      }
      if (mutation.type === "attributes" && mutation.attributeName) {
        const element = mutation.target as Element;
        const current = element.getAttribute(mutation.attributeName);
        if (current) element.setAttribute(`data-i18n-original-${mutation.attributeName}`, current);
      }
      mutation.addedNodes.forEach(sanitize);
      if (mutation.type === "characterData") sanitize(mutation.target);
      if (mutation.type === "attributes") sanitize(mutation.target);
    });
    queueMicrotask(() => {
      mutating = false;
    });
  });
  observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["placeholder", "title", "aria-label"] });

  return () => observer.disconnect();
}

export function orderStatusLabel(status: string, language: AppLanguage) {
  const labels: Record<string, { zh: string; en: string }> = {
    "全部": { zh: "全部", en: "All" },
    "已完成": { zh: "已完成", en: "Delivered" },
    "运输中": { zh: "运输中", en: "In Transit" },
    "待派送": { zh: "待派送", en: "Pending" },
    "异常": { zh: "异常", en: "Exception" },
  };
  return pick(language, labels[status]?.zh ?? status, labels[status]?.en ?? status);
}

export function podLabel(pod: string, language: AppLanguage) {
  const labels: Record<string, { zh: string; en: string }> = {
    "已签收": { zh: "已签收", en: "Signed" },
    "待确认": { zh: "待确认", en: "Pending" },
    "争议中": { zh: "争议中", en: "Disputed" },
  };
  return pick(language, labels[pod]?.zh ?? pod, labels[pod]?.en ?? pod);
}
