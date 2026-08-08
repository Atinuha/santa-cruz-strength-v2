import React from 'react';

/**
 * The one answer control on the page.
 *
 * The same component renders in the hero plinth, in the routed plate, and in
 * the booking form, so an answer looks identical wherever it is given or
 * changed. It is a real <fieldset> of real <button aria-pressed> controls,
 * matching the pattern the existing lead form already uses, which keeps the
 * keyboard and screen reader behaviour consistent with the rest of the site.
 *
 * The only motion here is the press: a 150ms colour transition and a one pixel
 * downward nudge on :active, which is feedback that this control registered
 * this press. Both are pure CSS and neither moves layout, so reduced motion
 * needs no special case.
 *
 * `tone` exists because the global focus ring is charcoal, which is invisible
 * on the carbon plate. On a dark surface the ring becomes chalk.
 *
 * Class strings are written out in full rather than assembled from fragments so
 * that Tailwind's scanner can see every one of them.
 */

const TONES = {
  light: {
    legend: 'text-[color:var(--scs-text)]',
    hint: 'text-[color:var(--scs-text-muted)]',
    idle:
      'bg-[color:var(--scs-warm-white)] text-[color:var(--scs-text)] border-[color:var(--scs-border)] hover:border-[color:var(--scs-charcoal)]',
    active:
      'bg-[color:var(--scs-charcoal)] text-[color:var(--scs-chalk)] border-[color:var(--scs-charcoal)]',
    focus: 'focus-visible:outline-[color:var(--scs-charcoal)]',
  },
  dark: {
    legend: 'text-[color:var(--scs-chalk)]',
    hint: 'text-[color:var(--scs-stone)]',
    idle:
      'bg-transparent text-[color:var(--scs-chalk)] border-[color:var(--scs-border-dark)] hover:border-[color:var(--scs-chalk)]',
    active:
      'bg-[color:var(--scs-chalk)] text-[color:var(--scs-carbon)] border-[color:var(--scs-chalk)]',
    focus: 'focus-visible:outline-[color:var(--scs-chalk)]',
  },
};

const BASE =
  'flex flex-col items-start justify-between gap-2 text-left border text-sm font-semibold leading-snug ' +
  'transition-[background-color,border-color,color] duration-150 ease-out active:translate-y-[1px] ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';

export default function AnswerChips({
  legend,
  hint,
  options,
  value,
  onChange,
  tone = 'light',
  error,
  errorId,
  columns = 'grid-cols-2',
  compact = false,
}) {
  const skin = TONES[tone] || TONES.light;

  return (
    <fieldset>
      <legend
        className={`font-display-medium text-[0.9375rem] ${skin.legend}`}
        style={{ letterSpacing: '0.02em' }}
      >
        {legend}
      </legend>
      {hint && <p className={`text-xs leading-relaxed mt-1 ${skin.hint}`}>{hint}</p>}
      <div className={`grid ${columns} gap-2 mt-3`}>
        {options.map((option) => {
          const OptionIcon = option.icon;
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={`${BASE} ${compact ? 'min-h-[64px] p-3' : 'min-h-[88px] p-3.5'} ${
                selected ? skin.active : skin.idle
              } ${skin.focus}`}
              style={{ borderRadius: 'var(--scs-radius)' }}
            >
              <OptionIcon size={compact ? 17 : 20} aria-hidden="true" strokeWidth={1.75} />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-sm font-semibold mt-2 text-[color:var(--scs-clay)]">
          {error}
        </p>
      )}
    </fieldset>
  );
}
