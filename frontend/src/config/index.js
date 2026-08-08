// Santa Cruz Strength - Business Configuration
// Edit this file to update contact info, hours, links, etc.

// ---------------------------------------------------------------------------
// MEMBERSHIP SALES MODEL
//
// Memberships are sold in person, not online. The website books a visit and a
// coach completes signup on site through the CRM. Prices stay published so a
// visitor can evaluate cost before touring; only the purchase buttons are gone.
//
// Why: ABC Fitness is being retired. GymMaster Online, verified 2026-08-08,
// holds zero members, has no membership products configured and no payment
// gateway, so its signup portal returns "There are no memberships available".
// Pointing buyers at either system would send them to a dead end.
//
// Decision recorded 2026-08-08 by Muhammad, pending Mike's ratification.
//
// To reinstate online purchase: set sellsOnline true and give onlineJoinUrl the
// provider's destination. Every join link in the app derives from joinUrl().
// ---------------------------------------------------------------------------
export const MEMBERSHIP = {
  sellsOnline: false,
  onlineJoinUrl: '',
  tourUrl: 'https://santacruzstrength.com/join#book-a-tour',
};

// The single membership destination. Falls back to the tour whenever online
// selling is off or unconfigured, so a half-finished migration cannot strand a
// visitor on a provider that has nothing to sell.
export const joinUrl = () =>
  MEMBERSHIP.sellsOnline && MEMBERSHIP.onlineJoinUrl
    ? MEMBERSHIP.onlineJoinUrl
    : MEMBERSHIP.tourUrl;

export const GYM_CONFIG = {
  name: 'Santa Cruz Strength',
  tagline: 'Strength for life on the coast.',
  location: 'santa_cruz',
  address: {
    street: '151 Harvey West Blvd Ste D',
    city: 'Santa Cruz',
    state: 'CA',
    zip: '95060',
    full: '151 Harvey West Blvd Ste D, Santa Cruz, CA 95060',
  },
  phone: '(408) 337-6709',
  phoneHref: 'tel:+14083376709',
  email: 'management@santacruzstrength.com',
  // Membership destination. Derived from MEMBERSHIP above, never hardcoded.
  joinUrl: joinUrl(),
  // Hours - update these as needed
  // Hours as published by the business. This is the single source; no page may
  // state hours independently. Pending a dated owner confirmation that these
  // are current, tracked as T-04.
  hours: [
    { days: 'Members', hours: '24 / 7 Access', note: 'Via mobile app' },
    { days: 'Day Passes', hours: '9:00 AM to 6:00 PM', note: 'Monday through Sunday' },
    { days: 'Staffed Hours', hours: 'Mon to Fri: 8 AM to 7 PM', note: 'Sat and Sun: 9 AM to 2 PM' },
  ],
  // Google Review direct link
  // Get this from: google.com/business → "Get more reviews" → copy link
  googleReviewUrl: 'https://g.page/r/CUj8NPJ7NHNOEAE/review',
  googleMapsUrl: 'https://maps.app.goo.gl/cBFaKiDgratKXp1m6',
  mapEmbedUrl: 'https://www.google.com/maps?q=151+Harvey+West+Blvd+Ste+D,+Santa+Cruz,+CA+95060&output=embed',
  // Social
  social: {
    instagram: 'https://www.instagram.com/santacruzstrength/',
    facebook: 'https://www.facebook.com/santacruzstrength',
  },
  // Instagram handle (without @)
  instagramHandle: 'santacruzstrength',
  // Behold.so widget feed ID - get yours free at behold.so:
  //   1. Sign up at https://behold.so (free)
  //   2. Connect your @santacruzstrength Instagram account
  //   3. Create a "Widget" feed → copy the Feed ID (looks like: abc123xyz)
  //   4. Paste it below and save
  beholdFeedId: 'IQB2fFQS1nAFKCbQ7SrH',
};

// Membership tiers exactly as published at santacruzstrength.com/join.
// Do not edit prices or terms here without a dated owner approval; these are
// commercial representations, not marketing copy.
export const MEMBERSHIP_FEE_NOTE =
  'All memberships carry a $50 annual enhancement fee. All cancellations require 30-day notice prior to the last billing date. Commitment memberships auto-renew to month-to-month at the end of the initial term.';

