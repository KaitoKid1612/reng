import type { MetadataRoute } from "next";

// Installing Reng to the home screen opens it like an app; on iPhone and iPad that is also what
// lets the site show study reminders (Settings › Nhắc học).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Reng – Lớp học online",
    short_name: "Reng",
    description: "Lớp học online cho giáo viên và học viên: bài học, bài tập tự chấm và nhắc học.",
    lang: "vi",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#faf8f3",
    theme_color: "#2b4c7e",
    icons: [
      { src: "/app-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/app-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
