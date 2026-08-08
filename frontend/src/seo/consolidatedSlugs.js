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
 */
export const CONSOLIDATED_SLUGS = [
  'why-surfers-in-santa-cruz-should-lift-weights',
  'how-many-days-a-week-should-you-lift',
];

export const withoutConsolidated = (posts = []) =>
  posts.filter((post) => !CONSOLIDATED_SLUGS.includes(post?.slug));
