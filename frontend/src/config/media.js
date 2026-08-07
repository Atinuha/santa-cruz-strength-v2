// Santa Cruz Strength public photography.
//
// Every entry here must be documentary: a real photograph of this gym, its real
// members, its real staff or its real events. Generated imagery may never stand
// in for any of those. A slot with no honest photograph is null, and the page
// renders without it rather than showing something untrue.
//
// Source: the Iron Roses 2026 shoot. Nikon originals, Lightroom processed.
// Only frames without third-party or cross-brand watermarks are used here.
//
// PENDING: the shoot documents an event, not the building. There are no
// facility, equipment, exterior, signage or reception frames. Those slots stay
// null until a facility shoot happens. Lifting-action frames exist but every
// one carries a photographer watermark plus a Nightmare Muscle mark, so none
// can be published until clean licensed files arrive.

const REAL = '/assets/scs/real';

export const SCS_MEDIA = Object.freeze({
  // Real, clean, publishable.
  communityStrength: `${REAL}/community-strength.jpg`, // group, fists raised, painted SCS wall
  communityMedals: `${REAL}/community-medals.jpg`,     // group with medals and roses
  communityWall: `${REAL}/community-wall.jpg`,         // group before the painted seal
  communityGroup: `${REAL}/community-group.jpg`,       // five members, branded backdrop
  coachingCrew: `${REAL}/coaching-crew.jpg`,           // coaching and organising crew on the platform
  portraitMike: `${REAL}/portrait-mike.jpg`,           // owner
  portraitTeresa: `${REAL}/portrait-teresa.jpg`,
  portraitLexi: `${REAL}/portrait-lexi.jpg`,           // personal trainer named in a real testimonial
  portraitChris: `${REAL}/portrait-chris.jpg`,
  portraitBrit: `${REAL}/portrait-brit.jpg`,

  // Mapped to the closest honest real frame.
  communityWide: `${REAL}/community-medals.jpg`,
  communityFloor: `${REAL}/community-group.jpg`,
  communityHandshake: `${REAL}/community-wall.jpg`,
  coachingFloor: `${REAL}/coaching-crew.jpg`,
  coachBriefing: `${REAL}/coaching-crew.jpg`,
  coachingCloseup: `${REAL}/portrait-lexi.jpg`,

  // No honest photograph exists yet. Pages must render without these.
  heroFacility: null,   // needs a facility shoot
  openGym: null,        // needs a facility shoot
  loadedBar: null,      // needs equipment frames, or clean licensed action files
  barLoading: null,     // as above
  chalkHands: null,     // as above
  deadliftEffort: null, // action frames exist but all are watermarked
});

// Slots still waiting on assets, so the gap is visible in code rather than
// discovered when a page renders empty.
export const SCS_MEDIA_PENDING = Object.freeze([
  'heroFacility', 'openGym', 'loadedBar', 'barLoading', 'chalkHands', 'deadliftEffort',
]);
