# The 20 principles: reference

Each section has the same four parts: **What it does**, **When to use**, **How to
implement**, and **Common pitfall**. IDs (`ux-01` to `ux-20`) match the companion demo
gallery. Code is framework-neutral (CSS and the Web Animations API). Translate it to
the project's own stack.

Principles 1–12 adapt the twelve classic principles of character animation to UI.
Principles 13–20 are UX laws and heuristics about how people perceive, decide and act.

---

## ux-01 — Squash & stretch

**What it does.** Deforms an element along its motion: it stretches while it moves
fast and squashes on impact. The element reads as having mass and flexibility instead
of being a rigid sprite.

**When to use.** Playful or tactile moments: a toggle knob travelling, a bouncing
notification badge, a pressed button, a pull-to-refresh indicator. Use it on small
elements and in brands that can carry some character.

**How to implement.** Keep the volume roughly constant: when `scaleY` goes down,
`scaleX` goes up by about the same proportion. Anchor the deformation at the contact
point.

```js
ball.animate([
  { transform: 'translateY(0) scale(1, 1)' },
  { transform: 'translateY(140px) scale(0.9, 1.12)', offset: 0.45 }, // stretch while falling
  { transform: 'translateY(160px) scale(1.25, 0.75)', offset: 0.5 }, // squash on impact
  { transform: 'translateY(0) scale(1, 1)' }
], { duration: 900, easing: 'ease-in-out' });
// transform-origin: 50% 100% so the squash sits on the floor
```

For a button press, `scale(0.96)` on `:active` with a fast 80–120ms transition is a
subtle form of squash.

**Common pitfall.** Deforming text or whole layouts. Squashed text is hard to read and
looks broken. Apply it to shapes and icons only, and keep it to roughly 10–25%.

---

## ux-02 — Anticipation wind-up

**What it does.** A small movement in the opposite direction before the main action
(a pull-back before a throw). It signals what is about to happen and makes the action
easier to follow.

**When to use.** Before large or fast movements the user should not miss: a card being
sent or dismissed, a drawer launching, a "send" or "delete" that removes an item from
view, game-like interactions.

**How to implement.** Spend about 15–25% of the total duration moving 5–15% of the
travel distance backwards, then accelerate forwards.

```js
card.animate([
  { transform: 'translateX(0)' },
  { transform: 'translateX(-24px) rotate(-2deg)', offset: 0.22, easing: 'ease-in' },
  { transform: 'translateX(420px) rotate(6deg)', opacity: 0 }
], { duration: 650, easing: 'cubic-bezier(0.5, 0, 0.75, 0)', fill: 'forwards' });
```

**Common pitfall.** Adding a wind-up to high-frequency or latency-sensitive actions
(typing, list scrolling, every button tap). The anticipation becomes perceived lag.

---

## ux-03 — Staging the focus

**What it does.** Arranges motion, contrast and layout so that only one thing asks for
attention at a time. The user's eye goes where the important change is.

**When to use.** Dialogs, toasts, onboarding highlights, error states, any moment where
new information appears inside a busy screen.

**How to implement.** Move the one thing that matters and keep everything else still.
Lower competing contrast with a scrim, dimming or blur. Sequence the steps: the
background settles first, then the focal element enters.

```css
.scrim  { transition: opacity 200ms ease-out; }
.dialog { transition: transform 240ms cubic-bezier(0,0,.2,1) 60ms, opacity 240ms 60ms; }
```

Move keyboard focus to the staged element (`dialog.showModal()` or `element.focus()`),
and return it to the trigger afterwards.

**Common pitfall.** Animating several things at once (badge bounce, toast slide and
chart redraw together). When everything moves, nothing is staged.

---

## ux-04 — Pose to pose

**What it does.** Defines a few deliberate key states (poses) and interpolates between
them. The alternative, "straight ahead", nudges the element frame by frame. Pose to
pose gives predictable, art-directed motion that lands exactly where intended.

**When to use.** Any multi-step transition: icon morphs (menu → close), shared-element
transitions, stepper progress, loading sequences. It is the default for UI, because UI
states are discrete.

