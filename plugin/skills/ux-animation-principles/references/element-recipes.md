# Apply any principle to any element

Any of the 20 principles can be added to any element in a design. They are not reserved
for big hero moments. Each principle attaches to one part of an element's life. Find that
part on the element in front of you, make the change, and the principle is applied.

Use this file when the request is "add X to this Y" (for example "add follow through to
this card"), "which principles could improve this element", or "apply a set of
principles to this component".

## The six hooks

Every UI element, from a button to a full page, has the same six places where a
principle can attach:

| Hook | What it covers |
|------|----------------|
| **Enter / exit** | How the element appears, leaves, opens or collapses |
| **Press** | What happens the moment it is pressed, tapped, hovered or dragged |
| **Feedback** | How it reports success, error, progress or a state change |
| **Content** | What it shows inside: text, numbers, media, child elements |
| **Actions** | The controls it offers and how they are ranked |
| **Placement & size** | Where it sits, how big it is, and how far it is from the user's pointer or thumb |

## Principle → hook → change

| ID | Principle | Main hook | The change, on any element |
|----|-----------|-----------|----------------------------|
| ux-01 | Squash & stretch | Press | Compress on press (`scale(1.04, .94)` or `scale(.96)`), rebound on release; stretch along the direction of travel when it moves fast |
| ux-02 | Anticipation wind-up | Enter / exit | Before a big move, a 5–15% move the opposite way for ~20% of the duration, then go |
| ux-03 | Staging the focus | Enter / exit | When it appears, keep everything else still, lower competing contrast (scrim, dim, blur), then bring it in; move focus to it |
| ux-04 | Pose to pose | Enter / exit | Define its key states (rest, extreme, settled) with explicit values and offsets; interpolate between them, never nudge per frame |
| ux-05 | Follow through | Enter / exit | The container stops first; its children (text, icon, rows) arrive 30–60ms later with a 2–6px overshoot that settles |
| ux-06 | Ease in & ease out | Enter / exit | Ease-out to enter, ease-in to exit, ease-in-out to move on screen; never linear for position |
| ux-07 | Arcs | Enter / exit | When it travels far (fly to cart, FAB to sheet), move along a curve, not a straight diagonal |
| ux-08 | Secondary action | Feedback | Add a smaller supporting motion just after the main one: icon draw-on, particles, count roll, badge pop |
| ux-09 | Snappy timing | Enter / exit and Press | Set duration from its size and frequency: 100–180ms small, 200–300ms medium, 300–450ms large; exit about 25% shorter |
| ux-10 | Exaggerated feedback | Feedback | Push the error or success response past realism (shake, pulse, spring back) and pair it with colour, icon and text |
| ux-11 | Solid 3D models | Press and Enter / exit | Give it depth: perspective on flips and tilts, a consistent light direction, a shadow that grows and softens as it lifts |
| ux-12 | Consistency | All hooks | Use the shared duration, easing, radius and elevation tokens, the same as every sibling element |
| ux-13 | Fitts's law | Placement & size | Make its primary target bigger and closer to where the pointer or thumb already is; use screen edges |
| ux-14 | Bigger hit areas | Placement & size | Keep the visual size; expand the clickable area to ≥ 24px (44px for touch) with padding or `::before`, without overlapping neighbours |
| ux-15 | Hick's law | Actions | Show fewer choices at once: one primary, one secondary, the rest behind "More"; mark a recommended default |
| ux-16 | Miller's law | Content | Chunk what it shows: group digits, split long text into labelled groups, keep the facts for a decision visible together |
| ux-17 | Doherty threshold | Feedback | Acknowledge any press within 100ms (pressed state, spinner, optimistic update); show a skeleton or progress before 400ms |
| ux-18 | Postel's law | Content (inputs) | If it takes input, accept the common formats, normalise them, and show the interpreted value back |
| ux-19 | Jakob's law | Placement & size and Actions | Put it, its icon and its actions where people expect them from other products (close top-right, primary action last in the row) |
| ux-20 | Frequency of use | Actions | Rank its actions by usage; promote the most frequent to a visible primary control, demote rare ones to an overflow menu |

When an element has no obvious place for a principle, it usually has one at the next
level up. A toast has no input, so Postel's law applies to the "Undo"/"Reply" field it
opens. A button has no list of actions, so Hick's law applies to the toolbar the button
sits in. State that move explicitly.

## Element recipes

Each recipe lists all 20 principles on one element. Use them as starting values; tune
them against the project's tokens if it has them.

### Button

Anatomy: label, optional icon, container, sits in a row of actions.

- ux-01: on `:active`, `scale(.96)` in 80ms; on release, spring back to 1 in 160ms.
- ux-02: for a "Send" or "Launch" button, the icon pulls back 3px before flying out.
- ux-03: after a destructive click, the confirmation dialog dims the page; nothing else moves.
- ux-04: for loading, use three poses (label → spinner → check), each with an explicit width.
- ux-05: the icon inside lags the container by 30ms on hover-lift, then settles.
- ux-06: hover lift `translateY(-1px)` with ease-out; press back down with ease-in.
- ux-07: an "Add to cart" button sends a dot along an arc to the cart icon.
- ux-08: after success, the check draws on 60ms after the colour change.
- ux-09: hover 120ms, press 80ms, loading swap 160ms.
- ux-10: on failure, a 3-cycle shake of ±6px plus error text below.
- ux-11: a raised button's shadow tightens on press, as if pushed into the surface.
- ux-12: every button uses the same press scale, durations and radius.
- ux-13: the primary button is at least 44–48px tall and sits next to the last field it completes.
- ux-14: a small text or icon button gets a 44px hit area through padding.
- ux-15: no more than one primary and one secondary button in a row; the rest go to "More".
- ux-16: a long label is split ("Save · Draft 3") or shortened, never wrapped over two lines.
- ux-17: the pressed state shows in the same frame; a spinner replaces the label if the action takes longer than 400ms.
- ux-18: a "Pay £12" button accepts the amount from a field that took "12", "£12" or "12.00".
- ux-19: the primary button sits on the right of a dialog's button row (or follows the platform convention).
- ux-20: the most-used action gets the button; rarer ones become a split-button menu.

### Card

Anatomy: container, media, title, meta text, actions.

- ux-01: tapping squashes the card to `scale(.98)`; it rebounds on release.
- ux-02: when dismissed by swipe, it pulls back slightly in the opposite direction before flying out.
- ux-03: when expanding to detail, siblings fade to 40% and stay still.
- ux-04: expand from card to detail via explicit poses (card → lifted → full) as a shared-element transition.
- ux-05: on entry, the image lands first, then the title, then the meta text 40ms apart, each with a small overshoot.
- ux-06: enter with ease-out (fade + 8px rise), leave with ease-in.
- ux-07: a card dragged to another column travels on a slight arc.
- ux-08: "Saved" bookmarks pop, and a count beside them rolls up.
- ux-09: entry 240ms, stagger capped at 5 cards.
- ux-10: a card that can't be dropped springs back past its origin and settles.
- ux-11: on hover, tilt by up to 4° towards the pointer, with the shadow shifting the opposite way.
- ux-12: all cards share radius, elevation and entry timing.
- ux-13: the whole card is the target, not just the title link.
- ux-14: small icon actions on the card get 44px hit areas that don't overlap the card's main target.
- ux-15: one primary action visible; secondary actions in a "⋯" menu.
- ux-16: meta text grouped as "3 rooms · 2 baths · 84 m²", not a run-on sentence.
- ux-17: tapping shows the pressed state at once and loads the detail behind a skeleton.
- ux-18: an inline quantity field on a product card accepts "2", "two" or "x2".
- ux-19: image on top, title then meta, action bottom-right, as in most card UIs.
- ux-20: the action people take most on this card type (Open, Add, Reply) is the one shown.

### Dialog / modal

Anatomy: scrim, panel, title, body, close button, action row.

- ux-01: the panel enters at `scale(.96, 1.02)` and settles to 1, a subtle stretch.
- ux-02: a destructive confirm button dips 2px before the dialog closes.
- ux-03: scrim first (200ms), then the panel; the page behind never moves.
- ux-04: open through explicit poses (scale .96 + opacity 0 → 1.01 → 1).
- ux-05: body content and buttons arrive 40ms after the panel.
- ux-06: open with ease-out, close with ease-in.
- ux-07: a dialog opened from a FAB grows out of it along a curved path.
- ux-08: after a successful submit, a check animates in before the dialog closes.
- ux-09: open 240ms, close 180ms.
- ux-10: invalid submit shakes the offending field, not the whole dialog.
- ux-11: the panel sits on a higher elevation token with a larger, softer shadow.
- ux-12: every dialog in the product opens and closes the same way.
- ux-13: buttons are full-width at the bottom on mobile, within thumb reach.
- ux-14: the × close button gets a 44px hit area.
- ux-15: two choices at most (confirm / cancel), with the safe one as default.
- ux-16: long forms inside the dialog are grouped into labelled sections.
- ux-17: confirm shows a spinner in the button immediately; the dialog stays until the result.
- ux-18: its inputs accept and normalise common formats.
- ux-19: title top-left, × top-right, actions bottom-right (or the platform's order).
- ux-20: the action people pick most often is the primary button.

### Toast / notification

Anatomy: container, icon, message, one action, dismiss.

- ux-01: the icon squashes slightly as the toast lands.
- ux-02: it dips 4px before sliding out on dismiss.
- ux-03: one toast at a time; a new one replaces the old one instead of stacking and jiggling.
- ux-04: enter, rest, exit are three explicit poses with fixed offsets.
- ux-05: the icon and text trail the container by 30–50ms.
- ux-06: slide in with ease-out from the edge it lives on.
- ux-07: a toast confirming an add-to-cart can originate from the item and arc to its slot.
- ux-08: the success icon draws on after the toast arrives.
- ux-09: enter 200ms, exit 150ms; on screen for at least 4–6s, or until the pointer leaves.
- ux-10: an error toast gets a single pulse and an error icon; a success toast does not pulse.
- ux-11: it floats on its own elevation, with a shadow consistent with other overlays.
- ux-12: every toast uses the same position, timing and style.
- ux-13: the action button sits at the end closest to the thumb or pointer.
- ux-14: the dismiss × has a 44px hit area.
- ux-15: one action only ("Undo" or "View"), never several.
- ux-16: the message is short and specific: "Deleted 3 files", not a paragraph.
- ux-17: the toast appears within 100ms of the action, before the server confirms, if the action is optimistic.
- ux-18: if "Reply" opens an inline field, that field accepts loose input.
- ux-19: bottom-centre on mobile, bottom-left or top-right on desktop, as the platform does.
- ux-20: the action offered is the follow-up people take most ("Undo" after delete).

### Toggle / switch

Anatomy: track, knob, label.

- ux-01: the knob stretches along its travel and squashes as it lands.
- ux-02: not appropriate for a frequent control; skip it or keep it under 30ms.
- ux-03: a toggle that changes the screen (dark mode) animates the toggle first, then the screen.
- ux-04: two poses (off, on), interpolated; never stepwise.
- ux-05: a label or icon inside the knob arrives slightly after the knob.
- ux-06: the knob moves with ease-in-out.
- ux-07: travel is short, so no arc.
- ux-08: the track colour change follows the knob by 30ms.
- ux-09: 150–180ms total.
- ux-10: a toggle that can't change (locked) shakes once, and a lock icon and a reason appear.
- ux-11: the knob has a small shadow that shifts with its position.
- ux-12: all toggles share size, colours and timing.
- ux-13: the whole row (label + switch) toggles, not just the switch.
- ux-14: a 44px-tall hit area even if the switch is drawn 24px tall.
- ux-15: group many toggles into labelled sections, with defaults set.
- ux-16: 5–7 toggles per group, each with a short label.
- ux-17: it flips immediately (optimistic) and reverts with an error if saving fails.
- ux-18: not an input of text; applies to any search that finds settings ("dark", "night", "theme").
- ux-19: switch on the right of its label, on = right and accent colour.
- ux-20: the most-changed settings sit at the top of the settings list.

### Text input

Anatomy: label, field, helper or error text, optional icon or button.

- ux-01: the field's focus ring expands slightly and settles.
- ux-02: not on typing; acceptable for a "submit" arrow that pulls back before sending.
- ux-03: on error, only the invalid field and its message change; the rest of the form stays still.
- ux-04: label floats between two poses (inside the field → above it).
- ux-05: the helper text arrives 30ms after the error border.
- ux-06: the floating label moves with ease-out.
- ux-07: none: input motion is short.
- ux-08: a valid-input check draws on after the border turns green.
- ux-09: focus ring 120ms; label float 160ms.
- ux-10: an invalid submit shakes the field ±6px and shows an error with an icon.
- ux-11: the focused field lifts on a subtle elevation token.
- ux-12: all inputs share height, radius, focus ring and error style.
- ux-13: the field is wide enough for its expected value and sits close to its label.
- ux-14: the whole field, including padding, focuses on click; clear and reveal icons get 44px areas.
- ux-15: for choice inputs, a short list with a recommended default.
- ux-16: long values are displayed chunked (card number, phone, IBAN) while typing.
- ux-17: validation feedback within 100ms of blur, not on submit.
- ux-18: accept common formats (spaces, dashes, "12 Mar", "tomorrow") and show the normalised value.
- ux-19: label above the field, error below it, standard input types and keyboards.
- ux-20: autofill or suggest the value people enter most often.

### List item / row

Anatomy: leading media, text, trailing meta, swipe or row actions.

- ux-01: the row compresses on press and rebounds.
- ux-02: a swipe-to-delete row pulls back slightly before collapsing.
- ux-03: when a row expands, the other rows don't animate.
- ux-04: reorder animations use explicit start and end positions (FLIP).
- ux-05: the trailing meta trails the row when it slides in.
- ux-06: rows enter with ease-out.
- ux-07: a row dragged to another list travels on a slight arc.
- ux-08: an unread dot shrinks away after the row is opened.
- ux-09: row entry 200ms, stagger of 30ms, capped at 5 rows.
- ux-10: a row that can't be dropped springs back.
- ux-11: a dragged row lifts on a higher elevation token.
- ux-12: all rows share height, padding and animations.
- ux-13: the whole row is the target.
- ux-14: trailing icon buttons get 44px hit areas that don't overlap each other.
- ux-15: at most one visible row action; the rest on swipe or in a menu.
- ux-16: long lists are grouped by date or category with headers.
- ux-17: tapping highlights the row immediately; detail loads behind a skeleton.
- ux-18: list search accepts typos and partial matches.
- ux-19: avatar left, text middle, meta and chevron right.
- ux-20: the most-used row action is the visible or swipe action.

### Menu / dropdown

Anatomy: trigger, panel, items, dividers, optional search.

- ux-01: the panel enters at `scaleY(.96)` from its trigger and settles.
- ux-02: not appropriate: menus are frequent and need to open at once.
- ux-03: the trigger stays highlighted while the menu is open; nothing else moves.
- ux-04: two poses (closed at the trigger, open), interpolated.
- ux-05: items arrive 20ms apart after the panel, capped at 5.
- ux-06: open with ease-out, close with ease-in.
- ux-07: none: the move is short.
- ux-08: a selected item's check draws on.
- ux-09: open 150–200ms, close 120ms.
- ux-10: a disabled item shakes once and shows why when clicked.
- ux-11: the panel sits on the overlay elevation with a consistent shadow.
- ux-12: all menus share timing, padding and item height.
- ux-13: the menu opens at the cursor (context menu) or right next to its trigger.
- ux-14: items are at least 36–44px tall, the full width of the panel.
- ux-15: 7 items or fewer per group; group the rest under dividers or a submenu.
- ux-16: items grouped into labelled sections.
- ux-17: it opens on press, not after a delay.
- ux-18: menu search matches synonyms and partial words.
- ux-19: standard order (e.g. Cut, Copy, Paste) and standard shortcuts shown on the right.
- ux-20: the most-used items go first; destructive ones go last.

## Stacking several principles on one element

Principles combine, but some pairs pull against each other. Resolve them like this:

| Combination | Rule |
|-------------|------|
| Anticipation (ux-02) + Snappy timing (ux-09) | On frequent elements, drop anticipation or cut it below 40ms. Keep it for rare, big moves. |
| Exaggerated feedback (ux-10) + Consistency (ux-12) | Exaggeration is only for errors and key successes. Everything else uses the standard tokens. |
| Follow through (ux-05) + Snappy timing (ux-09) | The settle must finish within the element's duration budget plus 100ms at most. |
| Arcs (ux-07) on short moves | Don't. Arcs are for long journeys. |
| Squash & stretch (ux-01) on text | Never deform text. Deform the container or the icon. |
| Staging (ux-03) + Secondary action (ux-08) | The secondary action must not start until the staged element has landed. |
| Frequency of use (ux-20) + Jakob's law (ux-19) | Promote frequent actions within the conventional layout. Don't move them somewhere novel. |
| Several motion principles together | Pick one hero principle per element and keep the others subtle. Check that the total duration still fits ux-09. |

The gallery's element playground shows this hands-on: pick an element, switch any of the
20 principles on or off, and replay.
