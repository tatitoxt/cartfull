import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

const appPaths = ["/app/", "/api/", "/auth/", "/login", "/offline"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: appPaths },
      // Answer and generative engines: explicitly welcome them to the public pages.
      { userAgent: "GPTBot", allow: "/", disallow: appPaths },
      { userAgent: "OAI-SearchBot", allow: "/", disallow: appPaths },
      { userAgent: "ChatGPT-User", allow: "/", disallow: appPaths },
      { userAgent: "ClaudeBot", allow: "/", disallow: appPaths },
      { userAgent: "Claude-User", allow: "/", disallow: appPaths },
      { userAgent: "PerplexityBot", allow: "/", disallow: appPaths },
      { userAgent: "Google-Extended", allow: "/", disallow: appPaths },
      { userAgent: "Applebot-Extended", allow: "/", disallow: appPaths },
      { userAgent: "meta-externalagent", allow: "/", disallow: appPaths },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
