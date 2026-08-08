// The Coastal Interval, rhythm primitives.
//
// This direction argues that the page's pace is the argument, so the pace is
// built from named parts rather than from ad hoc padding. Three primitives:
//
//   Set   a group of content beats that arrive together.
//   Beat  one element inside a set.
//   Rest  the measured empty band between two sets. The signature move.
//
// Motion rules this file obeys, from the tournament brief and Taste v2 section
// 5. Every animation here has a one sentence justification recorded in
// README.md. No useState holds a continuous scroll or pointer value. Nothing
// listens to the scroll event. Everything is gated on prefers-reduced-motion,
// and with motion off the composition still carries the interval because the
// interval is built from spacing.

import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';

// Colour, computed rather than eyeballed.
//
// INK is charcoal at 76 percent over chalk, about 6.1:1, which clears WCAG AA
// for body text. The shipped stone #8E867A on chalk is about 2.8:1 and already
// fails, so it is kept here only for genuinely secondary metadata and never for
// reading copy. ON_DARK is chalk at 72 percent over carbon, about 7:1.
export const INK = 'rgba(36,35,33,0.76)';
export const INK_STRONG = 'var(--scs-charcoal)';
export const HAIR = 'rgba(36,35,33,0.14)';
export const HAIR_FIRM = 'rgba(36,35,33,0.20)';
export const ON_DARK = 'rgba(232,225,214,0.72)';
export const ON_DARK_QUIET = 'rgba(232,225,214,0.50)';
export const HAIR_DARK = 'rgba(232,225,214,0.16)';

// Barlow Condensed 600 in sentence case, never the uppercase 900 house default.
// Same family, opposite temperament. Permitted by PROJECT-TRUTH 8.3.
export const display = (size) => ({
  fontFamily: "'Barlow Condensed', Impact, system-ui",
  fontWeight: 600,
  letterSpacing: '-0.005em',
  lineHeight: 1.04,
  fontSize: size,
});

export const H1_SIZE = 'clamp(2.25rem, 4.6vw, 4rem)';
export const H2_SIZE = 'clamp(1.85rem, 3.2vw, 2.9rem)';
export const H3_SIZE = 'clamp(1.25rem, 1.6vw, 1.4rem)';

export const body = (color = INK) => ({
  fontSize: '1.0625rem',
  lineHeight: 1.75,
  color,
});

const EASE = [0.16, 1, 0.3, 1];

/**
 * One discrete boolean, read from matchMedia and updated on change. It is not a
 * continuous value, so state is the correct home for it. Drives the two places
 * where a scroll effect needs an explicit mobile answer.
 */
export function useDesktop() {
  const [desktop, setDesktop] = useState(
    () => typeof window === 'undefined' || !window.matchMedia || window.matchMedia('(min-width: 768px)').matches,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const query = window.matchMedia('(min-width: 768px)');
    const onChange = (event) => setDesktop(event.matches);
    query.addEventListener('change', onChange);
    setDesktop(query.matches);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return desktop;
}

/** The 12 column measure every set is placed against. */
export function Frame({ className = '', children }) {
  return (
    <div className={`mx-auto w-full max-w-[1280px] px-5 sm:px-8 lg:px-10 ${className}`}>{children}</div>
  );
}

export function Grid({ className = '', children }) {
  return (
    <div className={`grid grid-cols-12 ${className}`} style={{ columnGap: 'clamp(1.5rem, 3vw, 3rem)' }}>
      {children}
    </div>
  );
}

/**
 * A set. Its beats enter together in sequence when the set reaches the viewport,
 * which is what tells the visitor they are one group rather than several
 * unrelated sections. Fires once; nothing re-animates on the way back up.
 */
export function Set({ className = '', style, children, ...rest }) {
  const desktop = useDesktop();
  return (
    <motion.section
      className={className}
      style={style}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.12 }}
      variants={{ hidden: {}, shown: { transition: { staggerChildren: desktop ? 0.09 : 0.06 } } }}
      {...rest}
    >
      {children}
    </motion.section>
  );
}

/** One beat inside a set. Travel shortens on narrow viewports. */
export function Beat({ className = '', style, children }) {
  const reduce = useReducedMotion();
  const desktop = useDesktop();
  const travel = desktop ? 18 : 12;
  return (
    <motion.div
      className={className}
      style={style}
      variants={{
        hidden: reduce ? { opacity: 1 } : { opacity: 0, y: travel },
        shown: { opacity: 1, y: 0, transition: { duration: 0.62, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * THE SIGNATURE MOVE.
 *
 * A band between two sets holding nothing but a hairline that draws left to
 * right, scrubbed to the band's own progress through the viewport. The line
 * measures the pause, so an empty band reads as a deliberate interval with a
 * length rather than as a gap where something failed to load.
 *
 * Mobile answer: the band clamps down to 88px so the draw completes inside a
 * normal scroll gesture rather than trailing off screen.
 * Reduced motion: the hairline renders at full width and the spacing alone
 * carries the rhythm.
 */
export function Rest() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const scaleX = useTransform(scrollYProgress, [0.18, 0.82], [0, 1]);
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="relative"
      style={{ height: 'clamp(88px, 16vh, 176px)', background: 'var(--scs-chalk)' }}
    >
      <Frame className="flex h-full items-center">
        <motion.span
          className="block h-px w-full"
          style={{ background: HAIR, transformOrigin: 'left center', scaleX: reduce ? 1 : scaleX }}
        />
      </Frame>
    </div>
  );
}
