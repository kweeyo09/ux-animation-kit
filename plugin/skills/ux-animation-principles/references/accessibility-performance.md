# Accessibility, reduced motion and performance

Apply this to every recommendation, not only when the user asks about accessibility.

## Reduced motion

People with vestibular disorders, migraine, ADHD or motion sensitivity can be harmed or
distracted by large movement, parallax, zooming and spinning. Operating systems expose a
"Reduce motion" setting. On the web it is `prefers-reduced-motion: reduce`.

**Rule: reduce, don't remove meaning.** Replace movement with an equivalent that does
not move: an opacity crossfade, an instant state change, a colour or outline change.
Keep the information.

| Motion type | Reduced-motion replacement |
|-------------|---------------------------|
| Slide / fly-in / page transition | Crossfade ≤ 150ms, or instant |
| Parallax, scroll-linked movement | Static |
| Zoom / scale-in of large surfaces | Fade |
| Bounce, squash, overshoot, shake | None; keep the colour, icon and text cue |
| Spinner | Keep it, but slow and small; or show a text/progress indicator |
| Autoplaying decorative animation | Paused, with a play control |

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

The blanket rule above is a safety net. Prefer authoring a deliberate reduced variant
per component.

```js
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
function animateIn(el) {
  if (reduce.matches) return el.animate([{ opacity: 0 }, { opacity: 1 }], 120);
  return el.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
                    { duration: 220, easing: 'cubic-bezier(0,0,.2,1)' });
}
reduce.addEventListener('change', () => { /* re-evaluate */ });
```

The Web Animations API and JavaScript libraries are **not** affected by the CSS media
query. Check `matchMedia` in code (Framer Motion: `useReducedMotion`; SwiftUI:
`accessibilityReduceMotion`; Android: `ANIMATOR_DURATION_SCALE`).

For teaching or demo contexts, offer a **static comparison** (filmstrip of key poses)
or a **step-through** (scrubber / previous–next pose) instead of playback.

## WCAG criteria that bear on motion and interaction

- **2.2.2 Pause, Stop, Hide (A):** moving content that starts automatically and lasts
  more than 5 seconds needs a way to pause, stop or hide it.
- **2.3.1 Three Flashes or Below Threshold (A):** nothing flashes more than 3 times per
  second.
- **2.3.3 Animation from Interactions (AAA):** motion triggered by interaction can be
  disabled unless it is essential. Honouring `prefers-reduced-motion` satisfies this in
  practice.
- **2.5.8 Target Size (Minimum) (AA, WCAG 2.2):** targets are at least 24×24 CSS px, or
  have enough spacing.
- **2.5.5 Target Size (Enhanced) (AAA):** 44×44 CSS px.
- **2.4.7 Focus Visible (AA)** and **2.4.11 Focus Not Obscured (AA, 2.2):** animations
  must not hide or detach the focus indicator. Sticky or animated overlays must not
  cover the focused element.
- **1.4.1 Use of Color / 1.3.3 Sensory Characteristics:** never convey state by motion
  alone (or colour alone). Pair it with text and an icon.
- **4.1.3 Status Messages (AA):** announce async results with `aria-live` / `role=status`.

## Keyboard and focus with motion

- Move focus into a dialog when it opens and return it to the trigger on close.
- Do not move focus to an element that is still animating in from off-screen, unless it
  is already rendered in its final position for assistive technology.
- Keep the DOM order equal to the visual order after any reordering animation (FLIP).
- An element that animates out must become `inert` / `aria-hidden` immediately, not
  after the animation ends.

## Performance

- **Animate compositor-friendly properties:** `transform`, `opacity`, and (with care)
  `filter`. Animating `width`, `height`, `top`, `left`, `margin` or `box-shadow` on large
  elements triggers layout or paint every frame.
- **Animate size changes with FLIP:** measure First and Last, Invert with a transform,
  then Play.
- **`will-change`:** apply it shortly before an animation and remove it afterwards.
  Never set it globally, because every promoted layer costs memory.
- **Frame budget:** 16.7ms at 60Hz, 8.3ms at 120Hz. Long JavaScript tasks during an
  animation cause jank. Do the work before the animation or after it.
- **Interaction to Next Paint (INP):** ≤ 200ms is "good". Give visual feedback in the
  same frame as the input (CSS `:active`) and defer heavy work.
- **Prefer interruptible animations:** cancel and retarget on new input instead of
  queueing animations.
- **Low-end devices:** test with CPU throttling (4–6× in Chrome DevTools). Reduce
  blur, large shadows and simultaneous animations if frames drop.
- **Off-screen work:** pause animations that are not visible (IntersectionObserver,
  `content-visibility`).
- **Lottie and video:** cap file size and frame rate, and provide a static poster for
  reduced motion.

## Verification recipes

1. Chrome DevTools → Rendering → "Emulate CSS media feature prefers-reduced-motion:
   reduce". Every animation should change or stop. In Playwright, use
   `page.emulateMedia({ reducedMotion: 'reduce' })`.
2. DevTools → Animations panel at 10–25% speed: check easing, overlap and stagger.
3. Performance panel with 4× CPU throttling: no long tasks during animations, and
   frames stay inside budget.
4. Keyboard-only pass: Tab through every animated control, and check that focus is
   visible and never lost.
5. Add a temporary `outline` on the hit areas (`::before`) to check target size and
   overlap.
