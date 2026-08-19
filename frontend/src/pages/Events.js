import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BlueprintIcon from '../components/BlueprintIcon';
import { photo } from '../config/media';
import { GYM_CONFIG } from '../config';
import { preloaded, hasPreloaded } from '../lib/preload';
import { Calendar, MapPin, Ticket, X, Check, Loader2 } from 'lucide-react';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';

function formatDate(d) { if (!d) return ''; return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }); }

/* The date block. A meet on a Saturday in May is a physical fact with a
   shape, and printing it as one makes a listing scannable in a way a
   line of grey metadata never is. Both parts stay real text. */
function DateBlock({ date, tone = 'light' }) {
  if (!date) return null;
  const parsed = new Date(date + 'T12:00:00');
  if (Number.isNaN(parsed.getTime())) return null;
  const dark = tone === 'dark';
  return (
    <div
      className="shrink-0 w-16 text-center py-2"
      style={{
        background: dark ? 'var(--scs-forest-deep)' : 'var(--scs-mint)',
        color: dark ? 'var(--scs-mint)' : 'var(--scs-forest)',
        borderRadius: 'var(--scs-radius)',
      }}
    >
      <span className="block text-[11px] font-semibold uppercase tracking-[0.12em]">
        {parsed.toLocaleDateString('en-US', { month: 'short' })}
      </span>
      <span className="block font-display text-2xl leading-none mt-0.5" style={{ color: dark ? 'var(--scs-white)' : 'var(--scs-ink)' }}>
        {parsed.getDate()}
      </span>
      <span className="block text-[10px] uppercase tracking-[0.12em] mt-0.5">
        {parsed.toLocaleDateString('en-US', { weekday: 'short' })}
      </span>
    </div>
  );
}

