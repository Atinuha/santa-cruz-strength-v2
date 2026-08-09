import React from 'react';

/**
 * The SCS Equipment Blueprint set.
 *
 * These are drawn rather than installed. A generic fitness icon pack
 * gives every gym on the internet the same dumbbell, and the one thing
 * this site has to prove is that it is a specific room in Santa Cruz.
 * So each mark is an elevation of equipment this floor actually holds:
 * a rack with its hole rhythm, a bar on J-cups, a competition plate and
 * collar, a platform edge. Technical line drawing, one stroke weight,
 * forest by default and mint on a dark field, no fill, no gradient, no
 * cartoon athlete.
 *
 * Two rules govern what may be drawn:
 *
 *   A drawing is a claim. The strongman mark is deliberately a bar on
 *   an open floor with lane markings rather than a yoke, a stone or a
 *   log, because the equipment inventory for this gym has not been
 *   verified and an icon that shows a yoke asserts the gym owns one.
 *
 *   A drawing is decoration unless it carries meaning the text does
 *   not. Every icon here sits beside a heading that already says what
 *   it says, so the default is aria-hidden. Pass a `title` only where
 *   the mark is genuinely the only label, and it becomes an img with
 *   an accessible name instead.
 */

const S = { fill: 'none' };

const SHAPES = {
  /* Unloaded bar resting on rack pins with one bumper plate standing by.
     Beginning, readiness, nothing loaded yet. */
  'first-timer': (
    <>
      <line x1="12" y1="12" x2="12" y2="41" />
      <line x1="30" y1="12" x2="30" y2="41" />
      <line x1="7" y1="41" x2="17" y2="41" />
      <line x1="25" y1="41" x2="35" y2="41" />
      <circle cx="12" cy="17" r="1" />
      <circle cx="12" cy="23" r="1" />
      <circle cx="30" cy="17" r="1" />
      <circle cx="30" cy="23" r="1" />
      <line x1="5" y1="20" x2="37" y2="20" />
      <circle cx="41" cy="33" r="7" />
      <circle cx="41" cy="33" r="2.4" />
    </>
  ),

  /* A written program sheet crossed by a bar. I already have my plan,
     give me the floor and the equipment to run it. */
  'own-program': (
    <>
      <rect x="9" y="8" width="21" height="27" />
      <line x1="13" y1="15" x2="26" y2="15" />
      <line x1="13" y1="20" x2="26" y2="20" />
      <line x1="13" y1="25" x2="22" y2="25" />
      <line x1="4" y1="40" x2="44" y2="40" />
      <rect x="6" y="36" width="3" height="8" />
      <rect x="39" y="36" width="3" height="8" />
      <line x1="33" y1="12" x2="42" y2="12" />
      <line x1="33" y1="17" x2="42" y2="17" />
    </>
  ),

  /* Competition plate, collar, rack upright, platform line.
     Specificity and competition standards. */
  'competitor': (
    <>
      <circle cx="18" cy="22" r="13" />
      <circle cx="18" cy="22" r="4.5" />
      <line x1="18" y1="22" x2="44" y2="22" />
      <rect x="33" y="18" width="5" height="8" />
      <line x1="42" y1="8" x2="42" y2="36" />
      <line x1="5" y1="42" x2="43" y2="42" />
      <line x1="5" y1="42" x2="5" y2="38" />
    </>
  ),

  /* Front elevation of a competition rack: uprights with the hole
     rhythm, bar on the J-cups, bench line at the base. Powerlifting. */
  'rack': (
    <>
      <line x1="10" y1="6" x2="10" y2="42" />
      <line x1="38" y1="6" x2="38" y2="42" />
      <line x1="5" y1="42" x2="15" y2="42" />
      <line x1="33" y1="42" x2="43" y2="42" />
      <circle cx="10" cy="12" r="1" />
      <circle cx="10" cy="18" r="1" />
      <circle cx="10" cy="24" r="1" />
      <circle cx="38" cy="12" r="1" />
      <circle cx="38" cy="18" r="1" />
      <circle cx="38" cy="24" r="1" />
      <line x1="4" y1="16" x2="44" y2="16" />
      <rect x="4" y="12" width="3" height="8" />
      <rect x="41" y="12" width="3" height="8" />
      <line x1="14" y1="34" x2="34" y2="34" />
      <line x1="17" y1="34" x2="17" y2="42" />
      <line x1="31" y1="34" x2="31" y2="42" />
    </>
  ),

  /* Loaded bar held over a platform with one restrained bar path.
     Olympic weightlifting. */
  'platform': (
    <>
      <rect x="5" y="36" width="38" height="7" />
      <line x1="9" y1="12" x2="39" y2="12" />
      <circle cx="14" cy="12" r="6" />
      <circle cx="34" cy="12" r="6" />
      <path d="M24 34 C 20 28, 20 22, 24 18" className="accent" />
    </>
  ),

  /* Open floor, a bar at ground level, lane markings. Deliberately
     not a yoke, a stone or a log: see the note at the top of this file. */
  'open-floor': (
    <>
      <line x1="4" y1="36" x2="44" y2="36" />
      <line x1="9" y1="26" x2="39" y2="26" />
      <rect x="10" y="20" width="4" height="12" />
      <rect x="34" y="20" width="4" height="12" />
      <line x1="8" y1="41" x2="18" y2="41" />
      <line x1="30" y1="41" x2="40" y2="41" />
    </>
  ),

  /* Bar, plate, adjustable bench and rack as one compact modular
     system. General strength training. */
  'general-strength': (
    <>
      <line x1="8" y1="8" x2="8" y2="38" />
      <line x1="19" y1="8" x2="19" y2="38" />
      <line x1="8" y1="14" x2="19" y2="14" />
      <line x1="4" y1="38" x2="23" y2="38" />
      <circle cx="32" cy="15" r="6" />
      <circle cx="32" cy="15" r="2" />
      <rect x="25" y="28" width="18" height="4" />
      <line x1="28" y1="32" x2="28" y2="38" />
      <line x1="40" y1="32" x2="40" y2="38" />
      <line x1="24" y1="38" x2="44" y2="38" />
    </>
  ),

  /* Training notebook and pencil. The first step is a question. */
  'inquiry': (
    <>
      <rect x="11" y="8" width="26" height="32" />
      <line x1="19" y1="8" x2="19" y2="40" />
      <line x1="24" y1="16" x2="32" y2="16" />
      <line x1="24" y1="22" x2="32" y2="22" />
      <line x1="24" y1="28" x2="29" y2="28" />
      <line x1="15" y1="4" x2="15" y2="12" className="accent" />
    </>
  ),

  /* A rack pin seated through the hole rhythm. Something clicks into
     place: a coach makes contact. */
  'contact': (
    <>
      <line x1="16" y1="6" x2="16" y2="42" />
      <line x1="28" y1="6" x2="28" y2="42" />
      <circle cx="16" cy="14" r="1.4" />
      <circle cx="16" cy="21" r="1.4" />
      <circle cx="16" cy="28" r="1.4" />
      <circle cx="28" cy="14" r="1.4" />
      <circle cx="28" cy="21" r="1.4" />
      <circle cx="28" cy="28" r="1.4" />
      <line x1="10" y1="21" x2="38" y2="21" className="accent" />
      <circle cx="38" cy="21" r="2.6" className="accent" />
    </>
  ),

  /* Platform corner and rack upright. You meet at the gym. */
  'meet-here': (
    <>
      <rect x="6" y="24" width="36" height="16" />
      <line x1="6" y1="30" x2="42" y2="30" />
      <line x1="14" y1="8" x2="14" y2="24" />
      <line x1="34" y1="8" x2="34" y2="24" />
      <line x1="10" y1="12" x2="38" y2="12" />
      <rect x="10" y="8" width="3" height="8" />
      <rect x="35" y="8" width="3" height="8" />
    </>
  ),

  /* Plate ring. The utility motif: counters, markers, milestones. */
  'plate': (
    <>
      <circle cx="24" cy="24" r="17" />
      <circle cx="24" cy="24" r="6" />
      <line x1="24" y1="7" x2="24" y2="11" />
      <line x1="24" y1="37" x2="24" y2="41" />
    </>
  ),

  /* Facility entrance and the wall seal. Used where the subject is
     the building rather than the training. */
  'building': (
    <>
      <polyline points="6,20 24,8 42,20" />
      <line x1="10" y1="20" x2="10" y2="42" />
      <line x1="38" y1="20" x2="38" y2="42" />
      <line x1="6" y1="42" x2="42" y2="42" />
      <rect x="20" y="30" width="8" height="12" />
      <circle cx="24" cy="22" r="4" className="accent" />
    </>
  ),
};

export const BLUEPRINT_NAMES = Object.keys(SHAPES);

export default function BlueprintIcon({
  name,
  size = 48,
  title,
  draw = false,
  className = '',
  strokeWidth,
  ...rest
}) {
  const shape = SHAPES[name];
  if (!shape) return null;

  const labelled = Boolean(title);
  const classes = ['scs-blueprint', draw ? 'scs-draw' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={classes}
      style={strokeWidth ? { ...S, strokeWidth } : S}
      role={labelled ? 'img' : undefined}
      aria-hidden={labelled ? undefined : 'true'}
      focusable="false"
      data-reveal={draw ? '' : undefined}
      {...rest}
    >
      {labelled && <title>{title}</title>}
      {shape}
    </svg>
  );
}
