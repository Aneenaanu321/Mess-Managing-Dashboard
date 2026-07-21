import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ibTech — Sales Operation Managing Dashboard",
    short_name: "RFIDCore",
    description: "RFID sales, delivery, and support operations — usable offline in the field.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#38a169",
    icons: [
      { src: "/favicon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/favicon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
    ],
  };
}
