import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PreviewNotice from '../components/PreviewNotice';
import { PREVIEW_MODE, buildApiUrl } from '../utils/previewSafety';
import { Calendar, Clock, MapPin, Ticket, Users, Tag, ChevronRight, Loader2, X, Check } from 'lucide-react';
import PublicImage from '../components/PublicImage';
import { SCS_MEDIA } from '../config/media';

const CATEGORY_COLORS = {
  'Powerlifting Meet': 'bg-[var(--clr-coral)]/10 text-[var(--clr-coral)] border-[var(--clr-coral)]/20',
  'Workshop':          'bg-[var(--clr-seafoam)] text-[var(--clr-green)] border-[var(--clr-border-green)]',
  'Open Gym':          'bg-[var(--clr-bg-green)] text-[var(--clr-green)] border-[var(--clr-border-green)]',
  'Community':         'bg-amber-50 text-amber-700 border-amber-200',
  'Challenge':         'bg-purple-50 text-purple-700 border-purple-200',
  'General':           'bg-white text-[var(--clr-text-muted)] border-[var(--clr-border)]',
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
}

function RSVPModal({ event, onClose }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (PREVIEW_MODE) {
        setForm({ name: '', email: '', phone: '' });
        setDone(true);
        return;
      }
      const res = await fetch(buildApiUrl(`/api/events/${event.id}/rsvp`), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed');
      setDone(true);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const inputCls = 'w-full border border-[var(--clr-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--clr-text)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--clr-green)]/30 focus:border-[var(--clr-green)]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label="Close RSVP form" className="absolute top-4 right-4 text-[var(--clr-text-muted)] hover:text-[var(--clr-charcoal)]">
          <X size={18} aria-hidden="true" />
        </button>
        {done ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-[var(--clr-bg-green)] rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={24} style={{ color: 'var(--clr-green)' }} />
            </div>
            <h3 className="font-display text-2xl tracking-wide mb-2" style={{ color: 'var(--clr-charcoal)' }}>{PREVIEW_MODE ? 'Preview test complete' : "You're in!"}</h3>
            <p className="text-[var(--clr-text-muted)] text-sm">
              {PREVIEW_MODE ? 'No RSVP was sent and no form information was stored.' : <>RSVP confirmed for <strong>{event.title}</strong>. See you there!</>}
            </p>
          </div>
        ) : (
          <>
            <h3 className="font-display text-xl tracking-wide mb-1" style={{ color: 'var(--clr-green)' }}>RSVP</h3>
            <p className="text-[var(--clr-text-muted)] text-sm mb-5">{event.title} · {formatDate(event.date)}</p>
            <PreviewNotice testId="preview-rsvp-notice">Test information is accepted locally for interface review only. No RSVP will be sent or stored.</PreviewNotice>
            {event.max_capacity && (
              <div className="flex items-center gap-2 mb-4 text-xs text-[var(--clr-text-muted)]">
                <Users size={13} style={{ color: 'var(--clr-green)' }} />
                <span>{(event.max_capacity - (event.rsvp_count || 0))} spots remaining</span>
              </div>
            )}
            <form onSubmit={submit} className="space-y-3">
              <div><label htmlFor="event-rsvp-name" className="block text-xs font-semibold text-[var(--clr-text-muted)] mb-1">Full Name *</label>
                <input id="event-rsvp-name" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} placeholder="John Smith" /></div>
              <div><label htmlFor="event-rsvp-email" className="block text-xs font-semibold text-[var(--clr-text-muted)] mb-1">Email *</label>
                <input id="event-rsvp-email" required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inputCls} placeholder="john@email.com" /></div>
              <div><label htmlFor="event-rsvp-phone" className="block text-xs font-semibold text-[var(--clr-text-muted)] mb-1">Phone</label>
                <input id="event-rsvp-phone" type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className={inputCls} placeholder="(831) 555-0100" /></div>
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full btn-primary py-3 text-sm flex items-center justify-center gap-2 mt-2">
                {loading ? <><Loader2 size={14} className="animate-spin" /> Reserving...</> : 'Confirm RSVP'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function Events() {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('upcoming');
  const [rsvpEvent, setRsvpEvent] = useState(null);

  useEffect(() => {
    if (PREVIEW_MODE) {
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(buildApiUrl(`/api/events?upcoming=${filter === 'upcoming'}`))
      .then(r => r.json()).then(setEvents).catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [filter]);

  const categories = [...new Set(events.map(e => e.category))].filter(Boolean);
  const [catFilter, setCatFilter] = useState('All');
  const shown = catFilter === 'All' ? events : events.filter(e => e.category === catFilter);

  return (
    <div className="scs-site scs-subpage min-h-screen" style={{ background: 'var(--clr-bg)' }}>
      <Navbar />
      <main>

      {/* Hero */}
      <section className="pt-20 pb-12 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-10 items-center">
            <div>
              <h1 className="font-display text-5xl sm:text-6xl" style={{ color: 'var(--clr-charcoal)' }}>Events and meets</h1>
              <p className="text-[var(--clr-text-muted)] mt-4 max-w-2xl text-base leading-relaxed">
                Powerlifting meets, workshops, open gym nights, and community events. This is where the Santa Cruz strength community shows up.
              </p>
              <PreviewNotice className="mt-6 max-w-xl" testId="preview-events-notice">Live events are not loaded in this approval build. RSVP submission is disabled and no information can be sent or stored.</PreviewNotice>
            </div>
            <figure className="scs-editorial-hero scs-editorial-hero-compact">
              <PublicImage src={SCS_MEDIA.loadedBar} alt="A heavily loaded barbell prepared on the training floor" width="1672" height="941" />
              <figcaption>Meets, workshops and shared training sessions begin with the same thing: showing up ready to work.</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-16 z-20 bg-white border-b" style={{ borderColor: 'var(--clr-border)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3 overflow-x-auto">
          {['upcoming', 'past'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
                filter === f
                  ? 'bg-[var(--clr-green)] text-white'
                  : 'bg-[var(--clr-bg)] text-[var(--clr-text-muted)] hover:bg-[var(--clr-bg-green)]'
              }`}>
              {f === 'upcoming' ? 'Upcoming' : 'Past Events'}
            </button>
          ))}
          <div className="w-px h-5 bg-[var(--clr-border)] shrink-0" />
          {['All', ...categories].map(cat => (
            <button key={cat} onClick={() => setCatFilter(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
                catFilter === cat
                  ? 'bg-[var(--clr-charcoal)] text-white border-[var(--clr-charcoal)]'
                  : 'bg-white text-[var(--clr-text-muted)] border-[var(--clr-border)] hover:border-[var(--clr-green)]'
              }`}>{cat}</button>
          ))}
        </div>
      </section>

      {/* Events grid */}
      <section className="py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin" style={{ color: 'var(--clr-green)' }} /></div>
          ) : shown.length === 0 ? (
            <div className="border-y border-[var(--clr-border)] py-9 grid gap-3 justify-items-start">
              <Calendar size={32} style={{ color: 'var(--clr-green)' }} aria-hidden="true" />
              <p className="text-[var(--clr-charcoal)] text-xl font-extrabold">{PREVIEW_MODE ? 'Live event feed disabled in preview' : 'No events found'}</p>
              <p className="text-[var(--clr-text-muted)] text-base">{PREVIEW_MODE ? 'Published events will load from the approved production API.' : 'New events will appear here after the team publishes them.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {shown.map(event => (
                <div key={event.id} className="card-light overflow-hidden flex flex-col hover:-translate-y-1 transition-transform duration-200">
                  {/* Image */}
                  {event.image_url ? (
                    <div className="h-48 overflow-hidden">
                      <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center" style={{ background: 'var(--clr-bg-green)' }}>
                      <Calendar size={36} style={{ color: 'var(--clr-green)', opacity: 0.4 }} />
                    </div>
                  )}
                  {/* Content */}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${CATEGORY_COLORS[event.category] || CATEGORY_COLORS['General']}`}>
                          {event.category || 'General'}
                        </span>
                        {event.sold_out && (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border bg-red-50 text-red-600 border-red-200">
                            🔴 Sold Out
                          </span>
                        )}
                        {event.recurring && event.recurring !== 'none' && (
                          <span className="text-[10px] font-semibold px-2 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                            🔁 {event.recurring_label || 'Recurring'}
                          </span>
                        )}
                      </div>
                      {event.ticket_type === 'rsvp' && event.max_capacity && (
                        <span className="text-[10px] text-[var(--clr-text-muted)] flex items-center gap-1 shrink-0">
                          <Users size={10} /> {event.rsvp_count || 0}/{event.max_capacity}
                        </span>
                      )}
                    </div>
                    <h3 className="font-display text-xl tracking-wide mb-2" style={{ color: 'var(--clr-charcoal)' }}>{event.title}</h3>
                    <div className="space-y-1.5 mb-3">
                      <div className="flex items-center gap-2 text-xs text-[var(--clr-text-muted)]">
                        <Calendar size={12} style={{ color: 'var(--clr-green)' }} />
                        <span>
                          {event.recurring && event.recurring !== 'none'
                            ? `Next: ${formatDate(event.date)}${event.time ? ` · ${event.time}` : ''}`
                            : `${formatDate(event.date)}${event.time ? ` · ${event.time}` : ''}`
                          }
                          {event.end_time ? ` - ${event.end_time}` : ''}
                        </span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2 text-xs text-[var(--clr-text-muted)]">
                          <MapPin size={12} style={{ color: 'var(--clr-green)' }} />
                          <span>{event.location}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-[var(--clr-text-muted)] text-sm leading-relaxed flex-1 line-clamp-3">{event.description}</p>
                    <div className="mt-4 pt-4 border-t space-y-2" style={{ borderColor: 'var(--clr-border)' }}>
                      {event.sold_out ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-3 py-2 rounded-full border border-red-200 w-full justify-center">
                          🔴 Sold Out / At Capacity
                        </span>
                      ) : event.ticket_type === 'external' && event.ticket_url ? (
                        <a href={event.ticket_url} target="_blank" rel="noopener noreferrer"
                          className="btn-coral w-full py-2.5 text-sm flex items-center justify-center gap-2">
                          <Ticket size={14} /> Get Tickets{event.ticket_price ? ` · ${event.ticket_price}` : ''}
                        </a>
                      ) : event.ticket_type === 'rsvp' ? (
                        <button onClick={() => setRsvpEvent(event)}
                          disabled={event.max_capacity && (event.rsvp_count || 0) >= event.max_capacity}
                          className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                          <Users size={14} />
                          {event.max_capacity && (event.rsvp_count || 0) >= event.max_capacity
                            ? 'Event Full' : 'RSVP - Free'}
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--clr-green)] bg-[var(--clr-bg-green)] px-3 py-2 rounded-full border border-[var(--clr-border-green)] w-full justify-center">
                          <Check size={12} /> Free Event - No Registration Needed
                        </span>
                      )}
                      {/* Extra registration / info link */}
                      {event.registration_url && !event.sold_out && (
                        <a href={event.registration_url} target="_blank" rel="noopener noreferrer"
                          className="btn-outline-green w-full py-2 text-sm flex items-center justify-center gap-1.5">
                          Register / More Info →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      </main>
      <Footer />
      {rsvpEvent && <RSVPModal event={rsvpEvent} onClose={() => setRsvpEvent(null)} />}
    </div>
  );
}