export const MEMBERSHIP_TIERS = [
  {
    id: 'daypass', name: 'Day Pass', subtitle: '', price: '$20', cadence: 'same-day',
    planId: '50837530f58641c38108fea62255030b', action: 'Get a day pass', tag: 'Try us out',
    terms: ['Valid for same-day use only', 'Access during staffed hours'],
  },
  {
    id: 'huscler-12', name: 'Huscler', subtitle: '12-month membership', price: '$75', cadence: 'per month',
    planId: '823263ef0c354fd29bade28c18f280f2', action: 'Choose Huscler', tag: 'Most popular', featured: true,
    terms: ['24/7 facility access via app', 'Unlimited open gym', 'Competition-grade equipment', '12-month initial agreement'],
  },
  {
    id: 'annual', name: 'Annual Huscler', subtitle: 'Paid in full, one month free', price: '$825', cadence: 'one-time',
    planId: '7a1dd8cec5cd4f30af82429e4f5957c5', action: 'Choose annual', tag: 'Best value',
    note: '13 months total, $63 per month effective',
    terms: ['24/7 facility access via app', '13 months total, one month free', 'Paid in full at signup'],
  },
  {
    id: 'huscler-6', name: 'Huscler 6-Month', subtitle: '6-month agreement', price: '$82', cadence: 'per month',
    planId: '5efa1abd3436408a99c4ce18c6216be2', action: 'Choose 6-month',
    terms: ['6-month initial agreement'],
  },
  {
    id: 'flex', name: 'Flex Huscler', subtitle: 'Month-to-month, no commitment', price: '$120', cadence: 'per month',
    planId: 'a772569e9c38408c90fab7b9bda49fca', action: 'Choose Flex',
    terms: ['Billed monthly until canceled', 'No agreement required'],
  },
  {
    id: 'couples-12', name: 'Couples 12-Month', subtitle: 'Two members', price: '$120', cadence: 'per month',
    planId: 'fdf12470797b47a1a6ac3c11c764d46e', action: 'Choose couples', note: '$60 per person',
    terms: ['12-month initial agreement'],
  },
  {
    id: 'couples-6', name: 'Couples 6-Month', subtitle: 'Two members', price: '$136', cadence: 'per month',
    planId: '5d08a9e72aef4c8da136ab822f550eca', action: 'Choose couples', note: '$68 per person',
    terms: ['6-month initial agreement'],
  },
  {
    id: 'weekend-12', name: 'Weekend Warrior 12-Month', subtitle: 'Friday to Sunday access only', price: '$45', cadence: 'per month',
    planId: '11b156f6da6e43289a145de648034aa9', action: 'Choose weekend',
    terms: ['12-month initial agreement', 'Friday through Sunday access'],
  },
  {
    id: 'weekend-6', name: 'Weekend Warrior 6-Month', subtitle: 'Friday to Sunday access only', price: '$55', cadence: 'per month',
    planId: '4383e794de444449b5a1dd4b5160a6b4', action: 'Choose weekend',
    terms: ['6-month initial agreement', 'Friday through Sunday access'],
  },
  // planId is retained as provider reference data for a future migration.
  // It builds no link while memberships are sold in person.
].map((tier) => ({ ...tier, link: joinUrl() }));

export const LEAD_SOURCES = [
  // Priority sources - most current, highest intent
  { value: 'website_form',               label: 'Website Form',               priority: true },
  { value: 'book_a_tour',                label: 'Book a Tour',                priority: true },
  { value: 'contact_page',               label: 'Contact Page',               priority: true },
  { value: 'personal_training_inquiry',  label: 'Personal Training',          priority: true },
  { value: 'walk_in',                    label: 'Walk-In',                    priority: true },
  // Imported / historical
  { value: 'csv_import',                 label: 'CSV Import',                 priority: false },
  { value: 'manual_entry',               label: 'Manual Entry',               priority: false },
];

export const LEAD_STATUSES = [
  { value: 'New', label: 'New Lead', color: 'bg-white/10 text-white border-white/15', kanban: 'new' },
  { value: 'Contacted', label: 'Contacted', color: 'bg-[#2E6B8F]/20 text-[#8BC4DF] border-[#2E6B8F]/25', kanban: 'contacted' },
  { value: 'Attempted Call', label: 'Attempted Call', color: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/20', kanban: 'contacted' },
  { value: 'Texted', label: 'Texted', color: 'bg-purple-500/15 text-purple-300 border-purple-500/20', kanban: 'contacted' },
  { value: 'Booked Visit', label: 'Booked Tour', color: 'bg-[#1B7A4A]/20 text-[#7FCCA6] border-[#1B7A4A]/25', kanban: 'visit_booked' },
  { value: 'Trial Scheduled', label: 'Trial Scheduled', color: 'bg-[#1B7A4A]/15 text-[#5FBB90] border-[#1B7A4A]/20', kanban: 'visit_booked' },
  { value: 'Joined', label: 'Member', color: 'bg-green-600/20 text-green-300 border-green-600/25', kanban: 'member' },
  { value: 'No Response', label: 'No Response', color: 'bg-gray-500/15 text-gray-400 border-gray-500/20', kanban: 'closed' },
  { value: 'Lost', label: 'Not Interested', color: 'bg-zinc-800/50 text-zinc-500 border-zinc-700/30', kanban: 'closed' },
];

export const KANBAN_COLUMNS = [
  {
    id: 'new',
    title: 'New Leads',
    statuses: ['New'],
    color: 'border-white/15',
    headerColor: 'text-white',
    dotColor: 'bg-white/50',
  },
  {
    id: 'contacted',
    title: 'Contacted',
    statuses: ['Contacted', 'Attempted Call', 'Texted'],
    color: 'border-[#2E6B8F]/30',
    headerColor: 'text-[#8BC4DF]',
    dotColor: 'bg-[#2E6B8F]',
  },
  {
    id: 'visit_booked',
    title: 'Tour / Trial',
    statuses: ['Booked Visit', 'Trial Scheduled'],
    color: 'border-[#1B7A4A]/30',
    headerColor: 'text-[#7FCCA6]',
    dotColor: 'bg-[#1B7A4A]',
  },
  {
    id: 'member',
    title: 'Member',
    statuses: ['Joined'],
    color: 'border-green-500/30',
    headerColor: 'text-green-400',
    dotColor: 'bg-green-500',
  },
  {
    id: 'closed',
    title: 'Closed',
    statuses: ['No Response', 'Lost'],
    color: 'border-zinc-700/30',
    headerColor: 'text-zinc-500',
    dotColor: 'bg-zinc-600',
  },
];

export const INTEREST_TYPES = [
  'General Membership',
  'Personal Training',
  'Group Classes',
  'Open Gym',
  'Powerlifting Program',
  'Performance / Sport Training',
  'Other',
];

export const START_TIMELINES = [
  'ASAP',
  '1-2 weeks',
  '1 month',
  'Just exploring',
];

export const PREFERRED_CONTACTS = [
  { value: 'call', label: 'Phone Call' },
  { value: 'text', label: 'Text Message' },
  { value: 'email', label: 'Email' },
];
