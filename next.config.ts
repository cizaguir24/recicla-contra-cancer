import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        // El buscador público pide la ubicación de quien lo abre (botón
        // "Mi ubicación") para mostrar el centro de acopio más cercano.
        // Una entrada posterior para la misma ruta pisa el valor de arriba
        // (ver "Header Overriding Behavior" en la documentación de
        // next.config.js) — el resto de la app sigue sin poder pedirla.
        source: "/publico/:path*",
        headers: [
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
