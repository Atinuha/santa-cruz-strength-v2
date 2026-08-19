/**
 * Member statements, transcribed verbatim from santacruzstrength.com.
 *
 * These are real people's words about a real business, so the rules around them
 * are stricter than for any other copy on this site:
 *
 *   Nothing is edited. Not spelling, not grammar, not length, not the em dash in
 *   Jeremy's quote. A tidied review is a fabricated review.
 *
 *   Five stars render on every card, matching how the business already
 *   publishes these on its live site. Worth knowing what that is and is not:
 *   the live site draws them from `[...Array(5)]` with no rating field behind
 *   any review, so the stars are presentation rather than per-review data. The
 *   owner reviewed this and asked for them, and since these are genuine
 *   positive reviews already shown this way on the site they came from,
 *   reproducing the presentation is consistent rather than invented.
 *
 *   They carry aria-hidden, because a screen reader announcing "five stars"
 *   five times over would be asserting a rating the data does not hold. The
 *   words are the substance and the words are what gets read.
 *
 *   If a real rating ever arrives, put it in this file per review and render
 *   from it. Do not add a rating field that defaults to five.
 *
 *   No dates and no source attribution, because the live site publishes neither.
 *   Several read like Google reviews and the site does link a Google review URL
 *   elsewhere, but it never attributes these, so neither do we.
 *
 * The em dash rule that governs the rest of the site does not apply here. The
 * validator scans source files that carry OUR copy. Quoting a customer means
 * quoting the punctuation they used.
 */
export const MEMBER_STORIES = [
  {
    name: 'Jeremy Ball',
    detail: 'Member, Powerlifter',
    quote:
      "Hands down best gym in Santa Cruz if you're serious about powerlifting or bodybuilding. The gym gives old school vibes and is definitely barebones which is pretty sick. Open 24/7 — everything you need to get stronger.",
  },
  {
    name: 'Ella Desmond',
    detail: 'Member, 2 years',
    quote:
      'I have been going to this gym for about 2 years now and was greeted with the most amazing community ever. The people here are kind and supportive and are always happy to spot you and give tips. This gym has been foundational in my life.',
  },
  {
    name: 'Brooke Rodriguez',
    detail: 'Member, Santa Cruz',
    quote:
      'Amazing gym! Has everything you need with a super open and accepting environment. Owner is great, accommodating and knows his stuff! Gym is roomy and in a perfect location!',
  },
  {
    name: 'Taryn',
    detail: 'Member, Strength Athlete',
    quote:
      "Strength gyms should serve all types of athletes, and that's what Santa Cruz Strength does. From weightlifting to powerlifting to strongman to conditioning, whether you prefer solo or group training — this is a great place to be.",
  },
  {
    name: 'Ember Lichtenberg',
    detail: 'Member, Personal Training',
    quote:
      "I highly recommend Santa Cruz Strength and Lexi Medeiros as a personal trainer. She makes strength training feel welcoming, safe, and empowering. I've built strength, stayed injury-free, and feel fully supported in my goals.",
  },
  {
    name: 'Sierra Flow Fitness',
    detail: 'Event, Forge Your Story Powerlifting Meet',
    quote:
      'This gym had an incredible atmosphere and the staff was so welcoming! Thank you Michael and team for putting on an incredible and well organized event for our first time powerlifter. We hope to be back someday!',
  },
];
