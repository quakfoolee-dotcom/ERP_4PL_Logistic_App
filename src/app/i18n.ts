export type AppLanguage = "zh" | "en";

export function pick(language: AppLanguage, zh: string, en: string) {
  return language === "en" ? en : zh;
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
