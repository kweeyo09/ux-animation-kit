# UX & Animation Principles: Skill + demo gallery

Two deliverables built from one shared list of 20 principles (`ux-01` to `ux-20`):

1. **`skill/ux-animation-principles/`** is an importable Claude Skill. It teaches Claude to
   assess a UI task, choose the relevant principles, turn them into concrete motion and
   layout decisions, and verify the result, including accessibility, reduced motion and
   performance.
2. **`gallery/`** is a self-contained, dependency-free web app with one interactive demo per
   principle. Live at **https://kweeyo09.github.io/ux-animation-kit/**. It redeploys on every
   push to `main`, after the coverage check passes (`.github/workflows/pages.yml`).

```
ux-animation-kit/
├── skill/ux-animation-principles/
│   ├── SKILL.md                          # frontmatter + workflow (assess → select → translate → implement → verify)
│   ├── README.md
│   └── references/
│       ├── principles.md                 # all 20: what · when · how · pitfall
│       ├── element-recipes.md            # any principle on any element: hooks, 8 element recipes, stacking rules
│       └── accessibility-performance.md  # reduced motion, WCAG, keyboard, performance, verification recipes
├── gallery/
│   ├── index.html   styles.css   app.js
│   ├── record.html                       # recording view: just the 20 boxes on beige, motion looping
│   ├── registry.js                       # shared registry: gallery + coverage check
│   ├── demos.js                          # 20 demos, registered by ID
│   └── playground.js                     # apply any of the 20 principles to a button, card, dialog or toast
├── scripts/
│   ├── check-coverage.js                 # node, no dependencies
│   ├── smoke-test.js                     # optional, Playwright + Chromium
│   ├── serve.js                          # optional local static server, no dependencies
│   └── package.js                        # builds dist/ux-animation-principles.zip (cross-platform, no dependencies)
├── dist/ux-animation-principles.zip      # ready-to-upload Skill (generated; not committed)
└── package.json
```

## 1. Import the Skill

Run `npm run package` to build `dist/ux-animation-principles.zip` (the `dist/` folder is not committed). The archive contains the folder `ux-animation-principles/`
at its top level, with `SKILL.md` inside it. This is the structure Claude expects.

**Claude apps (web, desktop):**

1. Make sure code execution / file creation is turned on. Free, Pro and Max: Settings →
   Capabilities. Team and Enterprise: an owner enables Skills under Organization settings.
2. Go to **Customize → Skills**.
3. Click **+**, then **Create skill → Upload a skill**.
4. Choose `ux-animation-principles.zip`.
5. Make sure the skill is toggled on.

Claude then uses the skill automatically when a request matches its description. You can
also ask for it by name ("use the ux-animation-principles skill to review this screen").

**Claude Code:** copy the folder (not the ZIP).

```bash
# personal: available in all your projects on this machine
mkdir -p ~/.claude/skills && cp -R skill/ux-animation-principles ~/.claude/skills/
# or project-only: commit it so your team gets it too
mkdir -p .claude/skills && cp -R skill/ux-animation-principles .claude/skills/
```

Skills you enable in your Claude account also load in Claude Code when you sign in with
the same account.

**Rebuild the ZIP after editing the skill:** run `npm run package`. It works on Windows, macOS and Linux.

## 2. Run the gallery

There is no build step and nothing to install.

- **Quickest:** open `gallery/index.html` in a browser by double-clicking it. Everything,
  including scripts and styles, loads from local files.
- **Local server (optional):** `npm start` (or `node scripts/serve.js`), then open
  <http://localhost:5173>.

Using the gallery:

- **Playground (top of the page):** pick an element (button, card, dialog or toast), switch
  any of the 20 principles on or off, replay the entrance, press its button, simulate an
  error, and copy a spec for the combination you chose.
- **Motion demos (1–12):** Replay, a timeline scrubber with ◀ ▶ step-through (in frames at
  60fps), speed (1× / 0.5× / 0.25×), a "Static frames" view (filmstrip or onion skin), and
  per-demo parameters.
- **UX-law demos (13–20):** before/after comparisons you interact with: timed trials,
  hit counters, click counters.
- **Motion preference:** the **Motion** buttons are **System** (follows
  `prefers-reduced-motion`), **Reduce** and **Full**. With reduced motion, motion demos open
  on static frames and never autoplay.
- **Keyboard:** <kbd>Tab</kbd> moves through controls, <kbd>n</kbd> / <kbd>p</kbd> go to the
  next or previous demo, and the skip link jumps to the demos.
- **Deep links:** every card has a stable anchor, e.g. `index.html#ux-14`.
- **Recording view:** `record.html` shows only the 20 principle boxes on a beige
  background, with every motion demo looping, ready for a screen recording. It always
  animates, ignoring the reduced-motion setting, so use it for capture, not as the
  public page.

## 3. Verify

```bash
npm run check          # = node scripts/check-coverage.js  (Node 16+, no dependencies)
npm run test:browser   # = node scripts/smoke-test.js      (needs Playwright + Chromium)
```

`check-coverage.js` checks the following and exits non-zero on any failure:

- The registry has exactly the 20 expected titles, in order, with IDs `ux-01` to `ux-20`,
  each appearing exactly once.
- Each ID maps to its own demo implementation, with no shared or extra demos.
- The page loads registry → demos → app, and loads no remote assets.
- `SKILL.md` frontmatter is valid.
- The reference covers all 20 principles in order, each with its four parts.

`smoke-test.js` loads the gallery in headless Chromium and checks:

- The 20/20 badge, and each card's heading and demo.
- The playground: all 20 toggles, all 4 element types, and a visible effect for each UX
  law it switches on.
- The recording view: 20 boxes, beige background, no descriptive text, all 12 motion
  demos looping.
- Replay, scrubbing and static frames on all 12 motion demos.
- A scripted interaction on every UX-law demo.
- Reduced-motion emulation, keyboard navigation, focus visibility and accessible names.
- Mobile layout, and console errors.

It also writes screenshots to `dist/screenshots/`. To install its dependencies:
`npm i -D playwright && npx playwright install chromium`.

## Notes

- **Label #20, "Frequency of use":** read from a reference screenshot and not verified
  against a canonical source. It is a design practice (frequency-based placement), not a
  named law. This is flagged in the Skill reference and on the gallery card.
- **Fitts's and Hick's demo predictions** use illustrative constants (a = 150ms,
  b = 150ms/bit; a = 200ms, b = 150ms/bit). They show the shape of each law, not a
  calibrated model of your hand.
- **Demo timings** run slightly slower than production values, so the motion is easy to
  see. The Skill's timing tokens give the production ranges.
- **Browser support:** modern Chromium, Firefox and Safari (Web Animations API, CSS
  `offset-path`, `color-mix`).
