import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Database,
  Mail,
  MessageSquareText,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import './ImplementationPreview.css';

const API_BASE = process.env.REACT_APP_LOCAL_INTEGRATION_API || 'http://127.0.0.1:4210';
const BRAND_ID = 'santa_cruz_strength';
const SOURCES = [
  ['paid_social', 'Meta paid social'],
  ['organic_search', 'Google organic search'],
  ['organic_social', 'Instagram organic'],
  ['referral', 'Member referral'],
  ['direct_or_unknown', 'Direct or unknown'],
];
const NEXT_ACTION = {
  lead_received: ['request_tour', 'Record tour request'],
  tour_requested: ['confirm_tour', 'Confirm tour'],
  tour_confirmed: ['attend_tour', 'Record attendance'],
  tour_attended: ['activate_membership', 'Activate test membership'],
};

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.errors?.join(' ') || body.error || 'Local integration request failed');
  return body;
}

function StateMark({ state }) {
  const ready = ['connected', 'contract_connected', 'local_event_queue'].includes(state);
  return ready ? <CheckCircle2 size={17} aria-hidden="true" /> : <CircleAlert size={17} aria-hidden="true" />;
}

export default function ImplementationPreview() {
  const [system, setSystem] = useState(null);
  const [journey, setJourney] = useState(null);
  const [form, setForm] = useState({
    first_name: 'Santa Cruz',
    email: 'santacruz.preview@example.com',
    phone: '+12025550142',
    source: 'paid_social',
    sms_consent: true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const safetyLocked = Boolean(
    system?.mode === 'isolated_local'
    && system?.safety?.production_dispatch_locked === true
    && system?.external_writes === false
  );

  const loadStatus = useCallback(async () => {
    try {
      setSystem(await request(`/api/status?brand=${BRAND_ID}`));
      setError('');
    } catch (statusError) {
      setError(`${statusError.message}. Start the local integration API on port 4210.`);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const submitLead = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await request('/api/journeys', {
        method: 'POST',
        body: JSON.stringify({ ...form, brand_id: BRAND_ID }),
      });
      setJourney(result.journey);
      await loadStatus();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  };

  const advance = async () => {
    const action = NEXT_ACTION[journey?.state]?.[0];
    if (!action) return;
    setBusy(true);
    setError('');
    try {
      const result = await request(`/api/journeys/${journey.request_id}/actions`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      setJourney(result.journey);
    } catch (advanceError) {
      setError(advanceError.message);
    } finally {
      setBusy(false);
    }
  };

  const fieldMap = useMemo(() => journey ? [
    ['CRM request ID', journey.request_id],
    ['CRM lead ID', journey.lead_id],
    ['Brand and location', `${journey.brand_id} / ${journey.location_id}`],
    ['Assigned owner', `${journey.routing.owner} / ${journey.routing.primary_status}`],
    ['Consent snapshot', journey.crm.lead.consent.sms_operational_opt_in ? 'Operational SMS accepted' : 'SMS suppressed'],
    ['First-touch source', journey.crm.lead.attribution.first_touch.channel_group],
    ['GymMaster prospect', journey.gymmaster.link?.gymmaster_prospect_id || 'Pending'],
    ['Current lifecycle state', journey.state],
    ['External writes', String(journey.external_writes)],
  ] : [], [journey]);

  const services = system ? [
    ['CRM', system.crm, Database],
    ['Resend', system.resend, Mail],
    ['Twilio', system.twilio, MessageSquareText],
    ['GymMaster', system.gymmaster, UserCheck],
  ] : [];

  return (
    <div className="scs-ops-page">
      <header className="scs-ops-header">
        <Link to="/"><ArrowLeft size={17} aria-hidden="true" />Website</Link>
        <div><strong>Santa Cruz Strength</strong><span>Local lead operations</span></div>
        <button type="button" onClick={loadStatus}><RefreshCw size={16} aria-hidden="true" />Refresh connections</button>
      </header>

      <main className="scs-ops-main" id="main-content">
        <div className="scs-ops-title">
          <div>
            <h1>Lead journey test</h1>
            <p>Submit one synthetic Santa Cruz lead, inspect key mapped fields, then advance the record through tour and membership states.</p>
          </div>
          <span className={`scs-ops-safety ${safetyLocked ? 'is-verified' : 'is-blocked'}`}>
            {system ? (safetyLocked ? 'Runtime verified: external writes disabled.' : 'Safety gate unavailable. Testing disabled.') : 'Checking runtime safety…'}
          </span>
        </div>

        {error && <div className="scs-ops-error" role="alert"><CircleAlert size={18} aria-hidden="true" />{error}</div>}

        <section className="scs-ops-services" aria-label="Connection status">
          {services.map(([label, detail, Icon]) => (
            <div key={label}>
              <Icon size={20} aria-hidden="true" />
              <span><strong>{label}</strong><small>{detail.state.replaceAll('_', ' ')}</small></span>
              <StateMark state={detail.state} />
            </div>
          ))}
        </section>

        <div className="scs-ops-workspace">
          <form className="scs-ops-form" onSubmit={submitLead}>
            <h2>Create a safe test lead</h2>
            <p>Only reserved example contact details are accepted by the local API.</p>
            <label>First name<input value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} /></label>
            <label>Test email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label>Reserved test phone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
            <label>Acquisition source<select value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })}>{SOURCES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label className="scs-ops-consent"><input type="checkbox" checked={form.sms_consent} onChange={(event) => setForm({ ...form, sms_consent: event.target.checked })} /><span><strong>Operational SMS consent</strong><small>Marketing permission remains off.</small></span></label>
            <button type="submit" disabled={busy || !safetyLocked}>{busy ? 'Working…' : 'Create CRM lead and outbox'}</button>
          </form>

          <section className="scs-ops-record" aria-live="polite">
            <div className="scs-ops-record-head">
              <div><h2>Journey record</h2><p>{journey ? 'Created by the localhost API and saved to the isolated store.' : 'No test lead has been created in this session.'}</p></div>
              {journey && <span>{journey.state.replaceAll('_', ' ')}</span>}
            </div>
            {!journey ? (
              <div className="scs-ops-empty"><Database size={28} aria-hidden="true" /><p>The mapped CRM record, delivery jobs, staff owner and GymMaster receipt will appear here.</p></div>
            ) : (
              <>
                <dl className="scs-ops-map">{fieldMap.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{String(value).replaceAll('_', ' ')}</dd></div>)}</dl>
                <div className="scs-ops-actions">
                  {NEXT_ACTION[journey.state] ? <button type="button" onClick={advance} disabled={busy || !safetyLocked}>{NEXT_ACTION[journey.state][1]}</button> : <strong><CheckCircle2 size={18} aria-hidden="true" />Local lead-to-member journey complete</strong>}
                </div>
              </>
            )}
          </section>
        </div>

        {journey && (
          <div className="scs-ops-detail">
            <section>
              <h2>Delivery outbox</h2>
              <p>Jobs are persistent locally. Provider dispatch stays locked until credentials, allowlists and explicit test approval are present.</p>
              <ul>{journey.delivery_outbox.map((job, index) => <li key={`${job.provider}-${index}`}><span>{job.provider.replaceAll('_', ' ')}</span><strong>{job.purpose || job.interest || 'staff alert'}</strong><small>{job.state.replaceAll('_', ' ')}</small></li>)}</ul>
            </section>
            <section>
              <h2>Lifecycle audit</h2>
              <p>Every transition keeps the same request ID, lead ID, consent and attribution context.</p>
              <ol>{journey.timeline.map((item) => <li key={`${item.state}-${item.occurred_at}`}><CheckCircle2 size={16} aria-hidden="true" /><span>{item.state.replaceAll('_', ' ')}</span><time>{new Date(item.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></li>)}</ol>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
