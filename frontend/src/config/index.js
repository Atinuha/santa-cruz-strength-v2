// Santa Cruz Strength — Business Configuration
// Edit this file to update contact info, hours, links, etc.

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
  // ABC Fitness signup link
  joinUrl: 'https://onlinejoin.abcfitness.com/signup/plan?club=31691',
  // Hours — update these as needed
  hours: [
    { days: 'Members', hours: '24 / 7 Access', note: 'Via mobile app' },
    { days: 'Day Passes', hours: '9:00 AM – 6:00 PM', note: 'Monday – Sunday' },
    { days: 'Staffed Hours', hours: 'Mon–Fri: 8 AM – 7 PM', note: 'Sat–Sun: 9 AM – 2 PM' },
  ],
  // Google Maps embed
  mapEmbedUrl:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3189.9!2d-122.0308!3d36.9741!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x808e41b53c63b4c1%3A0xf0d70e1a3b4c6a7b!2s151+Harvey+West+Blvd%2C+Santa+Cruz%2C+CA+95060!5e0!3m2!1sen!2sus!4v1234567890',
  // Social
  social: {
    instagram: 'https://www.instagram.com/santacruzstrength/',
    facebook: 'https://www.facebook.com/santacruzstrength',
  },
  // Instagram handle (without @)
  instagramHandle: 'santacruzstrength',
  // Behold.so widget feed ID — get yours free at behold.so:
  //   1. Sign up at https://behold.so (free)
  //   2. Connect your @santacruzstrength Instagram account
  //   3. Create a "Widget" feed → copy the Feed ID (looks like: abc123xyz)
  //   4. Paste it below and save
  beholdFeedId: 'IQB2fFQS1nAFKCbQ7SrH',
};

export const LEAD_SOURCES = [
  { value: 'website_form', label: 'Website Form' },
  { value: 'book_a_tour', label: 'Book a Tour' },
  { value: 'contact_page', label: 'Contact Page' },
  { value: 'personal_training_inquiry', label: 'Personal Training Inquiry' },
  { value: 'walk_in', label: 'Walk-In' },
  { value: 'csv_import', label: 'CSV Import' },
  { value: 'manual_entry', label: 'Manual Entry' },
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
