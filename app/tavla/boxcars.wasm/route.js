// Tavla oyun dosyasını (27MB wasm) tarayıcının desteğine göre brotli/gzip sıkıştırılmış servis eder.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-static";

const ASSET = join(process.cwd(), "assets", "boxcars.wasm");

export async function GET(req) {
  const accepted = req.headers.get("accept-encoding") ?? "";
  let path = ASSET;
  let encoding = null;
  if (accepted.includes("br") && existsSync(ASSET + ".br")) {
    path = ASSET + ".br";
    encoding = "br";
  } else if (accepted.includes("gzip") && existsSync(ASSET + ".gz")) {
    path = ASSET + ".gz";
    encoding = "gzip";
  }
  const body = readFileSync(path);
  return new Response(body, {
    headers: {
      "Content-Type": "application/wasm",
      ...(encoding ? { "Content-Encoding": encoding } : {}),
      "Cache-Control": "public, max-age=31536000, immutable",
      Vary: "Accept-Encoding",
    },
  });
}
