import React from 'react';

/**
 * The stand-in for a coach with no photograph.
 *
 * The two obvious options are both forbidden here. A grey silhouette
 * icon says the person is a placeholder, which is untrue and reads as
 * an unfinished site. A generated portrait invents a face for a real
 * employee, which is the worst thing this project could publish.
 *
 * So a coach without a photograph gets a plate: their own initials,
 * set in the display face, inside the ring geometry taken from the
 * seal. It looks deliberate because it is, and it says exactly as much
 * as the business has confirmed about that person and no more.
 *
 * Shared by the personal training page and the about page so the coach
 * card system is one system rather than two that drift.
 */
export default function CoachPlate({ name, tone = 'deep' }) {
  const initials = (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const dark = tone === 'deep';

  return (
    <div
      className="w-full h-full aspect-square grid place-items-center relative"
      style={{ background: dark ? 'var(--scs-forest-deep)' : 'var(--scs-mint)' }}
    >
      <span
        className="absolute inset-[12%] rounded-full"
        style={{ border: `1.5px solid ${dark ? 'rgba(205,234,224,0.35)' : 'rgba(14,93,62,0.35)'}` }}
        aria-hidden="true"
      />
      <span
        className="font-display text-4xl"
        style={{ color: dark ? 'var(--scs-mint)' : 'var(--scs-forest)' }}
        aria-hidden="true"
      >
        {initials}
      </span>
    </div>
  );
}
