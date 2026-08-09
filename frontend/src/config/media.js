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
const SCS_ASSETS = '/assets/scs';

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
  heroFacility: `${SCS_ASSETS}/facility.jpg`, // wide floor, wall seal, racks, platforms
  openGym: `${SCS_ASSETS}/racks.jpg`,         // rack and bench area, plate storage

  // The seal. Not a photograph, so no permission question, but it belongs here
  // rather than as a literal in each component: the navbar, the footer, the
  // hero watermark and the entity block all render it, and a missing key made
  // every one of them an <img src={undefined}> until this was added.
  logo: `${SCS_ASSETS}/logo.png`,

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
  entrance: `${SCS_ASSETS}/coach.jpeg`,      // storefront and signage, one person
  benchPress: `${SCS_ASSETS}/lift.jpeg`,     // clean action, unwatermarked, two people
  medalists: `${SCS_ASSETS}/podium.jpeg`,    // three lifters at the wall seal
  meetCrowd: `${SCS_ASSETS}/community.jpeg`, // meet day, many people
});

/**
 * Responsive sources.
 *
 * There is no image pipeline in this build and adding one to make a
 * photograph smaller would be a poor trade. So the derivatives are
 * checked in: each public photograph exists at 640, 960 and 1400 on
 * its longest edge, generated once from the camera original, which
 * stays untouched as the source of truth in /assets/scs.
 *
 * The hero drops from 820KB to 87KB on a phone this way, which is the
 * difference between a Largest Contentful Paint the network can hit
 * and one it cannot. Every caller passes real width and height, so
 * the box is reserved before the bytes land and the page does not
 * jump when it does.
 */
const SIZED = '/assets/scs/sized';

const SIZED_SET = {
  facility:           { w: 1080, h: 1440, widths: [640, 960, 1400] },
  racks:              { w: 1080, h: 1974, widths: [640, 960, 1400] },
  'coaching-crew':    { w: 1024, h: 683,  widths: [640, 960, 1400] },
  'community-group':  { w: 1024, h: 683,  widths: [640, 960, 1400] },
  'community-strength': { w: 1024, h: 683, widths: [640, 960, 1400] },
  'community-wall':   { w: 1024, h: 683,  widths: [640, 960, 1400] },
  'community-medals': { w: 1024, h: 683,  widths: [640, 960, 1400] },
  'portrait-mike':    { w: 1024, h: 1536, widths: [640] },
  'portrait-teresa':  { w: 1024, h: 1536, widths: [640] },
  'portrait-lexi':    { w: 1024, h: 1536, widths: [640] },
  'portrait-chris':   { w: 1024, h: 1536, widths: [640] },
  'portrait-brit':    { w: 1024, h: 1536, widths: [640] },
};

/**
 * Props for one documentary photograph: src, srcSet, sizes, and the
 * intrinsic dimensions. Spread it onto an img and pass alt separately,
 * because alt is a decision about that use of the photograph rather
 * than a property of the file.
 */
export function photo(name, { sizes = '100vw', eager = false } = {}) {
  const entry = SIZED_SET[name];
  if (!entry) return {};
  const scale = Math.min(1, entry.widths[entry.widths.length - 1] / Math.max(entry.w, entry.h));
  return {
    src: `${SIZED}/${name}-${entry.widths[entry.widths.length - 1]}.jpg`,
    srcSet: entry.widths
      .map((edge) => `${SIZED}/${name}-${edge}.jpg ${Math.round(entry.w * (edge / Math.max(entry.w, entry.h)))}w`)
      .join(', '),
    sizes,
    width: Math.round(entry.w * scale),
    height: Math.round(entry.h * scale),
    loading: eager ? 'eager' : 'lazy',
    decoding: eager ? 'sync' : 'async',
    fetchPriority: eager ? 'high' : undefined,
  };
}
