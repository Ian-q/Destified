// Canonical site facts shared by metadata, robots, sitemap, OG image and JSON-LD.
// Override the URL per environment with NEXT_PUBLIC_SITE_URL if needed.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://destified.com").replace(/\/$/, "");

export const SITE_NAME = "Destified";

export const SITE_TITLE = "Destified — get more from your points, cards and memberships";

export const SITE_DESCRIPTION =
  "Destified organizes the travel perks you already hold — credit card points, airline miles and memberships — and shows the best way to use them for your next trip, alongside your itinerary, route map and pre-flight checklists.";

// Signed-in app routes. They redirect to /login for crawlers, so keep them out of search.
export const PRIVATE_PATHS = ["/organizer", "/compare", "/profile", "/onboarding", "/login"];

// Only the production deployment should be indexed; Vercel previews must not compete with it.
export const isIndexable = (): boolean =>
  process.env.VERCEL_ENV ? process.env.VERCEL_ENV === "production" : process.env.NODE_ENV === "production";
