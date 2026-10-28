import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pocha Menu Check",
    short_name: "Pocha Check",
    description: "Snap a Korean street-food menu board and see which dishes likely fit your diet.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#c2410c",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
