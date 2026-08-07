import { existsSync } from "node:fs";
import { join } from "node:path";

// Genel site logosu: FIBA Oyunları grafiti amblemi (şeffaf PNG)
const CANDIDATES = [
  ["fibaoyunlari-logo.png", "/fibaoyunlari-logo.png"],
  ["logo.png", "/logo.png"],
];

export function brandLogoPath() {
  for (const [file, url] of CANDIDATES) {
    if (existsSync(join(process.cwd(), "public", file))) return url;
  }
  return null;
}
