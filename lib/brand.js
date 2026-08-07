import { existsSync } from "node:fs";
import { join } from "node:path";

// Genel site logosu: FIBA Oyunları etkinlik logosu (siyah zeminli, geniş)
const CANDIDATES = [
  ["fibaoyunları-logo.jpeg", "/fibaoyunlar%C4%B1-logo.jpeg"],
  ["brand-logo.svg", "/brand-logo.svg"],
  ["logo.png", "/logo.png"],
];

export function brandLogoPath() {
  for (const [file, url] of CANDIDATES) {
    if (existsSync(join(process.cwd(), "public", file))) return url;
  }
  return null;
}
