/*
 * Shared registry: the single source of truth for the gallery (app.js) and the
 * coverage check (scripts/check-coverage.js). Order and IDs are fixed.
 * Works as a classic <script> (sets window.UX_REGISTRY) and as a CommonJS module.
 */
(function (root) {
  'use strict';
  var REGISTRY = [
    { id: 'ux-01', num: 1, title: 'Squash & stretch', family: 'motion',
      summary: 'Deform a moving element (stretch in flight, squash on impact) while keeping its volume, so it reads as having mass.' },
    { id: 'ux-02', num: 2, title: 'Anticipation wind-up', family: 'motion',
      summary: 'A small backwards move before the main action tells the eye what is about to happen.' },
    { id: 'ux-03', num: 3, title: 'Staging the focus', family: 'motion',
      summary: 'Let only one thing ask for attention: still the background, dim it, then bring in the focal element.' },
    { id: 'ux-04', num: 4, title: 'Pose to pose', family: 'motion',
      summary: 'Define a few key poses and interpolate between them, instead of nudging the element frame by frame (straight ahead).' },
    { id: 'ux-05', num: 5, title: 'Follow through', family: 'motion',
      summary: 'When the container stops, its contents carry on a little and settle, at slightly staggered times (overlapping action).' },
    { id: 'ux-06', num: 6, title: 'Ease in & ease out', family: 'motion',
      summary: 'Accelerate out of rest and decelerate into rest. Easing makes motion feel physical and easy to track.' },
    { id: 'ux-07', num: 7, title: 'Arcs', family: 'motion',
      summary: 'Long journeys look natural along a curve; straight diagonal lines look mechanical.' },
    { id: 'ux-08', num: 8, title: 'Secondary action', family: 'motion',
      summary: 'A smaller supporting motion (particles, a rolling counter) adds meaning to the primary action without competing with it.' },
    { id: 'ux-09', num: 9, title: 'Snappy timing', family: 'motion',
      summary: 'Duration sets the feel. Short, confident timing feels responsive; long timing feels heavy.' },
    { id: 'ux-10', num: 10, title: 'Exaggerated feedback', family: 'motion',
      summary: 'Push a response beyond realism so it cannot be missed, and pair it with colour, icon and text.' },
    { id: 'ux-11', num: 11, title: 'Solid 3D models', family: 'motion',
      summary: 'Treat elements as solid objects with perspective, a hidden back face and consistent light.' },
    { id: 'ux-12', num: 12, title: 'Consistency', family: 'motion',
      summary: 'Use one timing scale, one easing family and one visual language everywhere, so the product reads as one thing and moves predictably.' },
    { id: 'ux-13', num: 13, title: "Fitts's law", family: 'ux',
      summary: 'Time to hit a target grows with distance and shrinks with size: MT = a + b · log2(D/W + 1).' },
    { id: 'ux-14', num: 14, title: 'Bigger hit areas', family: 'ux',
      summary: 'Expand the invisible clickable area of a small control. The visible icon does not change.' },
    { id: 'ux-15', num: 15, title: "Hick's law", family: 'ux',
      summary: 'Decision time grows with the number of choices: RT ≈ a + b · log2(n + 1).' },
    { id: 'ux-16', num: 16, title: "Miller's law", family: 'ux',
      summary: 'Working memory holds only a few chunks. Grouping information into chunks lets people hold more of it.' },
    { id: 'ux-17', num: 17, title: 'Doherty threshold', family: 'ux',
      summary: 'Respond in under ~400ms. Acknowledge input immediately, even when the real result takes longer.' },
    { id: 'ux-18', num: 18, title: "Postel's law", family: 'ux',
      summary: 'Be liberal in what you accept: parse the reasonable ways people type data, then normalise and confirm it.' },
    { id: 'ux-19', num: 19, title: "Jakob's law", family: 'ux',
      summary: 'People expect your product to work like the others they use. Follow established conventions.' },
    { id: 'ux-20', num: 20, title: 'Frequency of use', family: 'ux',
      summary: 'Rank actions by how often they are used, and make the frequent ones the easiest to reach.',
      labelNote: 'Label read from the reference screenshot and not verified against a canonical source. "Frequency of use" is a design practice (frequency-based placement), not a single named law.' }
  ];

  if (typeof module !== 'undefined' && module.exports) module.exports = REGISTRY;
  else root.UX_REGISTRY = REGISTRY;
})(typeof window !== 'undefined' ? window : globalThis);
