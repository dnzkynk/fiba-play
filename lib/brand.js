import { existsSync } from "node:fs";
import { join } from "node:path";

// public/brand-logo.svg veya .png koyulduğunda site otomatik kurumsal logoyu kullanır
export function brandLogoPath() {
  for (const f of ["brand-logo.svg", "brand-logo.png", "logo.svg", "logo.png"]) {
    if (existsSync(join(process.cwd(), "public", f))) return "/" + f;
  }
  return null;
}
