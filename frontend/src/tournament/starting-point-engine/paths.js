import { CalendarClock, Compass, Dumbbell, Goal, Search, ShieldCheck, Trophy, UserRound } from 'lucide-react';
import { MEMBERSHIP_TIERS } from '../../config';

/**
 * The routing tables for The Starting Point Engine.
 *
 * INTEREST and TIMELINE values are the lead payload contract. They are copied
 * character for character from QuizForm.js:24-36, which keeps both tables as
 * module private constants and exports neither. Changing a `value` here changes
 * what the CRM receives, so treat them as commercial data rather than as copy.
 * The `label` strings are display only and are free to differ; they are phrased
 * as answers to a question rather than as form field names.
 *
 * Every factual claim in the path copy below is sourced from the project truth
 * inventory: the FAQ inventory in Home.js:29-35, the coaching paragraph in
 * Home.js:163-165, the tour bullets in Home.js:116-122, and the membership
 * terms in config/index.js. Nothing here is invented, and no price appears.
 */

const tier = (id) => MEMBERSHIP_TIERS.find((entry) => entry.id === id);

export const INTEREST_OPTIONS = [
  { value: 'General Membership', label: 'Join and train regularly', icon: Dumbbell },
  { value: 'Personal Training', label: 'Work with a coach', icon: UserRound },
  { value: 'Performance / Sport Training', label: 'Train for a sport or a meet', icon: Trophy },
  { value: 'Open Gym', label: 'Look around first', icon: Search },
];

export const TIMELINE_OPTIONS = [
  { value: 'ASAP', label: 'Ready now', icon: Goal },
  { value: '1-2 weeks', label: 'Within two weeks', icon: CalendarClock },
  { value: '1 month', label: 'Within a month', icon: ShieldCheck },
  { value: 'Just exploring', label: 'Still exploring', icon: Compass },
];

/**
 * One entry per interest value. `summary` is what an unanswered visitor reads
 * in the index, so all four have to stand on their own. `detail` is what the
 * plate shows once this path is live.
 */
export const PATHS = [
  {
    value: 'General Membership',
    title: 'Train here regularly',
    summary: 'You want a gym you can use on your own schedule, without a class timetable.',
    detail:
      'A tour walks the full training floor, shows you how access works, and gives you time to ask what is included before anything is decided. Memberships are set up in person by a coach, so the visit is where the plan gets chosen, not a checkout page.',
    plans: ['huscler-12', 'flex'],
    planLead: 'The plans people in this position usually look at:',
  },
  {
    value: 'Personal Training',
    title: 'Train with a coach',
    summary: 'You want programming, technique work, or a plan built for your goals.',
    detail:
      'Personal training is available for members who want structured programming, technique work, or a starting plan built around their goals. It is a separate service from membership, so the useful thing to do on a tour is to ask what a coach would actually do with you.',
    link: { to: '/personal-training', label: 'Ask About Personal Training' },
  },
  {
    value: 'Performance / Sport Training',
    title: 'Train for a sport or a meet',
    summary: 'You have a program already and you need the room to run it.',
    detail:
      'On the floor: power racks, barbells, bumper and iron plates, specialty bars, dumbbells, kettlebells, and conditioning equipment. Walk it before you commit and check the bars and platforms against what your program actually calls for.',
    plans: ['huscler-12'],
    planLead: 'The plan built for that use:',
  },
  {
    value: 'Open Gym',
    title: 'Look around first',
    summary: 'You are not ready to decide anything, and you would rather see the room.',
    detail:
      'No paperwork is required to visit. You walk through the space, see the equipment, ask questions, and leave without signing anything. If you want to train while you are here, a day pass is valid for same-day use during staffed hours.',
    plans: ['daypass'],
    planLead: 'If you want to train on the day:',
  },
];

/**
 * The timing answer changes the closing line and nothing else. It never changes
 * urgency: there is nothing scarce here, and the visit costs nothing whenever
 * it happens.
 */
export const TIMELINE_RESOLUTION = {
  ASAP: 'Book the visit and a coach takes it from there.',
  '1-2 weeks': 'Book the visit now and pick a time inside the next two weeks.',
  '1 month': 'Book the visit now. Nothing is committed until you decide in person.',
  'Just exploring': 'Read the plans first if you want. The visit costs nothing and commits nothing.',
};

export const pathFor = (value) => PATHS.find((path) => path.value === value) || null;

/** Plan name plus its published terms. Deliberately no price: see the README. */
export const planShapes = (ids = []) =>
  ids
    .map((id) => tier(id))
    .filter(Boolean)
    .map((entry) => ({ id: entry.id, name: entry.name, terms: entry.terms }));

/** The three membership shapes section 6 lists, in order of commitment. */
export const MEMBERSHIP_SHAPES = ['daypass', 'flex', 'huscler-12'];
