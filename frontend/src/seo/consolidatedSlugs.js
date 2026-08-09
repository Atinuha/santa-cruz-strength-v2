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
 *   why-surfers-in-santa-cruz-should-lift-weights stays, as a canonical rather
 *   than a redirect. The replacement does supersede it, covering every heading
 *   it has and adding injury prevention and an FAQ, 638 words against 391, same
 *   category and same tags. A 301 was added on that finding and then removed:
 *   this is one of the seven articles the owner actually published, and a
 *   redirect takes it off the site. The canonical consolidates the search
 *   signals either way, and a reader who follows an old link still gets his
 *   article rather than being bounced somewhere else.
 *
 *   how-many-days-a-week-should-you-lift is not on this list and must not be.
 *   It is one of the seven articles the owner actually published, it is live and
 *   indexed, and it holds the broad query. It was briefly canonicalised away to
 *   a beginner-scoped slug and then briefly overwritten by that article's body,
 *   which was a deletion of his words wearing a consolidation's clothes. Both
 *   articles are separate indexable pages now. They do overlap, and that is an
 *   editorial question for him.
 */
export const CONSOLIDATED_SLUGS = [
  'why-surfers-in-santa-cruz-should-lift-weights',
];

export const withoutConsolidated = (posts = []) =>
  posts.filter((post) => !CONSOLIDATED_SLUGS.includes(post?.slug));
