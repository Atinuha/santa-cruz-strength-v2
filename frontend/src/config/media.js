// Santa Cruz Strength public photography.
//
// Every entry here must be documentary: a real photograph of this gym, its real
// members, its real staff or its real events. Generated imagery may never stand
// in for any of those. A slot with no honest photograph is null, and the page
// renders without it rather than showing something untrue.
//
// Two sources, both documentary:
//
//   /assets/scs/real   the Iron Roses 2026 event shoot, Nikon originals.
//                      Only frames without third-party or cross-brand
//                      watermarks appear here.
//   /assets/scs        camera originals of the building itself, verified by
//                      EXIF. Facility and rack frames carry no people; the
//                      entrance, action and crowd frames do.
//
// CORRECTION, 2026-08-07. An earlier version of this file recorded that no
// facility, equipment, exterior or signage photograph existed anywhere and set
// six slots to null on that basis. That was wrong. The frames existed the whole
// time, and the wide floor shot was missed because its filename described a
// screenshot rather than its contents. The hero was empty for no reason.
//
// STILL NULL, and honestly so: there is no close-up of a loaded bar, of plates
// being loaded, or of chalked hands. A clean unwatermarked bench-press frame
// does exist but shows identifiable people, so it waits on written permission
// rather than on a photographer. Do not fill these by substituting the floor
// shot; a slot promising one subject must not show another.

const REAL = '/assets/scs/real';
const ROOM = '/assets/scs';

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

  // The building itself. No people in either frame, so both publish now
  // without waiting on likeness permission.
  heroFacility: `${ROOM}/facility.jpg`, // wide floor, wall seal, racks, platforms
  openGym: `${ROOM}/racks.jpg`,         // rack and bench area, plate storage

  // The seal. Not a photograph, so no permission question, but it belongs here
  // rather than as a literal in each component: the navbar, the footer, the
  // hero watermark and the entity block all render it, and a missing key made
  // every one of them an <img src={undefined}> until this was added.
  logo: `${ROOM}/logo.png`,

  // No honest photograph exists. Pages render without these rather than
  // showing a different subject. See the note at the top of this file.
  loadedBar: null,      // no close-up of a loaded bar exists
  barLoading: null,     // no frame of plates being loaded exists
  chalkHands: null,     // no chalk close-up exists
  deadliftEffort: null, // the one clean action frame is a bench press, not a
                        // deadlift, and shows identifiable people
});

// Slots still waiting on assets, so the gap is visible in code rather than
// discovered when a page renders empty.
export const SCS_MEDIA_PENDING = Object.freeze([
  'loadedBar', 'barLoading', 'chalkHands', 'deadliftEffort',
]);

// Real photographs held back only for written likeness permission, not for
// want of an asset. Wire these the day permission lands.
export const SCS_MEDIA_AWAITING_PERMISSION = Object.freeze({
  entrance: `${ROOM}/coach.jpeg`,      // storefront and signage, one person
  benchPress: `${ROOM}/lift.jpeg`,     // clean action, unwatermarked, two people
  medalists: `${ROOM}/podium.jpeg`,    // three lifters at the wall seal
  meetCrowd: `${ROOM}/community.jpeg`, // meet day, many people
});
