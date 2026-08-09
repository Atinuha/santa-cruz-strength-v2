/**
 * Articles that were consolidated into another article and now canonicalise to it.
 *
 * They stay reachable by URL so the canonical can be read, and they carry
 * index,follow deliberately: a noindex on a cross canonical page throws the
 * consolidation away rather than passing it on.
 *
 * The rule that makes the consolidation hold is that the site links to them
 * nowhere. A canonical pointing one way while the site's own navigation keeps
 * handing Google a link the other way is a contradiction Google resolves on its
 * own terms, not ours.
 *
 * This list lived inside Blog.js and was applied to one of its two render
 * branches. The category tabs used the unfiltered list, so every tab that
 * contained one re-linked it, and the homepage never filtered at all. One
 * exported list, imported by every surface that renders article links.
 *
 * Two entries became one after review.
 *
 *   why-surfers-in-santa-cruz-should-lift-weights stays. The replacement covers
 *   every heading it has and adds injury prevention and an FAQ, 638 words
 *   against 391, same category and same tags. It genuinely supersedes it, so a
 *   301 now sits in front of this URL in every host config under deploy/. This
 *   entry remains as the fallback: if the redirect is ever missing, the page
 *   degrades to a cross canonical rather than a 404 on a live indexed URL.
 *
 *   how-many-days-a-week-should-you-lift is gone from this list, and the
 *   direction of that consolidation was wrong. It is the live, indexed URL and
 *   it holds the broad query, and it was canonicalising away to a
 *   beginner-scoped slug that had never been live. A review found the two
 *   substantially duplicative, four of five headings mapping one to one, so
 *   rather than keeping both, the longer article moved onto this URL and the
 *   beginner slug was retired. One URL, the broad intent, the better body.
 */
export const CONSOLIDATED_SLUGS = [
  'why-surfers-in-santa-cruz-should-lift-weights',
];

export const withoutConsolidated = (posts = []) =>
  posts.filter((post) => !CONSOLIDATED_SLUGS.includes(post?.slug));
