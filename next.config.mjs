/** @type {import('next').NextConfig} */
const nextConfig = {
  // Teknoloji/sürüm sızıntısını kapat
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // MIME sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Referrer sızıntısı
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Gereksiz tarayıcı yetkileri kapalı
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb()" },
          // HTTPS zorunluluğu (alan adı bağlanınca etkili olur; HTTP'de tarayıcı yok sayar)
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          // İçerik güvenlik politikası: kendi kaynaklarımız + Lichess'e yönlendirme.
          // Next.js çalışma zamanı inline script/style kullandığı için o ikisi gerekli.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://lichess.org wss: ws:",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "object-src 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
