# UX & Animation Principles: Skill + demo gallery

Two deliverables built from one shared list of 20 principles (`ux-01` to `ux-20`):

1. **`plugin/skills/ux-animation-principles/`** is the Claude Skill, packaged as a Claude Code
   plugin in a one-plugin marketplace (this repo), and as a ZIP for the Claude apps.
   It teaches Claude to assess a UI task, choose the relevant principles, turn them into
   concrete motion and layout decisions, apply any principle to any element, and verify the
   result, including accessibility, reduced motion and performance.
2. **`gallery/`** is a self-contained, dependency-free web app with one interactive demo per
   principle. Live at **https://kweeyo09.github.io/ux-animation-kit/**. It redeploys on every
   push to `main`, after the coverage check passes (`.github/workflows/pages.yml`).

```
ux-animation-kit/
├── .claude-plugin/marketplace.json       # makes this repo a Claude Code plugin marketplace
├── plugin/
│   ├── .claude-plugin/plugin.json        # plugin manifest (name, version, author)
│   └── skills/ux-animation-principles/
│       ├── SKILL.md                      # frontmatter + workflow (assess → select → translate → implement → verify)
│       ├── README.md
│       └── references/
│           ├── principles.md             # all 20: what · when · how · pitfall
│           ├── element-recipes.md        # any principle on any element: hooks, 8 element recipes, stacking rules
│           └── accessibility-performance.md  # reduced motion, WCAG, keyboard, performance, verification recipes
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

## 1. Install the Skill

### Claude Code (plugin, updates from GitHub)

This repo is a Claude Code plugin marketplace. In Claude Code (2.1.275 or later) run:

```
/plugin install ux-animation-principles --marketplace kweeyo09/ux-animation-kit
```

On older versions, use the two-step form:

```
/plugin marketplace add kweeyo09/ux-animation-kit
/plugin install ux-animation-principles@ux-animation-kit
```

The same works from a terminal with `claude plugin marketplace add kweeyo09/ux-animation-kit`
and `claude plugin install ux-animation-principles@ux-animation-kit`. To pick up changes
after a push, run `claude plugin marketplace update ux-animation-kit`, then
`claude plugin update ux-animation-principles@ux-animation-kit`, and restart Claude Code.
Bump `version` in both
`plugin/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` when you release
a change, so Claude Code sees a new version.

Plugin skills are namespaced: the skill may appear as
`ux-animation-principles:ux-animation-principles`. Claude still picks it up automatically
from its description.

**Without the plugin system**, copy the folder instead (updates are manual):

```bash
# macOS / Linux: personal, available in all your projects
mkdir -p ~/.claude/skills && cp -R plugin/skills/ux-animation-principles ~/.claude/skills/
```

```powershell
# Windows PowerShell: personal, available in all your projects
New-Item -ItemType Directory -Force "$HOME\.claude\skills" | Out-Null
Copy-Item -Recurse -Force plugin\skills\ux-animation-principles "$HOME\.claude\skills\"
```

For one project only, copy it into that project's `.claude/skills/` and commit it.

### Claude apps (web, desktop)

Run `npm run package` to build `dist/ux-animation-principles.zip` (the `dist/` folder is not
committed). The archive contains the folder `ux-animation-principles/` at its top level,
with `SKILL.md` inside it. This is the structure the apps expect.

1. Make sure code execution / file creation is turned on. Free, Pro and Max: Settings →
   Capabilities. Team and Enterprise: an owner enables Skills under Organization settings.
2. Go to **Customize → Skills**.
3. Click **+**, then **Create skill → Upload a skill**.
4. Choose `ux-animation-principles.zip`.
5. Make sure the skill is toggled on. Uploads don't update in place: re-upload after changes.

Claude then uses the skill automatically when a request matches its description. You can
also ask for it by name ("use the ux-animation-principles skill to review this screen").

Install it in Claude Code and in the Claude apps separately: don't count on one syncing to
the other.

### Check the packaging

`npm run check` verifies the marketplace and plugin manifests along with the 20/20
coverage. For the official check, run `claude plugin validate .` (marketplace) and
`claude plugin validate ./plugin` (plugin). It reports a missing licence and icon, which
only matter if you submit to Anthropic's public plugin directory.

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
- **Motion demos (1–12):** an icon-only Replay button and a "Static frames" view (filmstrip
  or onion skin, labelled in frames at 60fps). Some demos keep one parameter control, e.g.
  the easing picker in Ease in & ease out.
- **UX-law demos (13–20):** before/after comparisons you interact with: timed trials,
  hit counters, click counters.
- **Motion preference:** the **Motion** buttons are **System** (follows
  `prefers-reduced-motion`), **Reduce** and **Full**. With reduced motion, motion demos open
  on static frames and never autoplay.
- **Keyboard:** <kbd>Tab</kbd> moves through controls, <kbd>n</kbd> / <kbd>p</kbd> go to the
  next or previous demo, and the skip link jumps to the demos.
- **Deep links:** every card has a stable anchor, e.g. `index.html#ux-14`.
- **Recording view:** `record.html` is a presenter for screen recordings on a beige
  background. The 20 names are listed on the left, and one large box (with the
  principle's title inside it) fills the rest, with motion demos looping. Switch with the
  ← → buttons at the bottom, the ← → keys, or by clicking a name. `#ux-07` opens a given principle.
  `record.html?view=grid` shows all 20 boxes at once, scaled to fit one 1920×1080 screen:
  `-` / `=` resize it in 5% steps, `0` resets, and `?scale=0.4` sets the scale. It always
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
- The recording view: presenter layout (list, one box with its title, arrows at the bottom, keys), and the
  grid layout (20 boxes on one screen, beige background, no descriptive text, all 12
  motion demos looping).
- Replay and static frames on all 12 motion demos, and their two-button control bar.
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
