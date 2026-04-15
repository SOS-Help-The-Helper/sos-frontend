# V24 Homepage Polish — Build Plan

## Working File
`public/home-v24.html` — this is a single self-contained HTML file with inline CSS and JS (GSAP + ScrollTrigger).

## DO NOT TOUCH
- Hero section (Section 1) — the 5-phase typing animation is finalized
- Crisis section (Section 2) — just updated, keep as-is
- Color scheme: navy #0F1E2B, white, #89CFF0 blue, #EF4E4B red
- Fonts: DM Serif Display (headings), Nunito Sans (body)
- GSAP + ScrollTrigger library includes

## CHANGES NEEDED

### 1. Ecosystem Section (Section 3: "The Help Exists")
**Current:** 4 cards in 2x2 grid with paragraph-length text each.
**Change to:** 3 cards side-by-side (3-column grid) with SHORT copy (2-3 sentences max per card).

Cards:
1. **Citizens** — "The actual first responders. Three out of four people turn to neighbors before any agency. People with trucks clear roads. Nurses triage on front porches."
2. **Organizations** — "Deployed within hours. Small nonprofits manage thousands of requests on spreadsheets. Faith-based groups self-organize through group chats. Everyone responds." 
3. **Government & Emergency Services** — "Overwhelmed and underfunded. 85% of state emergency agencies cite infrastructure limitations. Working with tools from a different era."

Remove the Disaster Economy card (that content moves to Solution section).
Grid: `grid-template-columns: repeat(3, 1fr)` on desktop, `1fr` on mobile.
Keep the same eco-card styling but ensure all 3 cards are roughly equal height.

### 2. Coordination Section (Section 4: "When coordination fails")
**Current:** Two comparison blocks (fail vs. work) with long paragraphs + a pull quote.
**Change:** 
- Keep the two comparison blocks but trim each to 3 concise lines max.
- REMOVE the pull quote (it repeats the headline).
- Keep the "The technology to make this possible didn't exist two years ago. It does now." line at the bottom.

Fail block: "Three organizations can help one family. Without coordination, two never hear about the need. The third shows up a week late. The family called nine hotlines. Nobody tracks what was spent."

Work block: "The shelter, food team, and medical transport all receive the same match simultaneously. Each knows what the other is doing. Every dollar traced. Every contribution attributed. The system learns."

### 3. Thesis Section (Section 5: horizontal scroll → vertical fade)
**Current:** Pinned horizontal scroll with 3 vignette cards + "Everyone is a helper" reveal.
**Change:** 
- Remove ALL horizontal scroll code (the thesis-pin-container, ScrollTrigger horizontal pin).
- Replace with simple vertical layout: 3 vignette cards that fade in on scroll (use existing `gs-fade` class).
- Keep the vignette content:
  1. "A displaced family finds temporary housing in a stranger's guest room — then clears roads with their truck by morning."
  2. "A nurse, still in scrubs, triages her neighbors on the front porch — while her own home floods behind her."
  3. "A teenager who speaks three languages becomes the only translator for miles — because no agency thought to plan for it."
- Keep "Everyone is a helper." headline with the thesis-closing text below it.
- Remove the thesis-dawn gradient div.
- THEN flow directly into the Maria scenario (merge sections 5 and 7).
- Maria's scenario cards should use the same scroll-fade reveal (gs-fade) instead of the pinned stacking animation.

CSS for the thesis section: keep `bg-navy` background. Use a simple centered layout with max-width 640px. Vignette cards stack vertically with `margin-bottom: 48px` between them.

### 4. Solution Section (Section 6: timeline → flywheel)
**Current:** 5-step linear timeline (Intake → Match → Coordinate → Fulfill → Learn).
**Change:** Replace the timeline with a circular flywheel SVG diagram.

Build the flywheel as an SVG:
- Circular path with 5 nodes equally spaced around it
- Each node: icon + label (Intake, Match, Coordinate, Fulfill, Learn)
- Arrows between nodes showing the cycle direction
- Center: SOS logomark (use /logomark-red.svg)
- Style: stroke #89CFF0 for the path, white text, nodes as circles with the label below
- ScrollTrigger: as user scrolls, each node fades in sequentially (stagger), then the center logo pulses
- On complete: subtle continuous rotation animation on the path

Below the flywheel, keep a simplified version of the result-card:
"The system doesn't just respond to disasters — it learns from them. Revenue from connecting homeowners with vetted contractors funds coordination for people with no insurance, no savings, no safety net."

Keep the section heading "Relief as permaculture." and the intro paragraph.

### 5. Scenario Section (Section 7) → Merge into Thesis
Move Maria's scenario to follow directly after "Everyone is a helper" in the merged Thesis section.
- Remove the separate scenario-section container
- Remove the pinned stacking ScrollTrigger animation
- Use simple gs-fade scroll reveal for each scenario card instead
- Keep all 6 scenario cards (Citizen → SOS Intelligence → Volunteer → Nonprofit → Government → Resolution)
- Keep the scenario-closing text: "Everyone was a helper. The system just made sure they could find each other."

### 6. Invitation Section (Section 8: origin story)
**Current:** Dense paragraph of origin story text.
**Change:** Break into 3 short visual moments:

Moment 1: "SOS started during Hurricane Helene. Our founder's farmhouse was damaged. He lived in a donated RV for three months."

Moment 2: "Since Helene, SOS has activated for every major disaster — including the Blizzard of 2026, coordinating hundreds of resources across 12 states."

Moment 3: "The values are structural, not aspirational. Partners keep their data. Citizens control their privacy. No profiles. No surveillance. Communities deserve infrastructure that works for them, not on them."

Style each as a separate text block with spacing between, not one paragraph.

### 7. Citations
**Current:** Wall of numbered links at the bottom.
**Change:** 
- Move citations INLINE — each claim in the page text should have a small superscript number that links to the source URL.
- Example: "305 million people needed assistance¹" where ¹ links to the OCHA report.
- REMOVE the citation block at the bottom entirely.
- The citations are already linked with `<a href="#cite-X" class="cite">` throughout the page — just make those link to the actual URLs instead of anchors.

### 8. Navigation
Update nav links to match the new merged section structure:
- Crisis | Ecosystem | Coordination | Thesis | Solution | Join
- Remove "Scenario" from nav (merged into Thesis)

## IMPORTANT
- This is a SINGLE HTML file with everything inline (CSS in <style>, JS in <script>).
- GSAP and ScrollTrigger are loaded from CDN — keep those includes.
- The file is ~1400 lines. Work carefully.
- Test that the gs-fade ScrollTrigger animations still work after restructuring.
- Mobile responsive: check all grid layouts collapse to single column on mobile (max-width: 640px).
- Do NOT change any GSAP code in the hero section (the async function at the top of the script).

When completely finished, run this command to notify me:
openclaw system event --text "Done: V24 homepage polish complete — ecosystem cards, flywheel, thesis merge, copy tightening, inline citations" --mode now
