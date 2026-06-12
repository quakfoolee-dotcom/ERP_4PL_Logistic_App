import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = ["src", "README.md", "package.json", "vite.config.ts"];
const forbidden = [
  { pattern: /\bprompt\s*\(/, label: "browser prompt()" },
  { pattern: /\bconfirm\s*\(/, label: "browser confirm()" },
  { pattern: /TRN-2025|亿联供应链|盛达贸易|¥|上海|广州|深圳|北京|武汉|成都|天津|西安|杭州|重庆/, label: "stale China/yuan demo data" },
  { pattern: /Ã|�/, label: "mojibake marker" },
];

function files(path) {
  const stat = statSync(path);
  if (stat.isFile()) return [path];
  return readdirSync(path).flatMap((name) => files(join(path, name)));
}

const checked = roots.flatMap(files).filter((file) => /\.(tsx?|jsx?|css|md|json)$/.test(file));
const failures = [];

for (const file of checked) {
  const text = readFileSync(file, "utf8");
  for (const rule of forbidden) {
    if (rule.pattern.test(text)) failures.push(`${file}: ${rule.label}`);
  }
}

if (failures.length) {
  console.error("Source verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Source verification passed (${checked.length} files checked).`);
