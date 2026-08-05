// boxcars.wasm'ı brotli + gzip olarak önceden sıkıştırır (build sırasında çalışır).
import { readFileSync, writeFileSync } from "node:fs";
import { brotliCompressSync, gzipSync, constants } from "node:zlib";

const src = "assets/boxcars.wasm";
const raw = readFileSync(src);
writeFileSync(src + ".br", brotliCompressSync(raw, {
  params: { [constants.BROTLI_PARAM_QUALITY]: 9, [constants.BROTLI_PARAM_SIZE_HINT]: raw.length },
}));
writeFileSync(src + ".gz", gzipSync(raw, { level: 9 }));
console.log(`wasm sıkıştırıldı: ${(raw.length / 1e6).toFixed(1)}MB → br ${(readFileSync(src + ".br").length / 1e6).toFixed(1)}MB, gz ${(readFileSync(src + ".gz").length / 1e6).toFixed(1)}MB`);
