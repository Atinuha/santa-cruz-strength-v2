import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Calendar, MapPin, Ticket, Users, X, Check, Loader2 } from 'lucide-react';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';

function formatDate(d) { if (!d) return ''; return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }); }

function RSVPModal({ event, onClose }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => { e.preventDefault(); setLoading(true); setError(''); try { const r = await fetch(`${BACKEND}/api/events/${event.id}/rsvp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); const d = await r.json(); if (!r.ok) throw new Error(d.detail || 'Failed'); setDone(true); } catch (err) { setError(err.message); } finally { setLoading(false); } };
  const ic = 'w-full border rounded-none px-4 py-2.5 text-sm bg-[var(--scs-warm-white)] text-[var(--scs-text)] border-[var(--scs-border)] focus:outline-none focus:border-[var(--scs-charcoal)]';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}><div className="fixed inset-0 bg-black/50" />
      <div className="relative w-full max-w-md p-6" style={{ background: 'var(--scs-warm-white)', borderRadius: 'var(--scs-radius)' }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4" style={{ color: 'var(--scs-stone)' }} aria-label="Close"><X size={18} /></button>
        {done ? <div className="text-center py-6"><Check size={24} style={{ color: 'var(--scs-charcoal)' }} className="mx-auto mb-3" /><h3 className="font-display text-lg mb-1" style={{ color: 'var(--scs-charcoal)' }}>RSVP Confirmed</h3><p className="text-sm" style={{ color: 'var(--scs-text-muted)' }}>Registered for {event.title}.</p></div> : (
          <><h3 className="font-display text-lg mb-4" style={{ color: 'var(--scs-charcoal)' }}>RSVP</h3>
          <form onSubmit={submit} className="space-y-3">
            <div><label className="block text-xs font-medium mb-1" style={{ color: 'var(--scs-text-muted)' }}>Name *</label><input required value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} className={ic} /></div>
            <div><label className="block text-xs font-medium mb-1" style={{ color: 'var(--scs-text-muted)' }}>Email *</label><input required type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} className={ic} /></div>
            <div><label className="block text-xs font-medium mb-1" style={{ color: 'var(--scs-text-muted)' }}>Phone</label><input type="tel" value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} className={ic} /></div>
            {error && <p className="text-xs" style={{ color: 'var(--scs-clay)' }}>{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm">{loading ? <Loader2 size={14} className="animate-spin" /> : 'Confirm'}</button>
          </form></>
        )}
      </div>
    </div>
  );
}

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming');
  const [rsvpEvent, setRsvpEvent] = useState(null);
  const [catFilter, setCatFilter] = useState('All');

  useEffect(() => { fetch(`${BACKEND}/api/events?upcoming=${filter === 'upcoming'}`).then(r => r.json()).then(setEvents).catch(() => setEvents([])).finally(() => setLoading(false)); }, [filter]);
  const cats = [...new Set(events.map(e => e.category))].filter(Boolean);
  const shown = catFilter === 'All' ? events : events.filter(e => e.category === catFilter);

  return (
    <div className="min-h-screen" style={{ background: 'var(--scs-bg)' }}>
      <Navbar />
      <section className="pt-28 pb-8" style={{ background: 'var(--scs-chalk)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: 'var(--scs-stone)' }}>Community</p>
          <h1 className="font-display text-3xl sm:text-4xl" style={{ color: 'var(--scs-charcoal)' }}>Events</h1>
          <p className="text-sm mt-2 max-w-lg" style={{ color: 'var(--scs-text-muted)' }}>Meets, workshops, and community events at Santa Cruz Strength.</p>
        </div>
      </section>
      <section className="sticky top-16 z-20" style={{ background: 'var(--scs-chalk)', borderBottom: '1px solid var(--scs-border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3 overflow-x-auto">
          {['upcoming', 'past'].map(f => <button key={f} onClick={() => setFilter(f)} className={`shrink-0 px-4 py-1.5 text-xs font-semibold transition-colors duration-180 ${filter === f ? 'text-white' : ''}`} style={{ background: filter === f ? 'var(--scs-charcoal)' : 'transparent', color: filter === f ? 'var(--scs-chalk)' : 'var(--scs-text-muted)', borderRadius: 'var(--scs-radius)' }}>{f === 'upcoming' ? 'Upcoming' : 'Past'}</button>)}
          {cats.length > 0 && <><div className="w-px h-4 shrink-0" style={{ background: 'var(--scs-border)' }} />{['All', ...cats].map(c => <button key={c} onClick={() => setCatFilter(c)} className="shrink-0 px-3 py-1.5 text-xs font-medium transition-colors duration-180" style={{ border: `1px solid ${catFilter === c ? 'var(--scs-charcoal)' : 'var(--scs-border)'}`, background: catFilter === c ? 'var(--scs-charcoal)' : 'var(--scs-warm-white)', color: catFilter === c ? 'var(--scs-chalk)' : 'var(--scs-text-muted)', borderRadius: 'var(--scs-radius)' }}>{c}</button>)}</>}
        </div>
      </section>
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {loading ? <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin" style={{ color: 'var(--scs-charcoal)' }} /></div>
          : shown.length === 0 ? <div className="text-center py-20"><Calendar size={32} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--scs-stone)' }} /><p className="text-sm" style={{ color: 'var(--scs-text-muted)' }}>No events found.</p></div>
          : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shown.map(ev => (
              <div key={ev.id} className="overflow-hidden flex flex-col" style={{ background: 'var(--scs-warm-white)', border: '1px solid var(--scs-border)', borderRadius: 'var(--scs-radius)' }}>
                {ev.image_url ? <div className="h-48 overflow-hidden scs-photo"><img src={ev.image_url} alt={ev.title} className="w-full h-full object-cover" loading="lazy" /></div>
                : <div className="h-48 flex items-center justify-center" style={{ background: 'var(--scs-bg)' }}><Calendar size={28} style={{ color: 'var(--scs-stone)', opacity: 0.3 }} /></div>}
                <div className="p-5 flex flex-col flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--scs-stone)' }}>{ev.category || 'General'}{ev.sold_out ? ' \u00B7 Sold Out' : ''}</p>
                  <h3 className="font-display-medium text-base mb-2" style={{ color: 'var(--scs-charcoal)' }}>{ev.title}</h3>
                  <p className="text-xs mb-2 flex items-center gap-1.5" style={{ color: 'var(--scs-text-muted)' }}><Calendar size={11} />{formatDate(ev.date)}{ev.time ? ` at ${ev.time}` : ''}</p>
                  {ev.location && <p className="text-xs mb-2 flex items-center gap-1.5" style={{ color: 'var(--scs-text-muted)' }}><MapPin size={11} />{ev.location}</p>}
                  <p className="text-sm leading-relaxed flex-1 line-clamp-3" style={{ color: 'var(--scs-text-muted)' }}>{ev.description}</p>
                  <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--scs-border)' }}>
                    {ev.sold_out ? <span className="block text-center text-xs font-semibold py-2" style={{ color: 'var(--scs-clay)' }}>Sold Out</span>
                    : ev.ticket_type === 'external' && ev.ticket_url ? <a href={ev.ticket_url} target="_blank" rel="noopener noreferrer" className="btn-clay w-full py-2.5 text-sm flex items-center justify-center gap-2"><Ticket size={14} />Tickets</a>
                    : ev.ticket_type === 'rsvp' ? <button onClick={() => setRsvpEvent(ev)} className="btn-primary w-full py-2.5 text-sm">RSVP (Free)</button>
                    : <span className="block text-center text-xs font-medium py-2" style={{ color: 'var(--scs-stone)' }}>Free Event</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>}
        </div>
      </section>
      <Footer />{rsvpEvent && <RSVPModal event={rsvpEvent} onClose={() => setRsvpEvent(null)} />}
    </div>
  );
}
