// Santa Cruz Strength — Business Configuration
// Edit this file to update contact info, hours, links, etc.

export const GYM_CONFIG = {
  name: 'Santa Cruz Strength',
  tagline: 'Train Hard. Stay Local.',
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
  email: 'info@santacruzstrength.com',
  // ABC Fitness signup link
  joinUrl: 'https://onlinejoin.abcfitness.com/signup/plan?club=31691',
  // Hours — update these as needed
  hours: [
    { days: 'Monday – Friday', hours: '5:30 AM – 9:00 PM' },
    { days: 'Saturday', hours: '7:00 AM – 5:00 PM' },
    { days: 'Sunday', hours: '8:00 AM – 2:00 PM' },
  ],
  // Google Maps embed (update with actual embed URL)
  mapEmbedUrl:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3189.9!2d-122.0308!3d36.9741!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x808e41b53c63b4c1%3A0xf0d70e1a3b4c6a7b!2s151+Harvey+West+Blvd%2C+Santa+Cruz%2C+CA+95060!5e0!3m2!1sen!2sus!4v1234567890',
  // Social
  social: {
    instagram: 'https://instagram.com/santacruzstrength',
    facebook: 'https://facebook.com/santacruzstrength',
  },
};

export const LEAD_SOURCES = [
  { value: 'website_form', label: 'Website Form' },
  { value: 'book_a_visit', label: 'Book a Visit' },
  { value: 'contact_page', label: 'Contact Page' },
  { value: 'personal_training_inquiry', label: 'Personal Training Inquiry' },
  { value: 'manual_entry', label: 'Manual Entry' },
];

export const LEAD_STATUSES = [
  { value: 'New', label: 'New', color: 'bg-white/10 text-white border-white/15' },
  { value: 'Contacted', label: 'Contacted', color: 'bg-blue-500/15 text-blue-300 border-blue-500/20' },
  { value: 'Attempted Call', label: 'Attempted Call', color: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/20' },
  { value: 'Texted', label: 'Texted', color: 'bg-purple-500/15 text-purple-300 border-purple-500/20' },
  { value: 'Booked Visit', label: 'Booked Visit', color: 'bg-[#6EA8B7]/15 text-[#BFE2EA] border-[#6EA8B7]/20' },
  { value: 'Trial Scheduled', label: 'Trial Scheduled', color: 'bg-orange-500/15 text-orange-300 border-orange-500/20' },
  { value: 'Joined', label: 'Joined', color: 'bg-green-600/15 text-green-300 border-green-600/20' },
  { value: 'No Response', label: 'No Response', color: 'bg-gray-500/15 text-gray-400 border-gray-500/20' },
  { value: 'Lost', label: 'Lost', color: 'bg-red-900/15 text-red-400 border-red-900/20' },
];

export const INTEREST_TYPES = [
  'General Membership',
  'Personal Training',
  'Group Classes',
  'Open Gym',
  'Powerlifting Program',
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
