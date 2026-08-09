import React from 'react';
import BlueprintIcon from './BlueprintIcon';

/**
 * The cover an article gets when it has no photograph.
 *
 * The tempting fix is a generated gym scene, and that is exactly the
 * thing this project will not publish: an invented photograph of a real
 * business, presented as its room. The other common fix, a grey box
 * with the brand name in it, is what this replaces.
 *
 * So a coverless article gets a drawn one: the category sets the
 * equipment mark and the field colour, the title is set in the display
 * face, and a blueprint grid sits behind both. It is built from HTML,
 * CSS and SVG, so it is crisp on any screen, costs no image request,
 * and cannot become a source of a fact nobody has checked.
 *
 * The mapping is deterministic. The same category always produces the
 * same cover, so the index does not reshuffle its own colours between
 * two loads of the same page.
 */

const BY_CATEGORY = {
  'Getting Started':   { icon: 'first-timer',      tone: 'mint' },
  'Strength Science':  { icon: 'plate',            tone: 'cream' },
  'Training Tips':     { icon: 'own-program',      tone: 'sand' },
  'Gym Culture':       { icon: 'building',         tone: 'forest' },
  'Outdoor Athletes':  { icon: 'open-floor',       tone: 'mint' },
  'Strength Guides':   { icon: 'competitor',       tone: 'cream' },
  'Strength Training': { icon: 'rack',             tone: 'forest' },
  'Equipment':         { icon: 'general-strength', tone: 'sand' },
  'Nutrition':         { icon: 'plate',            tone: 'mint' },
};

const FALLBACK = { icon: 'rack', tone: 'cream' };

export default function BlogCover({ category, title, size = 'default' }) {
  const { icon, tone } = BY_CATEGORY[category] || FALLBACK;
  const dark = tone === 'forest';
  const large = size === 'large';

  return (
    <div
      className={`scs-cover scs-cover-${tone}`}
      style={{ color: dark ? 'var(--scs-mint)' : 'var(--scs-forest)' }}
      aria-hidden="true"
    >
      <div className="absolute inset-0 flex flex-col justify-between p-5 sm:p-6">
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: dark ? 'var(--scs-mint)' : 'var(--scs-forest)' }}
        >
          {category}
        </span>

        <div className="flex items-end justify-between gap-4">
          <span
            className="font-display leading-none"
            style={{
              color: dark ? 'var(--scs-white)' : 'var(--scs-ink)',
              fontSize: large ? 'clamp(1.5rem, 3vw, 2.25rem)' : '1.125rem',
              maxWidth: '62%',
            }}
          >
            {title}
          </span>
          <BlueprintIcon
            name={icon}
            size={large ? 128 : 72}
            className={dark ? 'scs-blueprint-light shrink-0' : 'shrink-0'}
          />
        </div>
      </div>
    </div>
  );
}