**How to implement.** List the key states first (start, extreme, end). Give each one an
explicit value and an offset. Let the engine generate the in-betweens.

```js
icon.animate([
  { transform: 'translate(0,0) rotate(0)'  },                  // pose A: rest
  { transform: 'translate(120px,-40px) rotate(90deg)', offset: .5 }, // pose B: extreme
  { transform: 'translate(240px,0) rotate(180deg)' }           // pose C: settle
], { duration: 800, easing: 'ease-in-out' });
```

In design tools, name the poses after UI states (`collapsed`, `expanding`, `expanded`).
Engineers can then map them to code directly.

**Common pitfall.** Driving motion with incremental `requestAnimationFrame` nudges or
`setInterval` steps. The element drifts, depends on frame rate, and ends in a slightly
different place each time.

---

## ux-05 — Follow through

**What it does.** Parts of an element keep moving after the main body stops, then
settle (follow through). Different parts move at slightly different rates (overlapping
action). The motion feels physical instead of mechanical.

**When to use.** Panels and sheets with content inside, list items entering as a group,
cards landing, drag-and-drop release.

**How to implement.** Stop the container first. Let the children arrive 30–60ms later
with a small overshoot (2–6px or 2–4% scale) that settles back.

```js
panel.animate([{ transform: 'translateX(-100%)' }, { transform: 'translateX(0)' }],
  { duration: 320, easing: 'cubic-bezier(0.2, 0, 0, 1)' });
items.forEach((el, i) => el.animate([
  { transform: 'translateX(-40px)' },
  { transform: 'translateX(6px)', offset: 0.7 },
  { transform: 'translateX(0)' }
], { duration: 420, delay: 40 + i * 35, easing: 'ease-out', fill: 'backwards' }));
```

**Common pitfall.** Long stagger chains. Twelve items × 60ms means the last item
arrives after 700ms or more, and the user waits for decoration. Cap the stagger
(e.g. animate the first 5 items, show the rest at once).

---

## ux-06 — Ease in & ease out

**What it does.** Objects accelerate from rest and decelerate into rest (easing; the classic animation term is "slow in & slow out")
instead of moving at constant speed. Linear motion looks robotic. Eased motion looks
natural and is easier to track.

**When to use.** Almost every positional or scale transition. Choose the easing by the
role of the movement:

- enter: ease-out (fast start, gentle landing)
- exit: ease-in (gentle start, fast departure)
- move on screen: ease-in-out

**How to implement.**

```css
:root {
  --ease-out:    cubic-bezier(0, 0, 0.2, 1);
  --ease-in:     cubic-bezier(0.4, 0, 1, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}
.menu[open] { animation: menu-in 200ms var(--ease-out); }
```

Keep `linear` for continuous, non-physical changes: progress bars that track real
progress, spinners, colour cycling, scrubbing tied to scroll.

**Common pitfall.** Using ease-in for entering elements. The element starts slowly,
so the response feels delayed, and it stops abruptly at full speed.

---

## ux-07 — Moving in arcs

**What it does.** Moves objects along curved paths instead of straight lines, because
most natural motion (thrown objects, swinging limbs) follows arcs. The path reads as
intentional and organic.

**When to use.** Elements that travel a long way across the screen: add-to-cart
fly-outs, floating action buttons that expand into sheets, items moved between
containers, celebratory moments.

**How to implement.** Animate the two axes with different easings (x linear, y eased),
or use CSS `offset-path`.

```js
// wrapper moves horizontally at constant speed, inner element rises then falls
wrap.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(300px)' }],
  { duration: 700, easing: 'linear' });
dot.animate([
  { transform: 'translateY(0)' },
  { transform: 'translateY(-120px)', offset: 0.5, easing: 'ease-in' },
  { transform: 'translateY(0)' }
], { duration: 700, easing: 'ease-out' });
```

```css
.flyer { offset-path: path('M0,0 Q150,-120 300,0'); animation: fly 700ms ease-in-out; }
@keyframes fly { to { offset-distance: 100%; } }
```

**Common pitfall.** Arcs on short, functional movements such as a dropdown opening or
a tooltip appearing. Short UI moves should stay direct. An arc there looks wobbly and
lengthens the path.

---

