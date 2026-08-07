import { isPreviewMode } from './previewSafety';
import { buildMemberLeadPayload } from './leadContracts';

export function createInitialTourForm({ source, location }) {
  return {
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    interest_type: '',
    start_timeline: '',
    training_goals: '',
    preferred_contact: 'call',
    lead_source: source,
    location,
    notes: '',
    sms_consent: false,
  };
}

export function buildTourLeadPayload({ form, source, attribution, requestId }) {
  return buildMemberLeadPayload({
    form,
    source,
    attribution,
    requestId,
    formId: 'homepage_free_tour',
    offerId: 'free_facility_tour',
  });
}

export function isTourPreviewMode(value = process.env.REACT_APP_PREVIEW_MODE) {
  return isPreviewMode(value);
}
