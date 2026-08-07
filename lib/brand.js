import { existsSync } from "node:fs";
import { join } from "node:path";

// Genel site logosu: Fiba kurumsal SVG (public/brand-logo.svg)
const CANDIDATES = [
  ["brand-logo.svg", "/brand-logo.svg"],
  ["logo.png", "/logo.png"],
];

export function brandLogoPath() {
  for (const [file, url] of CANDIDATES) {
    if (existsSync(join(process.cwd(), "public", file))) return url;
  }
  return null;
}
