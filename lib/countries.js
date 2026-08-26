// Paylaşılan ülke kodu listesi + bayrak üretimi. Sunucu ve istemci tarafında
// aynı liste kullanılır — ülke isim yerine ISO kod olarak saklanır ki bayrak
// güvenilir üretilebilsin ve dile göre isim gösterimi tutarlı olsun.
export const COUNTRY_CODES = "AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KP KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VC VE VN VU WS XK YE ZA ZM ZW".split(" ");

// ISO 3166-1 alpha-2 kod -> bayrak emoji (sunucu bileşenlerinde de çalışır, DOM'a bağımlı değil)
export function flagOf(code) {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

// Kod -> okunabilir isim (izleyenin dilinde; İngilizce varsayılan)
export function countryName(code, lang = "en") {
  if (!code) return "";
  try {
    return new Intl.DisplayNames([lang === "tr" ? "tr" : "en"], { type: "region" }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}
