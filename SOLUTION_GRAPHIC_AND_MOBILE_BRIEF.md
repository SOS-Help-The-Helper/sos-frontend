# Build Brief — Solution Graphic Redesign + Mobile Optimization

Repo: sos-frontend. Static marketing pages live in `public/*.html` and are served at clean routes via Next.js rewrites (e.g. `public/home-v25.html` → `/`). DO NOT touch React routes under `app/` except where explicitly noted. DO NOT run `next build` or `npm install`. DO NOT deploy. Commit only.

Brand tokens (use ONLY these):
- Navy `#0F1E2B`, Coral/Red `#EF4E4B`, Light Blue `#89CFF0`, Green `#34D399`, White `#ffffff`
- Marketing body text `#3d4852`, muted `#6b7280`
- FORBIDDEN colors: `#e74c3c`, `#1a1a1a`, `#333`, `#555`, `#888`
- Fonts: DM Serif Display (headlines), Nunito Sans (body/UI). No other fonts.
- NO EM DASHES anywhere in visible copy. Use periods or commas.

Files in scope:
- `public/home-v25.html` (homepage, served at `/`)
- `public/the-problem.html` (served at `/the-problem`)
- `public/the-sos-story.html` (served at `/the-sos-story`)
- `public/donate.html` (served at `/donate`)

---

## TASK 1 — Redesign the Solution graphic (home-v25.html, `<section id="solution">`)

The section currently contains an SVG `id="flywheelSvg"` (a circular "Coordination Loop" with 5 nodes: Intake, Map, Match, Fulfill, Learn) on a light gray background, with numbered circles (01-05) and directional arcs with arrowheads.

Required changes:
1. **Heading:** change the section heading to read exactly `A Full Lifecycle Humanitarian Platform` (keep it as a single headline; you may keep the small "The Solution" eyebrow label above it). Keep DM Serif Display styling consistent with other section headings.
2. **Navy background:** the graphic must sit on a navy `#0F1E2B` panel/background (currently light). The node circles, text, and ring must be recolored for legibility on navy: circle fill navy or transparent with white/light-blue stroke, node label text white `#ffffff` or light-blue `#89CFF0`. The center SOS logomark stays (use `/logomark-red.svg` or `/logomark-white.svg` — whichever reads better on navy; prefer red logomark which is brand).
3. **Remove the numbers** (01, 02, 03, 04, 05 `<text>` elements) from the circles. Keep the node name labels (Intake, Map, Match, Fulfill, Learn).
4. **Remove the arrows** (remove `marker-end="url(#fw-arrow)"` and the arrowheads / the `<marker id="fw-arrow">` def, and the directional arc strokes if they look like arrows). The connecting lines between nodes may remain as subtle static guide lines OR be removed; your call for cleanest look on navy. No visible arrowheads.
5. **Chain-reaction animation:** add a gentle animated line/pulse that STARTS at the Intake node (top) and travels to each circle one at a time in a chain-reaction motion around the loop (Intake → Map → Match → Fulfill → Learn → back toward Intake). A traveling glowing dot or a sequentially-drawn light line in coral `#EF4E4B` or light-blue `#89CFF0` works well. Loop it gently and continuously (slow, calm, not flashy). Respect `prefers-reduced-motion` (disable motion if set).
6. **Pop / start animation at Intake:** give the Intake node a clear "pop" or pulse-out animation so viewers can see the loop originates there. A soft scale-up pop plus an expanding ring emanating from Intake at the start of each cycle.
7. Keep the section's existing supporting paragraph and the "Support this work" link below the graphic. Keep the GSAP scroll-reveal behavior working (the section uses `gs-fade` and scroll triggers — do not break them).
8. Keep everything responsive: the SVG must scale down cleanly on mobile (375px) and the navy panel must not overflow horizontally.

This is the centerpiece. Make it feel calm, premium, and on-brand. Test that the SVG still renders (valid markup) and animations are CSS/SMIL/JS that run without a build step.

---

## TASK 2 — Mobile optimization (all 4 files)

Audit and fix mobile layout (target widths: 375px and 414px) on all four pages. Common issues to fix:
- Horizontal overflow / elements wider than viewport
- 3-column card grids that should stack to 1 column on mobile (crisis cards, ecosystem cards on homepage)
- The donate page two-column give layout (`.give-wrap`) must stack cleanly (it has a `@media (max-width:820px)` rule — verify it works and the Givebutter form is not cut off)
- Font sizes that are too large on small screens (use clamp() or media queries)
- Tap targets / nav links usable on mobile
- Section padding too wide on mobile (many sections use `padding: 0 48px` — reduce on mobile)
- The floating chat bubble (`#chatBubble` / `#chatPanel`) must remain usable and not overlap key CTAs on mobile

Use min-width-safe CSS. Do not change desktop layout. Do not introduce forbidden colors. Do not change copy.

---

## TASK 3 — Agent embed check (homepage)

The homepage has a floating chat agent: `#chatBubble` opens `#chatPanel` which loads `/join` in an iframe (on mobile it navigates directly to `/join`). Verify:
- The bubble is visible and tappable on both desktop and mobile, not clipped, good contrast.
- On mobile the panel/iframe fills the screen properly (there is already a `@media (max-width:...)` rule for `#chatPanel`).
- Do not change the `/join` target or the open/close JS logic; only fix visual/layout issues if any.

---

## Acceptance criteria
- [ ] Solution heading reads exactly "A Full Lifecycle Humanitarian Platform"
- [ ] Solution graphic is on a navy background, legible
- [ ] No number labels (01-05) on the circles
- [ ] No visible arrowheads on the loop
- [ ] A chain-reaction animation runs from Intake around to each node sequentially, looping gently
- [ ] Intake node has a visible "pop"/origin animation
- [ ] `prefers-reduced-motion` disables the motion
- [ ] All 4 pages: no horizontal overflow at 375px; card grids stack to 1 col on mobile
- [ ] Donate two-column layout stacks cleanly on mobile, Givebutter form not cut off
- [ ] Floating chat bubble usable on desktop + mobile
- [ ] No forbidden colors introduced; only brand tokens used
- [ ] No em dashes in visible copy
- [ ] Valid HTML; no build step required; existing GSAP scroll reveals still work
- [ ] Commit with a descriptive message. Do NOT deploy. Do NOT run next build.
