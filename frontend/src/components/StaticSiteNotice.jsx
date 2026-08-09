/**
 * The standing warning that publishing is not the same as being live.
 *
 * The public pages of this site are prerendered to static HTML at build time,
 * which is what put the copy and the article bodies into the first response
 * rather than behind a fetch. The cost of that is a gap nobody would guess at
 * from inside a CRM: saving here changes the database, and the served HTML is
 * a photograph of the database taken when the site was last built.
 *
 * Without this notice the failure is silent and confidently wrong. A price is
 * corrected, the CRM shows the new price, the site keeps serving the old one,
 * and the structured data keeps asserting the old one to Google. Nothing looks
 * broken, so nobody investigates.
 *
 * The backend fires a deploy hook on every public content write when
 * ALLOW_DEPLOY_HOOK and DEPLOY_HOOK_URL are set. This is the documented
 * fallback for when they are not, and it stays visible either way, because a
 * hook that silently stopped firing would otherwise look exactly like a hook
 * that is working.
 */
export default function StaticSiteNotice({ surface = 'this content' }) {
  return (
    <div
      role="note"
      data-testid="static-site-notice"
      style={{
        background: 'rgba(165,84,56,0.08)',
        border: '1px solid rgba(165,84,56,0.35)',
        borderRadius: 'var(--scs-radius, 4px)',
        padding: '0.75rem 1rem',
        marginBottom: '1rem',
        fontSize: '0.8125rem',
        lineHeight: 1.55,
      }}
    >
      <strong style={{ display: 'block', marginBottom: '0.15rem' }}>
        Saving is not publishing.
      </strong>
      The public site is built as static pages, so changes to {surface} appear
      on santacruzstrength.com after the next site build, not immediately. If a
      change is urgent, ask for a rebuild once you have finished editing.
    </div>
  );
}
