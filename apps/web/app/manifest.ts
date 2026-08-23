import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EduFix - Quản lý thiết bị",
    short_name: "EduFix",
    description: "Báo sự cố và quản lý bảo trì thiết bị trường học",
    start_url: "/login",
    display: "standalone",
    background_color: "#f4f7fb",
    theme_color: "#152b52",
    lang: "vi",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
