import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send, Save, Loader2, Check, Smartphone, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { MERGE_FIELDS } from '../../utils/emailBlocks';
import api from '../../lib/api';
import { abcJoinUrl } from '../../config';

// TCPA-required opt-out footer
const OPT_OUT_SUFFIX = ' Reply STOP to opt out.';
// Segment lengths
const SEG1 = 160;
const SEG_MULTI = 153; // with UDH header

function segmentCount(text) {
  if (text.length <= SEG1) return 1;
  return Math.ceil(text.length / SEG_MULTI);
}

function charStatus(len) {
  if (len <= SEG1) return { color: 'text-[#7FCCA6]', label: `${len}/${SEG1} · 1 segment` };
  const segs = segmentCount(len);
  const remaining = segs * SEG_MULTI - len;
  return {
    color: segs === 2 ? 'text-amber-400' : 'text-red-400',
    label: `${len} chars · ${segs} segments (${remaining} left in segment)`
  };
}

// Phone mockup preview
function PhoneMockup({ text, gymName = 'Santa Cruz Strength' }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-64 bg-[#1C1C1E] rounded-[2.5rem] p-4 shadow-2xl border-4 border-[#3A3A3C]">
        {/* Notch */}
        <div className="w-24 h-5 bg-[#1C1C1E] rounded-full mx-auto mb-3 border-2 border-[#3A3A3C]" />
        {/* Screen */}
        <div className="bg-[#F2F2F7] rounded-2xl p-3 min-h-[200px]">
          <p className="text-[10px] text-[#8E8E93] text-center mb-3 font-medium">{gymName}</p>
          {text ? (
            <div className="flex justify-start">
              <div className="bg-[#E9E9EB] rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%]">
                <p className="text-[11px] text-[#1C1C1E] leading-relaxed whitespace-pre-wrap">{text}</p>
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-[#C7C7CC] text-center mt-8">Your message will appear here</p>
          )}
        </div>
        {/* Home bar */}
        <div className="w-24 h-1 bg-[#3A3A3C] rounded-full mx-auto mt-3" />
      </div>
      <p className="text-white/25 text-[10px] mt-3">SMS Preview</p>
    </div>
  );
}

export default function SMSBuilder() {
  const { campaignId } = useParams();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState(null);
  const [smsText, setSmsText]   = useState('');
  const [saving, setSaving]     = useState(false);
  const [testSending, setTestSending] = useState(false);

  useEffect(() => {
    api.get(`/staff/campaigns/${campaignId}`)
      .then(res => {
        setCampaign(res.data);
        setSmsText(res.data.sms_template || defaultSMS(res.data));
      }).catch(() => toast.error('Failed to load campaign'));
  }, [campaignId]);

  function defaultSMS(c) {
    const joinUrl = c?.join_url || abcJoinUrl();
    return `Hey {{first_name}}, Santa Cruz Strength here. We've been thinking about you. Sign up for any committed membership and we'll give you 2 months free. No catch. ${joinUrl}${OPT_OUT_SUFFIX}`;
  }

  // Insert merge field at cursor
  const insertMerge = (tag) => {
    const ta = document.getElementById('sms-textarea');
    const pos = ta?.selectionStart ?? smsText.length;
    setSmsText(prev => prev.slice(0, pos) + tag + prev.slice(pos));
    setTimeout(() => { if (ta) { ta.selectionStart = ta.selectionEnd = pos + tag.length; ta.focus(); } }, 0);
  };

  // Ensure opt-out is always present
  const ensureOptOut = (text) => {
    if (!text.includes('STOP')) return text + OPT_OUT_SUFFIX;
    return text;
  };

  const handleSave = async () => {
    setSaving(true);
    const finalText = ensureOptOut(smsText);
    try {
      await api.put(`/staff/campaigns/${campaignId}`, { sms_template: finalText });
      setSmsText(finalText);
      toast.success('SMS saved');
    } catch (err) { console.error('Failed to save SMS:', err); toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleTestSend = async () => {
    if (!campaign) return;
    setTestSending(true);
    try {
      const res = await api.post(`/staff/campaigns/${campaignId}/test-sms`);
      toast.success(`Test SMS sent to ${res.data.sent_to}`);
    } catch (err) { toast.error(err.response?.data?.detail || 'SMS test failed - check MailerSend setup'); }
    finally { setTestSending(false); }
  };

  const status = charStatus(smsText.length);
  const previewText = smsText
    .replace(/\{\{first_name\}\}/g, 'Alex')
    .replace(/\{\{last_name\}\}/g, 'Johnson')
    .replace(/\{\{gym_name\}\}/g, 'Santa Cruz Strength')
    .replace(/\{\{join_url\}\}/g, 'https://onlinejoin.abcfitness.com/...')
    .replace(/\{\{gym_phone\}\}/g, '(408) 337-6709');

  const segs = segmentCount(smsText.length);

  return (
    <div className="min-h-screen bg-[var(--ink)] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 bg-[#0a0f0d] shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/staff/campaigns" className="text-white/40 hover:text-white transition-colors"><ArrowLeft size={16} /></Link>
          <div>
            <p className="text-white font-semibold text-sm">{campaign?.name || 'Campaign'}</p>
            <p className="text-white/30 text-[10px]">SMS Builder</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleTestSend} disabled={testSending || !smsText.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/6 border border-white/12 text-white/60 hover:text-white text-xs font-semibold transition-colors disabled:opacity-40">
            {testSending ? <Loader2 size={12} className="animate-spin"/> : <Send size={12}/>} Test SMS
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg btn-scs-primary text-xs font-bold disabled:opacity-50">
            {saving ? <Loader2 size={12} className="animate-spin"/> : <Check size={12}/>} Save
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">

        {/* LEFT - Editor */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-xl mx-auto space-y-5">

            {/* Merge field chips */}
            <div>
              <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Insert Merge Field</p>
              <div className="flex flex-wrap gap-2">
                {MERGE_FIELDS.map(mf => (
                  <button key={mf.tag} type="button" onClick={() => insertMerge(mf.tag)}
                    className="text-[11px] px-2.5 py-1.5 rounded-full bg-[#1B7A4A]/15 border border-[#1B7A4A]/25 text-[#7FCCA6] hover:bg-[#1B7A4A]/30 transition-colors font-mono">
                    {mf.tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Text area */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/40 text-xs font-bold uppercase tracking-wider">Message Text</p>
                <span className={`text-[10px] font-mono ${status.color}`}>{status.label}</span>
              </div>
              <textarea id="sms-textarea" value={smsText} onChange={e => setSmsText(e.target.value)}
                rows={8} data-testid="sms-textarea"
                className="w-full bg-white/5 border border-white/12 text-white placeholder:text-white/25 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1B7A4A]/50 font-mono leading-relaxed"
                placeholder="Type your SMS message here…"
              />

              {/* Segment indicator */}
              <div className="flex gap-1.5 mt-2">
                {Array.from({ length: Math.max(segs, 1) }).map((_, i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full ${i < segs ? (segs === 1 ? 'bg-[#1B7A4A]' : segs === 2 ? 'bg-amber-400' : 'bg-red-400') : 'bg-white/8'}`} />
                ))}
              </div>
            </div>

            {/* TCPA / compliance info */}
            <div className="bg-[#1B7A4A]/8 border border-[#1B7A4A]/20 rounded-xl p-4 space-y-2">
              <p className="text-[#7FCCA6] text-xs font-bold">📋 TCPA Compliance Rules</p>
              <ul className="text-white/45 text-[11px] space-y-1 leading-relaxed">
                <li>• "Reply STOP to opt out" must be in the message - auto-added if missing on save</li>
                <li>• Keep under 160 chars to avoid splitting (1 segment = 1 credit)</li>
                <li>• URL shorteners are fine - paste full URL and it counts toward chars</li>
                <li>• SMS replies are forwarded to management@santacruzstrength.com via webhook</li>
              </ul>
              <div className={`flex items-center gap-2 text-[10px] font-semibold mt-2 ${smsText.includes('STOP') ? 'text-[#7FCCA6]' : 'text-amber-400'}`}>
                {smsText.includes('STOP') ? '✅ Opt-out text present' : '⚠️ "STOP" opt-out missing - will be added on save'}
              </div>
            </div>

            {/* Reply info */}
            <div className="bg-white/3 border border-white/8 rounded-xl p-4">
              <p className="text-white/50 text-xs font-bold mb-1">📱 Reply Handling</p>
              <p className="text-white/30 text-[11px] leading-relaxed">
                Replies to this number go to MailerSend's inbound system and are forwarded
                to <strong className="text-white/50">management@santacruzstrength.com</strong> via
                the <code className="text-[10px] bg-white/8 px-1 py-0.5 rounded">/api/webhooks/mailersend-sms</code> webhook.
                Configure at: <span className="text-[#7FCCA6]">app.mailersend.com → SMS → Inbound</span>
              </p>
            </div>

          </div>
        </div>

        {/* RIGHT - Phone preview */}
        <div className="lg:w-72 border-t lg:border-t-0 lg:border-l border-white/8 p-6 flex flex-col items-center justify-start bg-[#0c1510]">
          <p className="text-white/30 text-xs font-bold uppercase tracking-wider mb-6 self-start">Live Preview</p>
          <PhoneMockup text={previewText} />
          <div className="mt-6 w-full space-y-2 text-center">
            <p className="text-white/25 text-[10px]">
              {segs === 1 ? '✅ Single segment - 1 credit per recipient' : `⚠️ ${segs} segments - ${segs} credits per recipient`}
            </p>
            {campaign?.total_leads && (
              <p className="text-white/20 text-[10px]">
                Estimated cost: {campaign.total_leads} × {segs} = {campaign.total_leads * segs} SMS credits
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
