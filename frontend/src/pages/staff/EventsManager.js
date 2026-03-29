import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { formatPhone } from '../../utils/phone';
import ImageUploadField from '../../components/ImageUploadField';
import {
  Plus, Trash2, Loader2, ArrowLeft, Calendar, Pencil, Eye, EyeOff,
  ExternalLink, Users, Ticket, X, Check, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';

const CATEGORIES = ['Powerlifting Meet', 'Workshop', 'Open Gym', 'Community', 'Challenge', 'General'];
const TICKET_TYPES = [
  { value: 'free',     label: 'Free — No Registration',   icon: '🎉' },
  { value: 'rsvp',     label: 'RSVP — Track Attendees',   icon: '📋' },
  { value: 'external', label: 'External Tickets (Eventbrite, etc.)', icon: '🎟️' },
];

const RECURRING_OPTIONS = [
  { value: 'none',      label: 'Does not repeat' },
  { value: 'daily',     label: 'Every day' },
  { value: 'weekly',    label: 'Every week' },
  { value: 'biweekly',  label: 'Every 2 weeks' },
  { value: 'monthly',   label: 'Every month' },
];

// Generate 5:00 AM → 11:00 PM in 30-min steps
const TIME_OPTIONS = (() => {
  const times = [''];
  for (let h = 5; h <= 23; h++) {
    for (let m = 0; m < 60; m += 30) {
      const period = h < 12 ? 'AM' : 'PM';
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const min = m === 0 ? '00' : '30';
      times.push(`${hour12}:${min} ${period}`);
    }
  }
  return times;
})();

const BLANK_EVENT = {
  title: '', description: '', date: '', time: '', end_time: '',
  image_url: '', category: 'General', location: '151 Harvey West Blvd Ste D, Santa Cruz, CA',
  ticket_type: 'free', ticket_url: '', ticket_price: '', max_capacity: '', published: true,
  recurring: 'none', recurring_until: '',
};

function EventForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || BLANK_EVENT);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const inputCls = 'w-full bg-white/5 border border-white/12 text-white placeholder:text-white/35 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B7A4A]/50';
  const labelCls = 'block text-xs text-white/55 mb-1.5 font-semibold uppercase tracking-wider';

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={labelCls}>Event Title *</label>
          <input required value={form.title} onChange={e => set('title', e.target.value)}
            placeholder="2026 Spring Powerlifting Meet" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Date *</label>
          <input required type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <select value={form.category} onChange={e => set('category', e.target.value)}
            className={inputCls + ' appearance-none'} style={{ background: 'rgba(255,255,255,0.05)' }}>
            {CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#111f16' }}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Start Time</label>
          <select value={form.time} onChange={e => set('time', e.target.value)}
            className={inputCls + ' appearance-none'} style={{ background: 'rgba(255,255,255,0.05)' }}>
            {TIME_OPTIONS.map(t => (
              <option key={t} value={t} style={{ background: '#111f16' }}>{t || '— Select time —'}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>End Time</label>
          <select value={form.end_time} onChange={e => set('end_time', e.target.value)}
            className={inputCls + ' appearance-none'} style={{ background: 'rgba(255,255,255,0.05)' }}>
            {TIME_OPTIONS.map(t => (
              <option key={t} value={t} style={{ background: '#111f16' }}>{t || '— Select time —'}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Location</label>
          <input value={form.location} onChange={e => set('location', e.target.value)}
            placeholder="151 Harvey West Blvd Ste D, Santa Cruz, CA" className={inputCls} />
        </div>

        {/* Recurring */}
        <div>
          <label className={labelCls}>Repeats</label>
          <select value={form.recurring || 'none'} onChange={e => set('recurring', e.target.value)}
            className={inputCls + ' appearance-none'} style={{ background: 'rgba(255,255,255,0.05)' }}>
            {RECURRING_OPTIONS.map(r => (
              <option key={r.value} value={r.value} style={{ background: '#111f16' }}>{r.label}</option>
            ))}
          </select>
        </div>
        {form.recurring && form.recurring !== 'none' && (
          <div>
            <label className={labelCls}>Repeat Until</label>
            <input type="date" value={form.recurring_until || ''}
              onChange={e => set('recurring_until', e.target.value)}
              className={inputCls} />
          </div>
        )}
        <div className="sm:col-span-2">
          <label className={labelCls}>Description *</label>
          <textarea required value={form.description} onChange={e => set('description', e.target.value)}
            rows={4} placeholder="Describe the event, what to expect, who it's for..."
            className={inputCls + ' resize-none'} />
        </div>
        <div className="sm:col-span-2">
          <ImageUploadField
            label="Event Image"
            value={form.image_url}
            onChange={(url) => set('image_url', url)}
            darkMode={true}
          />
        </div>
      </div>

      {/* Ticket type */}
      <div>
        <label className={labelCls}>Ticket / Registration Type</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {TICKET_TYPES.map(t => (
            <button key={t.value} type="button" onClick={() => set('ticket_type', t.value)}
              className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all duration-150 ${
                form.ticket_type === t.value
                  ? 'bg-[#1B7A4A]/20 border-[#1B7A4A]/40 text-white'
                  : 'bg-white/3 border-white/10 text-white/50 hover:border-white/25'
              }`}>
              <span className="text-lg">{t.icon}</span>
              <span className="text-xs font-semibold leading-tight">{t.label}</span>
              {form.ticket_type === t.value && <Check size={12} className="ml-auto text-[#7FCCA6] shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      {form.ticket_type === 'external' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Ticket URL *</label>
            <input value={form.ticket_url} onChange={e => set('ticket_url', e.target.value)}
              placeholder="https://eventbrite.com/..." className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Price (display only)</label>
            <input value={form.ticket_price} onChange={e => set('ticket_price', e.target.value)}
              placeholder="$25" className={inputCls} />
          </div>
        </div>
      )}
      {form.ticket_type === 'rsvp' && (
        <div>
          <label className={labelCls}>Max Capacity (optional)</label>
          <input type="number" value={form.max_capacity} onChange={e => set('max_capacity', e.target.value)}
            placeholder="Leave blank for unlimited" className={inputCls} />
        </div>
      )}

      {/* Published toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div onClick={() => set('published', !form.published)}
          className={`w-10 h-5 rounded-full transition-all duration-200 relative ${form.published ? 'bg-[#1B7A4A]' : 'bg-white/15'}`}>
          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${form.published ? 'left-5' : 'left-0.5'}`} />
        </div>
        <span className={`text-sm font-semibold ${form.published ? 'text-[#7FCCA6]' : 'text-white/40'}`}>
          {form.published ? 'Published — visible on site' : 'Draft — hidden from public'}
        </span>
      </label>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 btn-scs-secondary py-2.5 rounded-lg text-sm">Cancel</button>
        <button type="submit" disabled={saving} className="flex-1 btn-scs-primary py-2.5 rounded-lg text-sm flex items-center justify-center gap-2">
          {saving ? <><Loader2 size={13} className="animate-spin" /> Saving...</> : <><Check size={13} /> Save Event</>}
        </button>
      </div>
    </form>
  );
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function EventsManager() {
  const { user } = useAuth();
  const token = localStorage.getItem('scs_token');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('list');    // 'list' | 'create' | 'edit'
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [rsvpModal, setRsvpModal] = useState(null);
  const [rsvps, setRsvps] = useState([]);

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/staff/events`, { headers });
      setEvents(await res.json());
    } catch { toast.error('Failed to load events'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      const payload = { ...form, max_capacity: form.max_capacity ? parseInt(form.max_capacity) : null };
      if (editing) {
        await fetch(`${BACKEND}/api/staff/events/${editing.id}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
        toast.success('Event updated');
      } else {
        await fetch(`${BACKEND}/api/staff/events`, { method: 'POST', headers, body: JSON.stringify(payload) });
        toast.success('Event created');
      }
      await fetchEvents();
      setMode('list'); setEditing(null);
    } catch { toast.error('Failed to save event'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event? This cannot be undone.')) return;
    try {
      await fetch(`${BACKEND}/api/staff/events/${id}`, { method: 'DELETE', headers });
      toast.success('Event deleted');
      await fetchEvents();
    } catch { toast.error('Failed to delete'); }
  };

  const togglePublish = async (event) => {
    try {
      await fetch(`${BACKEND}/api/staff/events/${event.id}`, {
        method: 'PUT', headers, body: JSON.stringify({ published: !event.published }),
      });
      await fetchEvents();
    } catch { toast.error('Failed to update'); }
  };

  const viewRsvps = async (event) => {
    const res = await fetch(`${BACKEND}/api/staff/events/${event.id}/rsvps`, { headers });
    setRsvps(await res.json());
    setRsvpModal(event);
  };

  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="min-h-screen bg-[var(--ink)] px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => { setMode('list'); setEditing(null); }}
            className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeft size={14} /> Back to events
          </button>
          <h1 className="font-display text-2xl text-white tracking-wide mb-6">
            {mode === 'create' ? 'CREATE EVENT' : 'EDIT EVENT'}
          </h1>
          <div className="card-marketing p-6">
            <EventForm
              initial={editing}
              onSave={handleSave}
              onCancel={() => { setMode('list'); setEditing(null); }}
              saving={saving}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--ink)] px-4 py-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to="/staff/dashboard" className="text-white/40 hover:text-white transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <h1 className="font-display text-2xl text-white tracking-wide">EVENTS</h1>
          </div>
          <button onClick={() => { setMode('create'); setEditing(null); }}
            className="btn-scs-primary flex items-center gap-2 px-4 py-2 text-sm rounded-lg"
            data-testid="create-event-btn">
            <Plus size={15} /> New Event
          </button>
        </div>

        {/* Preview link */}
        <a href="/events" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-white/35 hover:text-[#7FCCA6] mb-6 transition-colors w-fit">
          <ExternalLink size={12} /> Preview public events page
        </a>

        {/* Events list */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-white/30" /></div>
        ) : events.length === 0 ? (
          <div className="text-center py-20">
            <Calendar size={36} className="text-white/15 mx-auto mb-4" />
            <p className="text-white/35 font-semibold">No events yet</p>
            <p className="text-white/20 text-sm mt-1">Create your first event to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(event => (
              <div key={event.id} className="card-marketing p-4" data-testid={`event-row-${event.id}`}>
                <div className="flex items-start gap-4">
                  {event.image_url && (
                    <img src={event.image_url} alt={event.title}
                      className="w-16 h-16 rounded-lg object-cover shrink-0 hidden sm:block" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-white font-bold text-sm">{event.title}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          event.published
                            ? 'bg-[#1B7A4A]/15 text-[#7FCCA6] border-[#1B7A4A]/25'
                            : 'bg-white/5 text-white/35 border-white/10'
                        }`}>
                          {event.published ? 'Live' : 'Draft'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/40 mb-2 flex-wrap">
                      <span className="flex items-center gap-1"><Calendar size={10} /> {formatDate(event.date)}{event.time ? ` · ${event.time}` : ''}</span>
                      <span className="text-white/20">{event.category}</span>
                      {event.recurring && event.recurring !== 'none' && (
                        <span className="flex items-center gap-1 text-[10px] text-amber-300/70">
                          🔁 {RECURRING_OPTIONS.find(r => r.value === event.recurring)?.label || event.recurring}
                        </span>
                      )}
                      {event.ticket_type === 'rsvp' && (
                        <span className="flex items-center gap-1 text-[#7FCCA6]/70">
                          <Users size={10} /> {event.rsvp_count || 0}{event.max_capacity ? `/${event.max_capacity}` : ''} RSVPs
                        </span>
                      )}
                      {event.ticket_type === 'external' && event.ticket_price && (
                        <span className="flex items-center gap-1"><Ticket size={10} /> {event.ticket_price}</span>
                      )}
                    </div>
                    <p className="text-white/30 text-xs line-clamp-2">{event.description}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {event.ticket_type === 'rsvp' && (
                      <button onClick={() => viewRsvps(event)} title="View RSVPs"
                        className="p-1.5 rounded text-white/40 hover:text-[#7FCCA6] hover:bg-[#1B7A4A]/15 transition-colors">
                        <Users size={14} />
                      </button>
                    )}
                    <button onClick={() => togglePublish(event)} title={event.published ? 'Unpublish' : 'Publish'}
                      className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/8 transition-colors">
                      {event.published ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button onClick={() => { setEditing(event); setMode('edit'); }}
                      className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/8 transition-colors"
                      data-testid={`edit-event-${event.id}`}>
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(event.id)}
                      className="p-1.5 rounded text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      data-testid={`delete-event-${event.id}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RSVP Modal */}
      {rsvpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRsvpModal(null)} />
          <div className="relative bg-[#0f1a14] border border-white/10 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-white/8">
              <div>
                <h3 className="text-white font-bold">{rsvpModal.title}</h3>
                <p className="text-white/40 text-xs">{rsvps.length} RSVPs{rsvpModal.max_capacity ? ` / ${rsvpModal.max_capacity} capacity` : ''}</p>
              </div>
              <button onClick={() => setRsvpModal(null)} className="text-white/40 hover:text-white"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {rsvps.length === 0 ? (
                <p className="text-white/30 text-sm text-center py-8">No RSVPs yet</p>
              ) : (
                <div className="space-y-2">
                  {rsvps.map((r, i) => (
                    <div key={r.id} className="flex items-center gap-3 bg-white/3 rounded-lg px-4 py-3">
                      <span className="text-white/25 text-xs w-5">{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-white text-sm font-semibold">{r.name}</p>
                        <p className="text-white/40 text-xs">{r.email}{r.phone ? ` · ${formatPhone(r.phone)}` : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