## ux-08 — Secondary action

**What it does.** A smaller action that supports the main one and adds meaning or
character: particles when a heart is liked, a count rolling up, a checkmark drawing in
after a button confirms.

**When to use.** Celebratory or confirming moments where extra feedback is welcome:
likes, completing a task, achievements, successful payment. Use them sparingly.

**How to implement.** Start the secondary action slightly after the primary one
(30–80ms), make it smaller and lower in contrast, and finish it within the same overall
window.

```js
heart.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }],
  { duration: 300, easing: 'ease-out' });
particles.forEach((p, i) => p.animate([
  { transform: 'translate(0,0) scale(1)', opacity: 1 },
  { transform: `translate(${dx[i]}px, ${dy[i]}px) scale(0)`, opacity: 0 }
], { duration: 500, delay: 60, easing: 'ease-out' }));
```

**Common pitfall.** A secondary action that steals focus from the primary one: big
confetti over the confirmation text, or particles that hide the updated count.

---

## ux-09 — Snappy timing

**What it does.** Duration controls the character of motion and how responsive the UI
feels. Short, confident durations make an interface feel fast. Long ones make it feel
heavy and sluggish.

**When to use.** Every animation. This principle sets the duration tokens.

**How to implement.** Scale duration with the distance travelled and the size of the
element. Keep durations short for frequent interactions.

- Small: 100–180ms (toggles, checkboxes, tooltips).
- Medium: 200–300ms (menus, cards, dialogs).
- Large: 300–450ms (full-screen sheets, page transitions).
- Exits: about 20–30% shorter than the matching entry.

Rarely go above 500ms for functional UI. Make the duration a token, not a magic number.

**Common pitfall.** Tuning duration in slow motion or in isolation, then shipping it
everywhere. A 400ms menu looks lovely in a demo and becomes irritating by the 50th use.
Judge timing at real frequency.

---

## ux-10 — Exaggerated feedback

**What it does.** Pushes a response beyond literal realism so that it is noticed and
understood immediately. A rejected password field shakes, a successful save pulses, a
blocked drag springs back.

**When to use.** Moments that must not be missed: errors, invalid actions, success
confirmations, limits reached (end of list, max quantity).

**How to implement.** Combine motion with a non-motion cue. Colour plus icon plus text
must carry the meaning on their own, and the motion only reinforces it.

```js
field.animate([
  { transform: 'translateX(0)' }, { transform: 'translateX(-10px)' },
  { transform: 'translateX(10px)' }, { transform: 'translateX(-6px)' },
  { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }
], { duration: 400, easing: 'ease-in-out' });
field.setAttribute('aria-invalid', 'true'); // plus a visible, announced error message
```

**Common pitfall.** Relying on the motion alone. With reduced motion, a screen reader,
or a glance away, a shake-only error is invisible. Exaggeration also loses its effect
if every interaction uses it.

---

## ux-11 — Solid drawing in 3D

**What it does.** Treats elements as solid objects with volume, a consistent light
source and correct perspective. Flips, tilts and layered depth then look believable
instead of flat.

**When to use.** Card flips, carousels with depth, parallax layers, tilt-on-hover
cards, stacked sheets and modals that sit "above" the page.

**How to implement.**

```css
.scene { perspective: 800px; }
.card  { transform-style: preserve-3d; transition: transform 600ms cubic-bezier(.4,0,.2,1); }
.card.flipped { transform: rotateY(180deg); }
.face  { backface-visibility: hidden; }
.back  { transform: rotateY(180deg); }
```

Keep one light direction: shadows fall the same way everywhere, and they grow and
soften as an element lifts. Use elevation tokens, not ad-hoc shadows.

**Common pitfall.** Faking a flip with `scaleX(-1)` or without `perspective`. The card
collapses to a line and the back face mirrors the text. Very short perspective values
(< 300px) also distort the element.

---

## ux-12 — Overall appeal

**What it does.** The combined, coherent quality of motion and visual design that makes
an interface pleasant and trustworthy. Consistent timing, a shared easing vocabulary,
clean shapes and restraint add up to a recognisable "feel".

**When to use.** As a review lens over the whole system, especially when individual
animations are fine but the product still feels inconsistent or cheap.

