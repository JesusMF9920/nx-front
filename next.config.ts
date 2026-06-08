import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundle autocontenido para desplegar sin instalar deps ni construir en el
  // droplet: el build se hace en CI y se envía .next/standalone al servidor.
  output: "standalone",
};

export default nextConfig;