function RSVPModal({ event, onClose }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef(null);
  const firstFieldRef = useRef(null);

  /* A dialog that cannot be closed from the keyboard is not a dialog,
     it is a trap. Escape closes it, focus moves into it on open and
     returns to where it came from on close, and the surface is
     labelled so a screen reader announces what opened. */
  useEffect(() => {
    const opener = document.activeElement;
    firstFieldRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const focusables = dialogRef.current?.querySelectorAll('button, [href], input, select, textarea');
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const r = await fetch(`${BACKEND}/api/events/${event.id}/rsvp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Failed');
      setDone(true);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="fixed inset-0" style={{ background: 'rgba(6,48,31,0.72)' }} aria-label="Close dialog" onClick={onClose} tabIndex={-1} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rsvp-title"
        className="relative w-full max-w-md p-6 sm:p-7"
        style={{ background: 'var(--scs-white)', borderRadius: 'var(--scs-radius-card)', boxShadow: 'var(--scs-shadow-lg)' }}
      >
        <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 grid place-items-center" style={{ color: 'var(--scs-text-muted)' }} aria-label="Close"><X size={18} /></button>
        {done ? (
          <div className="py-4" role="status">
            <Check size={26} style={{ color: 'var(--scs-forest)' }} className="mb-3" />
            <h3 id="rsvp-title" className="font-display text-xl mb-1" style={{ color: 'var(--scs-forest)' }}>RSVP Confirmed</h3>
            <p className="text-sm m-0" style={{ color: 'var(--scs-text-muted)' }}>Registered for {event.title}.</p>
          </div>
        ) : (
          <>
            <h3 id="rsvp-title" className="font-display text-xl mb-1" style={{ color: 'var(--scs-forest)' }}>RSVP</h3>
            <p className="text-sm mb-5" style={{ color: 'var(--scs-text-muted)' }}>{event.title}</p>
            <form onSubmit={submit}>
              <div className="mb-4">
                <label htmlFor="rsvp-name" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--scs-text)' }}>Name <span aria-hidden="true">*</span></label>
                <input id="rsvp-name" ref={firstFieldRef} required autoComplete="name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input-light" />
              </div>
              <div className="mb-4">
                <label htmlFor="rsvp-email" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--scs-text)' }}>Email <span aria-hidden="true">*</span></label>
                <input id="rsvp-email" required type="email" autoComplete="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="input-light" />
              </div>
              <div className="mb-5">
                <label htmlFor="rsvp-phone" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--scs-text)' }}>Phone</label>
                <input id="rsvp-phone" type="tel" autoComplete="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="input-light" />
              </div>
              {error && <p className="text-sm mb-4" role="alert" style={{ color: 'var(--scs-coral-dark)' }}>{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full text-sm">
                {loading ? <Loader2 size={15} className="animate-spin" /> : 'Confirm RSVP'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function Events() {
  // The upcoming list is captured at build time, so the calendar is in the
  // initial HTML rather than arriving after mount. Hydration reads the same
  // payload the server rendered from, which is why this has to be the initial
  // state and not something an effect fills in.
  const [events, setEvents] = useState(() => preloaded('events', []));
  const [loading, setLoading] = useState(() => !hasPreloaded('events'));
  const [filter, setFilter] = useState('upcoming');
  const [rsvpEvent, setRsvpEvent] = useState(null);
  const [catFilter, setCatFilter] = useState('All');

  const [loadFailed, setLoadFailed] = useState(false);

  // "Nothing is scheduled" and "we could not reach the calendar" are different
  // sentences, and this used to say the first on the evidence of the second.
  // The blog index had the same bug in a worse place. A failed request now
  // leaves whatever is on screen alone and is reported as a failure.
  // The first pass is a refresh of a list that is already on screen, so it does
  // not get a spinner. Switching tabs does, because that list is not there yet.
  const firstLoad = useRef(true);
  useEffect(() => {
    let cancelled = false;
    if (!(firstLoad.current && hasPreloaded('events'))) setLoading(true);
    firstLoad.current = false;
    fetch(`${BACKEND}/api/events?upcoming=${filter === 'upcoming'}`)
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(data => { if (!cancelled) { setEvents(Array.isArray(data) ? data : []); setLoadFailed(false); } })
      .catch(() => { if (!cancelled) setLoadFailed(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filter]);

  const cats = [...new Set(events.map(e => e.category))].filter(Boolean);
  const shown = catFilter === 'All' ? events : events.filter(e => e.category === catFilter);
  const [featured, ...others] = shown;

  const chip = (activeState) => ({
    border: `1px solid ${activeState ? 'var(--scs-forest)' : 'rgba(27,27,25,0.18)'}`,
    background: activeState ? 'var(--scs-forest)' : 'var(--scs-white)',
    color: activeState ? 'var(--scs-white)' : 'var(--scs-text)',
    borderRadius: 'var(--scs-radius)',
    minHeight: '40px',
  });

  return (
    <div className="min-h-screen" style={{ background: 'var(--scs-bg)' }}>
      <Navbar />

      <main id="main">
        <section className="relative pt-16 on-dark on-photo" style={{ background: 'var(--scs-forest-deep)' }}>
          <img
            {...photo('community-medals', { sizes: '100vw', eager: true })}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: 'center 40%', filter: 'saturate(0.55) brightness(0.5)' }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(6,48,31,0.86), rgba(6,48,31,0.96))' }} />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-14 sm:pt-20 sm:pb-16">
            <h1 className="font-display mb-4" style={{ color: 'var(--scs-white)', fontSize: 'clamp(2.25rem, 5.5vw, 3.75rem)', lineHeight: 0.96 }}>
              Events
            </h1>
            <p className="text-base sm:text-lg max-w-xl leading-relaxed mb-6" style={{ color: 'var(--scs-text-on-dark)' }}>
              Meets, workshops, and community events at Santa Cruz Strength.
            </p>
            <p className="flex items-center gap-2 text-sm m-0" style={{ color: 'var(--scs-text-on-dark-muted)' }}>
              <MapPin size={15} aria-hidden="true" />{GYM_CONFIG.address.full}
            </p>
          </div>
        </section>

        <section className="sticky top-16 z-20" style={{ background: 'var(--scs-cream)', borderBottom: '1px solid var(--scs-border)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3 overflow-x-auto">
            {['upcoming', 'past'].map(f => (
              <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
                className="shrink-0 px-4 text-sm font-semibold" style={chip(filter === f)}>
                {f === 'upcoming' ? 'Upcoming' : 'Past'}
              </button>
            ))}
            {cats.length > 0 && (
              <>
                <span className="w-px h-5 shrink-0" style={{ background: 'var(--scs-border)' }} aria-hidden="true" />
                {['All', ...cats].map(c => (
                  <button key={c} onClick={() => setCatFilter(c)} aria-pressed={catFilter === c}
                    className="shrink-0 px-4 text-sm font-medium" style={chip(catFilter === c)}>
                    {c}
                  </button>
                ))}
              </>
            )}
          </div>
        </section>

        <section className="py-12 sm:py-16" style={{ background: 'var(--scs-cream)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin" style={{ color: 'var(--scs-forest)' }} /></div>
            ) : shown.length === 0 ? (
              /* The honest empty state. No invented cards to make the page
                 look busy: if nothing is scheduled, the page says so and
                 offers the thing that is always true, which is that the
                 gym is open to visit. */
              <div className="py-16 max-w-lg">
                <BlueprintIcon name="meet-here" size={80} className="mb-6" />
                {loadFailed ? (
                  <>
                    <h2 className="font-display text-2xl sm:text-3xl mb-3" style={{ color: 'var(--scs-forest)' }}>The calendar did not load</h2>
                    <p className="text-base leading-relaxed mb-6" style={{ color: 'var(--scs-text-muted)' }}>
                      This is a problem reaching the site, not a quiet week. Reloading usually fixes it.
                    </p>
                    <button onClick={() => window.location.reload()} className="btn-primary text-sm">Reload the page</button>
                  </>
                ) : (
                  <>
                    <h2 className="font-display text-2xl sm:text-3xl mb-3" style={{ color: 'var(--scs-forest)' }}>
                      {filter === 'upcoming' ? 'Nothing on the calendar right now' : 'No past events listed'}
                    </h2>
                    <p className="text-base leading-relaxed mb-6" style={{ color: 'var(--scs-text-muted)' }}>
                      {filter === 'upcoming'
                        ? 'When a meet, workshop or community night is scheduled, it appears here with the date, the cost and how to sign up.'
                        : 'Past events will be archived here as they happen.'}
                    </p>
                    <a href="/contact#tour-request" className="btn-clay text-sm">Book a Free Facility Tour</a>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* The next event, given the room a real-world commitment
                    deserves. Every field below is printed only when the
                    record actually holds it. */}
                {featured && (
                  <article className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12 pb-12" style={{ borderBottom: '1px solid var(--scs-border)' }}>
                    <div className="lg:col-span-6">
                      {featured.image_url
                        ? <div className="scs-frame"><img src={featured.image_url} alt={featured.title} className="w-full h-64 sm:h-80 object-cover scs-photo" loading="eager" /></div>
                        : <div className="scs-cover scs-cover-forest" style={{ color: 'var(--scs-mint)' }}>
                            <div className="absolute inset-0 grid place-items-center"><BlueprintIcon name="competitor" size={120} className="scs-blueprint-light" /></div>
                          </div>}
                    </div>
                    <div className="lg:col-span-6 flex flex-col">
                      {featured.category && (
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] m-0 mb-3" style={{ color: 'var(--scs-forest)' }}>
                          {featured.category}{featured.sold_out ? ' · Sold Out' : ''}
                        </p>
                      )}
                      <h2 className="font-display text-3xl sm:text-4xl mb-4" style={{ color: 'var(--scs-forest)', lineHeight: 0.98 }}>{featured.title}</h2>
                      <dl className="m-0 mb-5">
                        <div className="flex items-start gap-3 py-2">
                          <Calendar size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--scs-forest)' }} aria-hidden="true" />
                          <div>
                            <dt className="sr-only">Date</dt>
                            <dd className="text-sm m-0" style={{ color: 'var(--scs-text)' }}>{formatDate(featured.date)}{featured.time ? ` at ${featured.time}` : ''}</dd>
                          </div>
                        </div>
                        {featured.location && (
                          <div className="flex items-start gap-3 py-2">
                            <MapPin size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--scs-forest)' }} aria-hidden="true" />
                            <div>
                              <dt className="sr-only">Location</dt>
                              <dd className="text-sm m-0" style={{ color: 'var(--scs-text)' }}>{featured.location}</dd>
                            </div>
                          </div>
                        )}
                      </dl>
                      {featured.description && <p className="text-base leading-relaxed max-w-[62ch] mb-6" style={{ color: 'var(--scs-text-muted)' }}>{featured.description}</p>}
                      <div className="mt-auto">
                        {featured.sold_out ? <span className="text-sm font-semibold" style={{ color: 'var(--scs-coral-dark)' }}>Sold Out</span>
                          : featured.ticket_type === 'external' && featured.ticket_url ? <a href={featured.ticket_url} target="_blank" rel="noopener noreferrer" className="btn-clay text-sm"><Ticket size={15} />Tickets</a>
                          : featured.ticket_type === 'rsvp' ? <button onClick={() => setRsvpEvent(featured)} className="btn-primary text-sm">RSVP, free</button>
                          : <span className="text-sm font-medium" style={{ color: 'var(--scs-text-muted)' }}>Free event</span>}
                      </div>
                    </div>
                  </article>
                )}

                {others.length > 0 && (
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {others.map(ev => (
                      <li key={ev.id} className="flex gap-5 p-5" style={{ background: 'var(--scs-white)', border: '1px solid var(--scs-border)', borderRadius: 'var(--scs-radius-card)' }}>
                        <DateBlock date={ev.date} />
                        <div className="flex flex-col flex-1 min-w-0">
                          {ev.category && (
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] m-0 mb-1.5" style={{ color: 'var(--scs-forest)' }}>
                              {ev.category}{ev.sold_out ? ' · Sold Out' : ''}
                            </p>
                          )}
                          <h3 className="font-display-medium text-lg m-0 mb-1.5" style={{ color: 'var(--scs-ink)' }}>{ev.title}</h3>
                          {ev.time && <p className="text-xs m-0 mb-1" style={{ color: 'var(--scs-text-muted)' }}>{ev.time}</p>}
                          {ev.location && <p className="text-xs m-0 mb-2" style={{ color: 'var(--scs-text-muted)' }}>{ev.location}</p>}
                          {ev.description && <p className="text-sm leading-relaxed line-clamp-3 m-0 mb-4" style={{ color: 'var(--scs-text-muted)' }}>{ev.description}</p>}
                          <div className="mt-auto">
                            {ev.sold_out ? <span className="text-sm font-semibold" style={{ color: 'var(--scs-coral-dark)' }}>Sold Out</span>
                              : ev.ticket_type === 'external' && ev.ticket_url ? <a href={ev.ticket_url} target="_blank" rel="noopener noreferrer" className="scs-advance text-sm font-semibold inline-flex items-center gap-2" style={{ color: 'var(--scs-forest)' }}><Ticket size={14} />Tickets</a>
                              : ev.ticket_type === 'rsvp' ? <button onClick={() => setRsvpEvent(ev)} className="scs-advance text-sm font-semibold" style={{ color: 'var(--scs-forest)', background: 'transparent' }}>RSVP, free</button>
                              : <span className="text-sm" style={{ color: 'var(--scs-text-muted)' }}>Free event</span>}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
      {rsvpEvent && <RSVPModal event={rsvpEvent} onClose={() => setRsvpEvent(null)} />}
    </div>
  );
}
