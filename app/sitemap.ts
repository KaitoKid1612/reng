import { listPublicLessons } from "@/lib/lesson-repository";
import { PUBLIC_PAGES } from "@/lib/seo-routes";
import { absoluteUrl } from "@/lib/site";

import type { MetadataRoute } from "next";

// Public lessons change when teachers publish; an hourly refresh is enough for crawlers.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = PUBLIC_PAGES.map((page) => ({
    url: absoluteUrl(page.path),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
  try {
    const lessons = await listPublicLessons();
    return [
      ...pages,
      ...lessons.map((lesson) => ({
        url: absoluteUrl(`/lessons/${lesson.lessonId}`),
        lastModified: lesson.publishedAt,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    // A temporary database error must not hide the static pages from crawlers.
    return pages;
  }
}
