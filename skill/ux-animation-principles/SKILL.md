---
name: ux-animation-principles
description: Apply 20 UX and animation principles (12 animation principles adapted to UI, plus Fitts's, Hick's, Miller's, Postel's and Jakob's laws, the Doherty threshold, bigger hit areas and frequency of use) when designing, reviewing or implementing UI motion, micro-interactions, transitions, feedback, target sizing, menus, forms or layouts. Use when a user asks to animate an interface, make UI feel better or snappier, review motion or interaction design, choose durations and easing, size touch targets, simplify choices, or write a motion spec.
---

# UX & Animation Principles

A working method for turning 20 principles into concrete, testable UI and motion
decisions. The full per-principle reference (what it does, when to use it, how to
implement it, one common pitfall) is in `references/principles.md`. Accessibility,
reduced-motion and performance rules are in `references/accessibility-performance.md`.
Read the reference sections for the principles you select; do not load all 20 when
only three apply.

## The 20 principles (fixed order, stable IDs)

| ID | Principle | Family |
|----|-----------|--------|
| ux-01 | Squash & stretch | Motion |
| ux-02 | Anticipation wind-up | Motion |
| ux-03 | Staging the focus | Motion |
| ux-04 | Pose to pose | Motion |
| ux-05 | Follow through | Motion |
| ux-06 | Slow in & slow out | Motion |
| ux-07 | Moving in arcs | Motion |
| ux-08 | Secondary action | Motion |
| ux-09 | Snappy timing | Motion |
| ux-10 | Exaggerated feedback | Motion |
| ux-11 | Solid drawing in 3D | Motion |
| ux-12 | Overall appeal | Motion |
| ux-13 | Fitts's law | UX law |
| ux-14 | Bigger hit areas | UX law |
| ux-15 | Hick's law | UX law |
| ux-16 | Miller's law | UX law |
| ux-17 | Doherty threshold | UX law |
| ux-18 | Postel's law | UX law |
| ux-19 | Jakob's law | UX law |
| ux-20 | Frequency of use | UX law (label unverified; see reference) |

## Workflow

Follow these five steps in order. Keep the answer proportional: a one-button question
gets a few lines, a full screen review gets the full spec.

### 1. Assess the task and constraints

Before choosing anything, establish (from the request, the code, or by asking one
short question if a wrong guess would be costly):

- **What is being built or reviewed:** component, flow, screen, or whole product.
- **Platform and input:** touch, mouse, keyboard, TV remote, mixed. Viewport sizes.
- **Stack:** CSS, Web Animations API, Framer Motion/Motion, GSAP, SwiftUI, Compose,
  Lottie, native. Use what the project already uses.
- **Frequency:** how often a user sees this interaction (once at onboarding, or 200
  times a day). Frequent interactions need shorter, subtler motion.
- **Brand and tone:** playful, neutral, premium, utilitarian.
- **Hard constraints:** accessibility level (WCAG 2.2 AA is the default target),
  low-end devices, performance budget, existing design tokens.

### 2. Select the relevant principles

Pick the **smallest set that solves the problem** (usually 2–5). Use this map:

| Situation | Start with |
|-----------|-----------|
| Element enters, exits or changes state | ux-06, ux-09, ux-03 |
| Something feels stiff or lifeless | ux-01, ux-05, ux-07, ux-08 |
| Action is easy to miss or misread | ux-02, ux-10, ux-03 |
| Multi-step or multi-element transition | ux-04, ux-05, ux-03 |
| Spatial / card / flip / depth effects | ux-11, ux-07 |
| UI feels inconsistent or "cheap" | ux-12, ux-09, ux-06 |
| Hard to tap or click | ux-13, ux-14, ux-20 |
| Too many options, slow decisions | ux-15, ux-16, ux-20 |
| Feels slow, laggy, unresponsive | ux-17, ux-09 |
| Forms reject reasonable input | ux-18 |
| Users get lost, "where is X?" | ux-19, ux-20, ux-03 |

Name the principles you chose **and** the ones you rejected when a rejection is not
obvious (for example: "No squash & stretch: this is a banking app and the tone is
neutral").

### 3. Translate into concrete decisions

Never stop at "add some easing". Every recommendation must be specific enough to
implement without guessing. Express motion as a spec:

```
Element:     <what moves>
Trigger:     <user action / state change>
Principle:   <ux-NN name>
Properties:  transform: translateY(8px → 0), opacity 0 → 1   (transform/opacity only where possible)
Duration:    180ms            Easing: cubic-bezier(0.2, 0, 0, 1)
Delay/stagger: 0 / 30ms per item, max 5 items
Reduced motion: opacity only, 120ms   (or: no animation, instant state change)
Interruptible: yes — retargets from current value
```

Express UX-law decisions as measurable rules, for example:

- "Primary action button 48px tall, placed in the thumb zone, within 120px of the
  last input" (ux-13).
- "Icon stays 20px; hit area 44×44px via padding; 8px minimum gap" (ux-14).
- "Show 4 grouped options with a recommended default; move 11 rarer items behind
  'More'" (ux-15, ux-20).
- "Acknowledge the tap within 100ms; show skeleton if the result exceeds 400ms"
  (ux-17).

Default timing tokens (adjust to brand, then keep them consistent):

| Token | Duration | Use |
|-------|----------|-----|
| instant | 0–80ms | Hover/press colour, focus ring |
| fast | 120–180ms | Small elements, toggles, tooltips |
| base | 200–280ms | Menus, cards, dialogs entering |
| slow | 300–450ms | Large surfaces, page-level transitions |
| exit | ~70–80% of the matching enter | Leaving should be quicker than arriving |

Default easings: enter `cubic-bezier(0, 0, 0.2, 1)` (ease-out), exit
`cubic-bezier(0.4, 0, 1, 1)` (ease-in), move on-screen `cubic-bezier(0.4, 0, 0.2, 1)`
(ease-in-out). Use springs for direct manipulation and interruptible motion.

### 4. Implement

- Prefer the project's existing animation layer. If none, use CSS transitions for
  simple state changes and the Web Animations API for sequenced or replayable motion.
- Animate `transform` and `opacity`; avoid animating layout properties (`width`,
  `height`, `top`, `left`, `margin`) on large or frequent elements.
- Wrap motion in a reduced-motion branch from the start, not as an afterthought (see
  `references/accessibility-performance.md`).
- Keep motion interruptible: a second click mid-animation must retarget, never queue.
- Put durations and easings in shared tokens or CSS custom properties.

### 5. Verify

Run through this checklist and report what you actually checked (do not claim a
check you did not perform):

- [ ] Each chosen principle maps to a visible, specific change (name the ux-ID).
- [ ] Durations fall inside the token ranges; frequent interactions are at the short end.
- [ ] `prefers-reduced-motion: reduce` removes or replaces non-essential motion, and
      no information is conveyed only by motion.
- [ ] Nothing auto-plays for more than 5 seconds without a pause/stop control.
- [ ] No flashing more than 3 times per second.
- [ ] Interactive targets are at least 24×24 CSS px (WCAG 2.2 AA), 44×44 for primary
      touch targets.
- [ ] Focus is visible and keyboard order follows the visual order after motion.
- [ ] Only compositor-friendly properties animate on hot paths; no layout thrash.
- [ ] Interaction feedback appears within 100ms; results or progress within 400ms.
- [ ] Tested at least once at 0.25× speed (DevTools Animations panel or a slowed
      clock) to inspect easing and overlap.

## Output format

For a review: list findings as `ux-ID · issue · concrete fix`, ranked by user impact.
For a build: give the spec block(s), then the code, then the verification results.
For a quick question: answer in a few lines and cite the ux-ID.

## Guardrails

- Motion must serve a purpose: orientation, feedback, focus, continuity or
  personality. If you cannot name the purpose, remove the motion.
- Personality principles (ux-01, ux-08, ux-10, ux-12) scale with brand tone. Turn
  them down for serious, high-stakes or high-frequency contexts.
- UX laws are heuristics with empirical backing, not physics. State them as
  trade-offs, and prefer testing with users over citing a law.