**How to implement.** Define a small motion system and use only that:

- 3–5 duration tokens and 3 easings.
- One elevation scale and one corner-radius scale.
- Rules for what moves (enter, exit, feedback) and what never moves.

Audit screens side by side for mismatched durations, competing easings and decorative
motion with no purpose.

**Common pitfall.** Treating appeal as "add more polish". Appeal usually comes from
removing things: inconsistent one-off animations, gratuitous bounces, mixed visual
styles.

---

## ux-13 — Fitts's law

**What it does.** The time to acquire a target grows with the distance to it and
shrinks with its size: `MT = a + b · log2(D / W + 1)` (Shannon formulation; D =
distance, W = target width along the axis of motion). Large, close targets are fast.
Small, distant ones are slow and error-prone.

**When to use.** Placing and sizing primary actions, form submit buttons, toolbars,
mobile thumb-zone layouts, context menus, drag targets.

**How to implement.**

- Make frequent and primary targets larger.
- Place them close to where the pointer or thumb already is (next to the last field,
  in the bottom thumb zone on mobile).
- Use screen edges and corners: an edge stops the pointer, so the target is effectively
  very deep.
- Put context menus at the cursor.
- Keep destructive actions further away, or smaller, than their safe alternative.

**Common pitfall.** Making everything big. Fitts's law is relative: if every control is
large, nothing is easier to reach than anything else, and the screen loses density and
hierarchy. Spend size and proximity on the actions that matter.

---

## ux-14 — Bigger hit areas

**What it does.** Expands the clickable or tappable region of a control beyond its
visible bounds. Small icons stay visually light but become easy to hit. This is the
"invisible W" lever of Fitts's law, without changing the visual design.

**When to use.** Icon buttons, close (×) buttons, checkboxes, inline links, slider
thumbs, table row actions — anything visually small that people must hit precisely,
especially on touch.

**How to implement.** Use padding, or a pseudo-element that extends the hit box:

```css
.icon-btn { position: relative; width: 20px; height: 20px; }
.icon-btn::before {
  content: ''; position: absolute; inset: -12px;  /* 20px icon → 44px hit area */
}
```

Minimum sizes: 24×24 CSS px (WCAG 2.2 SC 2.5.8, AA), with spacing exceptions. Aim for
44×44 (WCAG 2.5.5 AAA, Apple HIG 44pt) or 48×48dp (Material) for primary touch targets.
Keep enough spacing that expanded areas do not overlap.

**Common pitfall.** Overlapping expanded hit areas on dense toolbars. A tap meant for
one icon lands on its neighbour. Expand into empty space, not into each other, and
check with a debug outline.

---

## ux-15 — Hick's law

**What it does.** Decision time grows with the number and complexity of choices,
roughly logarithmically: `RT = a + b · log2(n + 1)` (Hick–Hyman). More options mean
slower decisions and more abandonment.

**When to use.** Navigation menus, settings, onboarding, pricing tables, action sheets,
filter panels, any screen where the user has to choose.

**How to implement.**

- Cut options that rarely matter.
- Group the rest into labelled categories.
- Highlight a recommended default.
- Use progressive disclosure ("More options").
- Split long decisions into steps.

Familiar, well-ordered lists (alphabetical countries) are an exception: people scan
them instead of choosing, so length matters less.

**Common pitfall.** Hiding options that people use often in order to "reduce choices".
This trades decision time for search time and extra clicks. Simplify by frequency of
use, not by guesswork.

---

## ux-16 — Miller's law

**What it does.** Working memory holds only a few items at once. Miller (1956) said
"seven, plus or minus two". Later research (Cowan, 2001) suggests about four chunks.
Grouping information into meaningful chunks lets people hold and compare more.

**When to use.** Showing codes, phone numbers, IBANs, card numbers, one-time passcodes;
long forms; comparison tables; step-by-step instructions.

**How to implement.**

- Chunk long strings visually (`+44 7911 123 456`) while accepting unchunked input.
- Group form fields into labelled sections.
- Keep the information needed for a decision visible, rather than relying on the user
  to remember it from a previous screen.

