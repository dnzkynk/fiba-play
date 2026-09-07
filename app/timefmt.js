"use client";
// Tüm saatler GMT (UTC) olarak gösterilir. Turnuva uluslararası olduğu için tek bir
// referans saat kullanılıyor; program da GMT üzerinden duyuruluyor (Türkiye'den 3 saat geride).
// (Sunucuda formatlamak saatleri kaydırdığı için biçimlendirme tarayıcıda yapılıyor.)
import { useEffect, useState } from "react";

export function GmtTime({ iso, locale, dateStyle = "medium", timeStyle = "short", suffix = "" }) {
  const [text, setText] = useState("");
  useEffect(() => {
    if (iso) setText(new Date(iso).toLocaleString(locale, { dateStyle, timeStyle, timeZone: "UTC" }));
  }, [iso, locale, dateStyle, timeStyle]);
  return <span suppressHydrationWarning>{text ? text + suffix : "…"}</span>;
}

// <input type="datetime-local"> değerleri de GMT okunup yazılır: kutuya girilen 12:00
// doğrudan 12:00 GMT demektir, yöneticinin tarayıcı saat dilimi hesaba katılmaz.
export function toGmtInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d) ? "" : d.toISOString().slice(0, 16);
}

export function fromGmtInput(value) {
  if (!value) return null;
  const d = new Date(`${value}Z`);
  return isNaN(d) ? null : d.toISOString();
}
