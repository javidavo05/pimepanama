import { cache } from "react";

import { staticContent } from "./static-content";
import { getStaticPortfolioItems } from "./static-portfolio-data";

// Option B: the public homepage is fully static — no database required.
// Edit src/lib/static-content.ts (and static-portfolio-data.ts) and deploy
// with `git push`. The DB is no longer read for the landing page.
export const getLandingContent = cache(async () => {
  return { ...staticContent, portfolio: getStaticPortfolioItems() };
});