**Common pitfall.** Misreading it as "menus must have at most 7 items". The law is
about holding things in memory, not about the length of visible lists people can scan.
Use it to reduce what users must remember, not to cap navigation arbitrarily.

---

## ux-17 — Doherty threshold

**What it does.** Productivity and engagement rise sharply when the system responds in
under about 400ms (Doherty & Thadani, IBM, 1982). Below that, the interaction feels
conversational. Above it, attention starts to wander.

**When to use.** Every action that involves computation or network: search, save,
submit, filters, navigation, AI responses.

**How to implement.**

- Acknowledge input within 100ms: a pressed state, a spinner inside the button, an
  optimistic update.
- Show a skeleton or progressive results before 400ms.
- For longer waits, show determinate progress.
- Prefetch, cache, and stream partial output.
- Measure Interaction to Next Paint (INP). Google's "good" threshold is ≤ 200ms.

**Common pitfall.** Adding artificial delays or long transitions to "feel premium",
or hiding latency behind a 600ms animation. Motion cannot make a slow response fast.
It can only acknowledge the input quickly while the real work completes.

---

## ux-18 — Postel's law

**What it does.** "Be conservative in what you do, be liberal in what you accept from
others". This is the robustness principle from Jon Postel's TCP specification (RFC
761, 1980). In UI it means: accept the many reasonable ways people type data, then
normalise and confirm it.

**When to use.** Forms: dates, phone numbers, postcodes, card numbers, names, addresses,
search, quantities, units.

**How to implement.**

- Strip spaces, dashes and brackets.
- Accept common date formats and relative words ("tomorrow").
- Parse case-insensitively and trim whitespace.
- Show the interpreted value back to the user ("Thu 12 Mar 2026") so they can confirm.
- Output one canonical format.
- When input is ambiguous (03/04: 3 April or 4 March?), resolve it by locale and show
  the interpretation. Do not guess silently.

**Common pitfall.** Being liberal without confirming. Silently accepting and
misinterpreting input (swapping day and month, dropping a digit) is worse than
rejecting it. Lenient parsing must come with a visible interpretation.

---

## ux-19 — Jakob's law

**What it does.** Users spend most of their time on other sites and apps, so they
expect yours to work the same way (Jakob Nielsen). Following conventions lets people
transfer knowledge they already have.

**When to use.** Navigation placement, logos, search, carts, account menus, form
patterns, gestures, icons, link styles, checkout flows. Use it wherever a strong
convention already exists.

**How to implement.**

- Put the logo top-left and link it home.
- Put search near the top, and the cart and account top-right.
- Use standard icons with labels.
- Underline links in body text.
- Use the platform's native controls and gestures.
- Innovate where your product is actually different, not on the basics.
- When you must change a convention, add a transition period and explain the change.

**Common pitfall.** Redesigning familiar patterns for novelty (a hamburger menu on
desktop, a mystery-meat icon for the cart). It looks fresh in a portfolio and costs
every user a moment of confusion.

---

## ux-20 — Frequency of use

> **Label note.** This principle's name was read from a reference screenshot and could
> not be verified against a canonical source. "Frequency of use" is not a single named
> law like Fitts's or Hick's. It describes an established design practice:
> frequency-based placement and prioritisation, often justified with the Pareto
> (80/20) principle and Fitts's law. Treat the label as tentative.

**What it does.** Ranks actions by how often they are used and makes the frequent ones
the easiest to reach: visible, large, close, one step away. Rare actions move behind
menus. The average effort per task falls the most where usage is highest.

**When to use.** Toolbars, message and email actions, mobile tab bars, context menus,
admin dashboards, keyboard shortcuts, settings organisation.

**How to implement.**

- Gather usage data (analytics, logs, interviews).
- Sort actions into frequent / occasional / rare.
- Promote frequent actions to primary, visible controls in the thumb zone or next to
  the content they act on, and give power users shortcuts.
- Demote rare and destructive actions to an overflow menu.
- Revisit the ranking when usage changes.

**Common pitfall.** Adaptive UIs that reorder controls automatically with usage. They
break spatial memory: people learn positions, and moving the button every week costs
more than it saves. Promote stable defaults, and let users pin or customise instead.
