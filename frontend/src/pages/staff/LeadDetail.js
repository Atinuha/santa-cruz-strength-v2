import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getLead, updateLead, addNote } from '../../lib/api';
import { LEAD_STATUSES, LEAD_SOURCES, GYM_CONFIG, PREFERRED_CONTACTS } from '../../config';
import { useAuth } from '../../contexts/AuthContext';
import { gvCall, gvText } from '../../utils/googleVoice';
import { formatPhone } from '../../utils/phone';
import {
  ArrowLeft, Phone, Mail, Calendar, Clock, Loader2,
  MessageSquare, User, ChevronRight, Tag, LogOut
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Separator } from '../../components/ui/separator';
import { toast } from 'sonner';
import TimeQuickSelect from '../../components/staff/TimeQuickSelect';

function StatusBadge({ status }) {
  const found = LEAD_STATUSES.find((s) => s.value === status);
  const colorClass = found?.color || 'bg-white/10 text-white border-white/15';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium border ${colorClass}`}>
      {status}
    </span>
  );
}

const SOURCE_LABELS = {
  website_form: 'Website Form',
  book_a_tour: 'Book a Tour',
  book_a_visit: 'Book a Visit',
  contact_page: 'Contact Page',
  personal_training_inquiry: 'PT Inquiry',
  manual_entry: 'Manual Entry',
  csv_import: 'CSV Import',
  walk_in: 'Walk-In',
};

function formatTime12(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [statusValue, setStatusValue] = useState('');

  const fetchLead = async () => {
    try {
      const res = await getLead(id);
      setLead(res.data);
      setEditNotes(res.data.notes || '');
      setStatusValue(res.data.status);
      setFollowUpDate(res.data.next_follow_up_date ? res.data.next_follow_up_date.split('T')[0] : '');
      setFollowUpTime(res.data.next_follow_up_time || '');
    } catch {
      toast.error('Failed to load lead');
      navigate('/staff/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLead();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    setStatusValue(newStatus);
    setSaving(true);
    try {
      const updated = await updateLead(id, { status: newStatus });
      setLead(updated.data);
      toast.success(`Status updated to "${newStatus}"`);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      await updateLead(id, { notes: editNotes });
      toast.success('Notes saved');
    } catch {
      toast.error('Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFollowUp = async () => {
    setSaving(true);
    try {
      await updateLead(id, { next_follow_up_date: followUpDate || null, next_follow_up_time: followUpTime || null });
      toast.success('Follow-up saved');
      await fetchLead();
    } catch {
      toast.error('Failed to save follow-up');
    } finally { setSaving(false); }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      await addNote(id, noteText);
      setNoteText('');
      toast.success('Note added');
      await fetchLead();
    } catch {
      toast.error('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const inputClass = 'w-full bg-white/5 border border-white/12 text-white placeholder:text-white/52 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors duration-200';

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--ink)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1B7A4A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!lead) return null;

  const activityLog = [...(lead.activity_log || [])].reverse();

  return (
    <div className="min-h-screen bg-[var(--ink)]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--ink)]/95 backdrop-blur border-b border-white/8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => navigate('/staff/dashboard')}
              className="text-white/65 hover:text-white flex items-center gap-1.5 text-sm transition-colors duration-200 shrink-0"
            >
              <ArrowLeft size={14} /> Dashboard
            </button>
            <span className="text-white/38 shrink-0">/</span>
            <span className="text-white text-sm truncate">
              {lead.first_name} {lead.last_name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {saving && <Loader2 size={14} className="text-white/58 animate-spin" />}
            {/* Back to website */}
            <Link
              to="/"
              className="flex items-center gap-1 text-white/58 hover:text-white text-xs font-medium border border-white/12 hover:border-white/28 px-2.5 py-1.5 rounded-md transition-colors duration-200"
            >
              <ArrowLeft size={11} />
              <span>Website</span>
            </Link>
            <button onClick={() => { logout(); navigate('/staff/login'); }} className="text-white/58 hover:text-white/70 p-1.5 rounded">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Mobile: Tabs layout | Desktop: Side by side */}
        <div className="block lg:hidden">
          <Tabs defaultValue="profile">
            <TabsList className="bg-white/5 border border-white/10 mb-5 w-full">
              <TabsTrigger value="profile" className="flex-1 text-xs data-[state=active]:bg-[#1B7A4A] data-[state=active]:text-white">Profile</TabsTrigger>
              <TabsTrigger value="notes" className="flex-1 text-xs data-[state=active]:bg-[#1B7A4A] data-[state=active]:text-white">Notes & Actions</TabsTrigger>
              <TabsTrigger value="activity" className="flex-1 text-xs data-[state=active]:bg-[#1B7A4A] data-[state=active]:text-white">Activity</TabsTrigger>
            </TabsList>
            <TabsContent value="profile"><ProfileCard lead={lead} statusValue={statusValue} onStatusChange={handleStatusChange} followUpDate={followUpDate} setFollowUpDate={setFollowUpDate} followUpTime={followUpTime} setFollowUpTime={setFollowUpTime} onSaveFollowUp={handleSaveFollowUp} /></TabsContent>
            <TabsContent value="notes"><NotesSection editNotes={editNotes} setEditNotes={setEditNotes} onSave={handleSaveNotes} noteText={noteText} setNoteText={setNoteText} onAddNote={handleAddNote} addingNote={addingNote} inputClass={inputClass} /></TabsContent>
            <TabsContent value="activity"><ActivityTimeline log={activityLog} /></TabsContent>
          </Tabs>
        </div>

        <div className="hidden lg:grid grid-cols-12 gap-6">
          {/* Left — Profile + Status */}
          <div className="col-span-4 space-y-5">
            <ProfileCard lead={lead} statusValue={statusValue} onStatusChange={handleStatusChange} followUpDate={followUpDate} setFollowUpDate={setFollowUpDate} followUpTime={followUpTime} setFollowUpTime={setFollowUpTime} onSaveFollowUp={handleSaveFollowUp} />
          </div>
          {/* Right — Notes + Activity */}
          <div className="col-span-8 space-y-5">
            <NotesSection editNotes={editNotes} setEditNotes={setEditNotes} onSave={handleSaveNotes} noteText={noteText} setNoteText={setNoteText} onAddNote={handleAddNote} addingNote={addingNote} inputClass={inputClass} />
            <ActivityTimeline log={activityLog} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileCard({ lead, statusValue, onStatusChange, followUpDate, setFollowUpDate, followUpTime, setFollowUpTime, onSaveFollowUp }) {
  return (
    <div className="card-marketing p-5 space-y-4">
      {/* Name + Status */}
      <div>
        <h1 className="font-display text-2xl text-white tracking-wide">
          {lead.first_name} {lead.last_name}
        </h1>
        <StatusBadge status={lead.status} />
      </div>

      <Separator className="bg-white/8" />

      {/* Contact */}
      <div className="space-y-2.5">
        {lead.phone && (
          <div className="flex items-center gap-2">
            <button onClick={() => gvCall(lead.phone)}
              data-testid="lead-call-btn"
              className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors duration-200 flex-1">
              <Phone size={14} className="text-[#1B7A4A] shrink-0" />{formatPhone(lead.phone)}
            </button>
            <button onClick={() => gvCall(lead.phone)}
              title="Call via Google Voice"
              className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#1B7A4A]/15 border border-[#1B7A4A]/25 text-[#7FCCA6] hover:bg-[#1B7A4A]/30 transition-colors duration-150">
              Call
            </button>
            <button onClick={() => gvText(lead.phone)}
              title="Text via Google Voice"
              className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/25 text-purple-300 hover:bg-purple-500/25 transition-colors duration-150">
              Text
            </button>
          </div>
        )}
        {lead.email && (
          <a href={`mailto:${lead.email}`} className="flex items-center gap-2.5 text-sm text-white/70 hover:text-white transition-colors duration-200">
            <Mail size={14} className="text-[#1B7A4A]" />{lead.email}
          </a>
        )}
      </div>

      <Separator className="bg-white/8" />

      {/* Lead Info */}
      <dl className="space-y-2">
        {[
          { label: 'Interest', value: lead.interest_type },
          { label: 'Timeline', value: lead.start_timeline },
          { label: 'Contact Pref.', value: lead.preferred_contact },
          { label: 'Source', value: SOURCE_LABELS[lead.lead_source] || lead.lead_source },
          { label: 'Location', value: lead.location },
          { label: 'Created', value: lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '—' },
        ].map((row) => (
          <div key={row.label} className="flex justify-between text-xs">
            <dt className="text-white/58">{row.label}</dt>
            <dd className="text-white/80 text-right">{row.value || '—'}</dd>
          </div>
        ))}
        {lead.training_goals && (
          <div className="pt-1">
            <dt className="text-white/58 text-xs mb-1">Training Goals</dt>
            <dd className="text-white/70 text-xs leading-relaxed">{lead.training_goals}</dd>
          </div>
        )}
      </dl>

      <Separator className="bg-white/8" />

      {/* Status Change */}
      <div>
        <label className="block text-xs text-white/65 mb-1.5">Update Status</label>
        <Select value={statusValue} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full bg-white/5 border-white/12 text-white text-sm" data-testid="crm-lead-detail-status-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[var(--elevated)] border-white/12">
            {LEAD_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-white text-sm">{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Follow-up date + time */}
      <div>
        <label className="block text-xs text-white/65 mb-1.5">Follow-up / Tour — Date & Time</label>
        <input
          type="date"
          value={followUpDate}
          onChange={(e) => setFollowUpDate(e.target.value)}
          className="w-full bg-white/5 border border-white/12 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/45 mb-2"
          style={{ colorScheme: 'dark' }}
        />
        <TimeQuickSelect
          value={followUpTime}
          onChange={setFollowUpTime}
          selectedDate={followUpDate}
        />
        <button onClick={onSaveFollowUp} className="btn-scs-primary px-3 py-1.5 rounded-md text-xs w-full mt-2">
          Save Follow-up
        </button>
        {(lead.next_follow_up_date) && (
          <p className="text-white/52 text-xs mt-1.5">
            Saved: {new Date(lead.next_follow_up_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            {lead.next_follow_up_time && ` at ${formatTime12(lead.next_follow_up_time)}`}
          </p>
        )}
      </div>

      {/* Tags */}
      {lead.tags && lead.tags.length > 0 && (
        <div>
          <p className="text-xs text-white/58 mb-2">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {lead.tags.map((tag, i) => (
              <span key={i} className="text-xs bg-white/8 text-white/60 border border-white/10 px-2 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NotesSection({ editNotes, setEditNotes, onSave, noteText, setNoteText, onAddNote, addingNote, inputClass }) {
  return (
    <div className="card-marketing p-5 space-y-4">
      {/* Quick Add Note */}
      <div>
        <h3 className="text-white text-sm font-semibold mb-2">Add a Note</h3>
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Log a call, text, email, or observation..."
          rows={2}
          data-testid="crm-lead-detail-add-note-textarea"
          className={`${inputClass} resize-none`}
        />
        <button
          onClick={onAddNote}
          disabled={addingNote || !noteText.trim()}
          data-testid="crm-lead-detail-add-note-submit-button"
          className="mt-2 btn-scs-primary px-4 py-2 rounded-md text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
        >
          {addingNote ? <><Loader2 size={12} className="animate-spin" /> Adding...</> : <><MessageSquare size={12} /> Add Note</>}
        </button>
      </div>

      <Separator className="bg-white/8" />

      {/* Long-form notes */}
      <div>
        <h3 className="text-white text-sm font-semibold mb-2">General Notes</h3>
        <textarea
          value={editNotes}
          onChange={(e) => setEditNotes(e.target.value)}
          placeholder="Running notes about this lead..."
          rows={4}
          className={`${inputClass} resize-none`}
        />
        <button
          onClick={onSave}
          className="mt-2 btn-scs-secondary px-4 py-2 rounded-md text-xs font-semibold"
        >
          Save Notes
        </button>
      </div>
    </div>
  );
}

function ActivityTimeline({ log }) {
  return (
    <div className="card-marketing p-5" data-testid="crm-lead-detail-activity-timeline">
      <h3 className="text-white text-sm font-semibold mb-4">Activity Timeline</h3>
      {log.length === 0 ? (
        <p className="text-white/52 text-sm">No activity yet.</p>
      ) : (
        <div className="space-y-3">
          {log.map((entry, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-[#1B7A4A] mt-1 shrink-0" />
                {i < log.length - 1 && <div className="w-0.5 flex-1 bg-white/10 my-1" />}
              </div>
              <div className="pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white text-xs font-medium">{entry.action}</span>
                  <span className="text-white/48 text-xs">
                    {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : ''}
                  </span>
                  {entry.staff_name && (
                    <span className="text-white/48 text-xs">by {entry.staff_name}</span>
                  )}
                </div>
                {entry.note && (
                  <p className="text-white/60 text-xs mt-0.5 leading-relaxed">{entry.note}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
