"use client";
// Saatler izleyenin tarayıcısında, kendi saat diliminde gösterilir.
// (Sunucu UTC'de çalıştığı için sunucuda formatlamak saatleri kaydırıyordu;
// ayrıca şartname gereği her ülke kendi yerel saatini görmeli.)
import { useEffect, useState } from "react";

export function LocalTime({ iso, locale, dateStyle = "medium", timeStyle = "short" }) {
  const [text, setText] = useState("");
  useEffect(() => {
    if (iso) setText(new Date(iso).toLocaleString(locale, { dateStyle, timeStyle }));
  }, [iso, locale, dateStyle, timeStyle]);
  return <span suppressHydrationWarning>{text || "…"}</span>;
}
