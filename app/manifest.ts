import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cartfull",
    short_name: "Cartfull",
    description: "A week of meals that fits your grocery budget, with a priced grocery list.",
    start_url: "/app/list?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0b0d",
    theme_color: "#0a0b0d",
    lang: "en-US",
    categories: ["food", "shopping", "finance"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Grocery list", url: "/app/list" },
      { name: "This week", url: "/app/plan" },
    ],
  };
}
