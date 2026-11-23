/*
 * Shared registry: the single source of truth for the gallery (app.js) and the
 * coverage check (scripts/check-coverage.js). Order and IDs are fixed.
 * Works as a classic <script> (sets window.UX_REGISTRY) and as a CommonJS module.
 */
(function (root) {
  'use strict';
  var REGISTRY = [
    { id: 'ux-01', num: 1, title: 'Squash & stretch', family: 'motion',
      summary: 'Deform a moving element (stretch in flight, squash on impact) while keeping its volume, so it reads as having mass.',
      notice: 'Watch the ball flatten on the floor and lengthen as it falls. The rigid ball looks like a sticker. The switch knob stretches mid-travel.' },
    { id: 'ux-02', num: 2, title: 'Anticipation wind-up', family: 'motion',
      summary: 'A small backwards move before the main action tells the eye what is about to happen.',
      notice: 'The card on the right pulls back before it shoots off, so you never lose track of where it went. Turn the wind-up to 0 and compare.' },
    { id: 'ux-03', num: 3, title: 'Staging the focus', family: 'motion',
      summary: 'Let only one thing ask for attention: still the background, dim it, then bring in the focal element.',
      notice: 'On the left everything moves at once and the message gets lost. On the right the scene goes still and dims before the message arrives.' },
    { id: 'ux-04', num: 4, title: 'Pose to pose', family: 'motion',
      summary: 'Define a few key poses and interpolate between them, instead of nudging the element frame by frame (straight ahead).',
      notice: 'The straight-ahead box drifts and misses its dashed target, differently on every take. The pose-to-pose box hits poses A, B and C exactly.' },
    { id: 'ux-05', num: 5, title: 'Follow through', family: 'motion',
      summary: 'When the container stops, its contents carry on a little and settle, at slightly staggered times (overlapping action).',
      notice: 'On the left the drawer and its lines stop dead together. On the right the lines arrive after the drawer, overshoot slightly and settle.' },
    { id: 'ux-06', num: 6, title: 'Ease in & ease out', family: 'motion',
      summary: 'Accelerate out of rest and decelerate into rest. Easing makes motion feel physical and easy to track.',
      notice: 'The dots under each track mark equal slices of time. Linear spaces them evenly. Easing bunches them at the ends, because the box is slow there.' },
    { id: 'ux-07', num: 7, title: 'Arcs', family: 'motion',
      summary: 'Long journeys look natural along a curve; straight diagonal lines look mechanical.',
      notice: 'Both dots fly from the product to the cart in the same time. The arc reads as being "tossed", and the straight line looks robotic.' },
    { id: 'ux-08', num: 8, title: 'Secondary action', family: 'motion',
      summary: 'A smaller supporting motion (particles, a rolling counter) adds meaning to the primary action without competing with it.',
      notice: 'Click either like button. The secondary action (burst and rolling count) starts just after the heart pops and is smaller than it.' },
    { id: 'ux-09', num: 9, title: 'Snappy timing', family: 'motion',
      summary: 'Duration sets the feel. Short, confident timing feels responsive; long timing feels heavy.',
      notice: 'Open both menus. 700ms looks smooth once and drags by the tenth time. Use the slider to find where "instant" turns into "sluggish".' },
    { id: 'ux-10', num: 10, title: 'Exaggerated feedback', family: 'motion',
      summary: 'Push a response beyond realism so it cannot be missed, and pair it with colour, icon and text.',
      notice: 'The subtle red border on the left is easy to miss. The shake plus icon plus message on the right is not. With reduced motion, the message still carries the meaning.' },
    { id: 'ux-11', num: 11, title: 'Solid 3D models', family: 'motion',
      summary: 'Treat elements as solid objects with perspective, a hidden back face and consistent light.',
      notice: 'The flat flip collapses to a line and swaps faces. The 3D flip turns through space and its shadow tightens as it lifts. Change the perspective.' },
    { id: 'ux-12', num: 12, title: 'Consistency', family: 'motion',
      summary: 'Use one timing scale, one easing family and one visual language everywhere, so the product reads as one thing and moves predictably.',
      notice: 'The same three notifications. On the left, mixed durations, easings and styles fight each other. On the right, the shared tokens make them read as one product.' },
    { id: 'ux-13', num: 13, title: "Fitts's law", family: 'ux',
      summary: 'Time to hit a target grows with distance and shrinks with size: MT = a + b · log2(D/W + 1).',
      notice: 'Run trials with "Small & far", then with "Big & near". Your times rise with the index of difficulty (ID). Watch the plot fill in.' },
    { id: 'ux-14', num: 14, title: 'Bigger hit areas', family: 'ux',
      summary: 'Expand the invisible clickable area of a small control. The visible icon does not change.',
      notice: 'Both toolbars draw 16px icons. Turn on "Reveal hit areas": the right one is 44px. Compare your miss counts, then push past 48px to see neighbouring targets overlap.' },
    { id: 'ux-15', num: 15, title: "Hick's law", family: 'ux',
      summary: 'Decision time grows with the number of choices: RT ≈ a + b · log2(n + 1).',
      notice: 'Find the requested action in each panel. A long flat list makes you scan. Showing the few frequent choices first, with the rest behind "More", makes you decide.' },
    { id: 'ux-16', num: 16, title: "Miller's law", family: 'ux',
      summary: 'Working memory holds only a few chunks. Grouping information into chunks lets people hold more of it.',
      notice: 'Memorise each code, then type it back. The same 12 digits are much easier to keep in your head as 3 chunks of 4.' },
    { id: 'ux-17', num: 17, title: 'Doherty threshold', family: 'ux',
      summary: 'Respond in under ~400ms. Acknowledge input immediately, even when the real result takes longer.',
      notice: 'Both buttons wait the same time for the "server". The right one answers your click at once, so it feels faster even though it isn’t.' },
    { id: 'ux-18', num: 18, title: "Postel's law", family: 'ux',
      summary: 'Be liberal in what you accept: parse the reasonable ways people type data, then normalise and confirm it.',
      notice: 'Click the sample dates. The strict field rejects most of them. The lenient one accepts them all and shows how it read each one, so a misreading is visible.' },
    { id: 'ux-19', num: 19, title: "Jakob's law", family: 'ux',
      summary: 'People expect your product to work like the others they use. Follow established conventions.',
      notice: 'Do the same task on both sites. On the conventional one you find logo, search and cart almost without looking.' },
    { id: 'ux-20', num: 20, title: 'Frequency of use', family: 'ux',
      summary: 'Rank actions by how often they are used, and make the frequent ones the easiest to reach.',
      notice: 'Reply to all five messages in each inbox. With Reply buried in the overflow menu it takes twice the clicks. Promoted, it takes one per message.',
      labelNote: 'Label read from the reference screenshot and not verified against a canonical source. "Frequency of use" is a design practice (frequency-based placement), not a single named law.' }
  ];

  if (typeof module !== 'undefined' && module.exports) module.exports = REGISTRY;
  else root.UX_REGISTRY = REGISTRY;
})(typeof window !== 'undefined' ? window : globalThis);
