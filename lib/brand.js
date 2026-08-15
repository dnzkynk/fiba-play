import { existsSync } from "node:fs";
import { join } from "node:path";

// Genel site logosu: Fiba Games kurumsal görseli (beyaz zeminli)
const CANDIDATES = [
  ["logo.png", "/logo.png"],
  ["fibaoyunlari-logo.png", "/fibaoyunlari-logo.png"],
];

export function brandLogoPath() {
  for (const [file, url] of CANDIDATES) {
    if (existsSync(join(process.cwd(), "public", file))) return url;
  }
  return null;
}
