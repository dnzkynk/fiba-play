"use client";
// Canlı destek balonu (tawk.to). Yalnız NEXT_PUBLIC_TAWK_SRC tanımlıysa yüklenir;
// tanımlı değilse siteye hiçbir üçüncü taraf isteği gitmez.
import Script from "next/script";

export function LiveChat() {
  const src = process.env.NEXT_PUBLIC_TAWK_SRC;
  if (!src) return null;
  return (
    <Script id="tawk" strategy="lazyOnload">{`
      var Tawk_API=Tawk_API||{},Tawk_LoadStart=new Date();
      (function(){
        var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
        s1.async=true; s1.src=${JSON.stringify(src)};
        s1.charset="UTF-8";
        // Not: tawk'ın hazır kodundaki crossorigin="*" geçersiz bir değer; tarayıcı
        // isteği CORS moduna alıyor ve tawk sunucusu Origin gelince ACAO dönmediği
        // için script bloklanıyor. Öznitelik olmadan klasik script gibi yükleniyor.
        s0.parentNode.insertBefore(s1,s0);
      })();
    `}</Script>
  );
}
