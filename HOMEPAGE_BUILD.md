# SOS Homepage Build — Task Document

> Owner: Henry-SOS
> Created by: Henry-Prime (2026-04-02)
> Approved by: Jonathan
> Status: Ready to build

## Overview

Build a modern, visually striking homepage for sosconnect.org that tells the SOS story through data, research, and the SIGNAL coordination flow. The homepage IS the first impression for Ben Goldstein's article, partners, Google.org, and anyone discovering SOS.

**Theme:** Coordination. Everything connects.

**Design philosophy:** One continuous dark canvas (navy `#0F1E2B`) with a subtle coordinate grid background. Content floats on glass cards. A glowing node travels the grid as you scroll, lighting up connections. Modern, alive, not a template.

---

## Brand Colors (strict — no others)

| Name | Hex | Usage |
|---|---|---|
| Navy | `#0F1E2B` | Primary background |
| Dark Navy | `#1A3850` | Callout blocks, secondary bg |
| SOS Red | `#EF4E4B` | Accent, stats, CTA buttons |
| Info Blue | `#89CFF0` | Grid lines, highlights, subcopy |
| Cream | `#FFF8F0` | Text on dark, light accents |
| White | `#FFFFFF` | Primary text on dark backgrounds |

---

## Build Strategy

**Phase 1:** Static HTML page at `public/home.html` — all 9 sections, glass cards, grid background, logomark pulse, stat count-up, copy. No canvas animation yet. Jonathan reviews layout + copy.

**Phase 2:** Canvas grid + traveling node animation. Scroll-linked. Node moves through grid intersections, lines light up behind it. Tuning pass.

**Phase 3:** Port to Next.js `app/page.tsx`. Wire up agent CTA with homepage-specific system prompt + chips. Deploy live.

---

## Design System

### Background
- Entire page: navy `#0F1E2B` with coordinate grid overlay (`#89CFF0` at 3% opacity)
- Grid: `background-image: linear-gradient(rgba(137,207,240,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(137,207,240,0.03) 1px, transparent 1px); background-size: 40px 40px;`
- NO alternating cream/navy sections. One continuous canvas.

### The Node (Phase 2)
- White glowing circle travels along grid lines as user scrolls
- As it passes intersections, lines behind it light up in `#89CFF0` and fade
- Represents coordination spreading through a network
- Built with HTML canvas layer behind content, scroll-position drives via `IntersectionObserver` + `requestAnimationFrame`
- At "Everyone is a helper" section, node splits into multiple branching paths

### Glass Cards
```css
backdrop-filter: blur(16px);
background: rgba(255, 255, 255, 0.05);
border: 1px solid rgba(255, 255, 255, 0.1);
border-radius: 16px;
```

### Callout Blocks
- Full-width dark navy `#1A3850` background
- Left accent bar (4px) in red `#EF4E4B` or blue `#89CFF0`

### Stat Blurbs
- Large number in `#EF4E4B` (red) — count-up animation on viewport entry
- Small source text below in `rgba(255,255,255,0.4)`

### Animations
- Hero: SOS logomark pulses/glows (radial gradient, breathing CSS keyframe with `box-shadow`)
- Sections: fade + slide up on scroll via IntersectionObserver
- Stats: count up when entering viewport
- SIGNAL flow: each step lights a new node on the grid path
- Agent CTA: typing animation on submit, message bubbles slide in

---

## Sections (9 total)

### SECTION 1 — Hero (full viewport)

Glowing, pulsing SOS logomark centered.

**Headline:**
> Coordination infrastructure for communities in crisis.

**Subcopy:**
> SOS connects people who need help with people who can provide it — through AI-powered matching, real-time coordination, and community intelligence.

Scroll indicator (the node starts here and begins traveling down).

### SECTION 2 — "Three things converged."

Three floating glass cards with sourced stats:

| Stat | Source |
|---|---|
| **305M** people needed humanitarian help in 2025 | OCHA Global Humanitarian Overview 2026 |
| **68%** didn't receive it | OCHA GHO 2026 |
| **$24.4B** funding shortfall | Carnegie Endowment 2025 |

Three trend callout blocks (left accent bar):

1. **Federal capacity is declining** — 79% of state agencies want AI coordination. 0% have it. $600M in grants clawed back. 12 senior FEMA leaders departed.
   *Source: Deloitte-NEMA 2025, GAO High-Risk List*

2. **AI can now do what forms couldn't** — Conversational intake, real-time matching, image analysis. Feasible now, not two years ago.
   *Source: our own build — 15 AI tools, 19 edge functions, live platform*

3. **Communities are already leading** — 85% of survivors get help from neighbors first. The public is the largest untapped coordination network on earth.
   *Source: Deloitte-NEMA 2025 (42 state agencies surveyed)*

### SECTION 3 — "More people are at risk than ever."

Animated count-up stat blocks floating on grid:

```
57M → 132M → 363M → 305M
People in need over one decade. 430% increase.
```

> People reached is declining: 128M → 116M → 98M.
> The Council on Foreign Relations calls it "The Great Aid Recession."

Sources linked as subtle text: OCHA, CFR, Carnegie, UNRIC

### SECTION 4 — 18 months of research

Glass callout block. General tone — no specific numbers of failures or disasters:

> We've spent 18 months studying how coordination breaks down — from modern history's largest disasters to the mutual aid networks that formed in their wake. We analyzed government after-action reports, interviewed partners on the ground, and built alongside the organizations doing the work.
>
> What we found: it's not a resource problem. Resources exist. Volunteers show up. Agencies have budgets.
>
> What's missing is the connective tissue between all of it.

### SECTION 5 — People are the missing piece

Big type, centered, floating over the grid. This is the thesis turn.

> A displaced family with a truck clears roads.
> A retired nurse in a flood zone triages injuries.
> A teenager who speaks three languages runs comms.
>
> **Everyone is a helper.**

The node on the grid pauses here, then splits into multiple branching paths.

### SECTION 6 — Disconnected pieces (persona-based gap)

Glass cards for each persona showing current tools and the problem:

| Persona | Current Tools | The Problem |
|---|---|---|
| **Citizens** | Facebook, phone trees, 211 | No intake, no tracking, no match |
| **NGOs / Nonprofits** | Spreadsheets, email, Slack | Can't see other orgs' capacity |
| **Government / EMS** | WebEOC, ArcGIS, radio | Systems crash under load, no citizen data |
| **Vendors** | Manual bidding, phone calls | No visibility into needs |

> SOS puts a coordination layer underneath all of them — connecting disconnected pieces into one living network.

Visual: persona cards are separate → on scroll, grid lines connect them through a central SOS node.

### SECTION 7 — SIGNAL Flow

Maria's story through the 6 SIGNAL layers. Each step = a glass card with the grid line connecting them. As you scroll, each step lights up a new segment of the grid path.

| Step | Headline | Description |
|---|---|---|
| **Signal** | Maria texts: "My house flooded. I have two kids. We need shelter and food." | Any channel. No forms. SOS extracts what's needed from a conversation. |
| **Intelligence** | Partners scored instantly. Red Cross shelter matched. Free Hot Meals notified. | Two needs, two partners, one coordinated response. Every decision traced. |
| **Graph** | At the shelter, Maria sees: "Translation services needed nearby." She speaks three languages. | The system sees what people can offer — not just what they need. |
| **Network** | Maria helps three ERV families who only speak Creole. A survivor became a helper. | Trust earned through outcomes. Her score rises with every family she helps. |
| **Adaptive** | Shelter: 47/200 beds. Free Hot Meals: 83 dinners served. Translation queue: clear. | The whole network updates in real-time. |
| **Learning** | "Bilingual citizens matched as translators resolve intakes 40% faster." | Every disaster makes the next one smarter. |

**Finale:** Maria found shelter and food in 45 minutes. Then helped three families. The system learned from all of it.

Full grid path now lit — showing the complete coordination network.

### SECTION 8 — Coordinated communities (principles)

Four glass cards:

- 🔒 **Privacy by design** — PII masked until consent. 3-layer protection.
- 🔍 **Accountability** — Every AI decision traced and auditable.
- 🌐 **Open coordination** — Slack, WhatsApp, iMessage, SMS, web. Your workflow, our intelligence.
- 🧠 **Compounding intelligence** — Every outcome trains the next decision.

### SECTION 9 — Agent CTA

Embedded SOS agent chat — not a link, the actual agent. This IS the call to action.

**Agent:** `sos-homepage` (new agent, trained from sos-platform)

**Chips:**
- "Stay Updated" → collects email/name, subscribes to updates
- "I Can Help" → skills intake (what can you offer? location? availability?) → creates partner lead
- "Learn More" → answers questions about SOS from the product bible

Full registration flow available if they go deeper. The agent can do everything — register partners, answer questions, collect leads.

Typing animation on submit. Message bubbles slide in.

**Footer:** Everyone is a helper. We help the helpers.

---

## Reference Files

Read these before building:

| File | What | Where |
|---|---|---|
| WHY_SOS_EXISTS.md | All stats, sources, 16 problems, 5 audiences | `product-bible/vision/WHY_SOS_EXISTS.md` |
| COPY.md (archived) | Approved headline flow (Option G), burned framings | `product-bible/_archive/pre-restructure/design/website/COPY.md` |
| index-v2.html | Prior version with SIGNAL flow + snap-scroll | `public/index-v2.html` in sos-frontend repo |
| index-draft.html | Earlier draft | `public/index-draft.html` |
| Coordination loop | INTAKE → MATCHING → LOGISTICS → FULFILLMENT → LEARNING | `product-bible/coordination/` |
| SIGNAL framework | 6-layer intelligence model | `product-bible/data/SIGNAL.md` or `shen/SIGNAL.md` |

## Key Rules

1. **Brand colors only.** No grays, no greens, no purples. Navy, Dark Navy, Red, Blue, Cream, White.
2. **Every stat must have a source.** Show sources as small linked text — demonstrates research rigor.
3. **Don't publish without Jonathan's approval.** Build at `public/home.html` first. Only move to `app/page.tsx` after sign-off.
4. **Don't use burned framings** from COPY.md (listed there). No "help shows up but coordination doesn't," no "infrastructure doesn't exist," no hard declarative openings.
5. **Mobile-first.** Single column, same visual language. Glass cards stack vertically.
6. **The agent CTA is the product.** Not a form. Not a mailto. The agent.

---

## Task Checklist

### Phase 1 — Static HTML
- [ ] Create `public/home.html` with all 9 sections
- [ ] Grid background (CSS, 3% opacity)
- [ ] Logomark pulse animation (CSS keyframes)
- [ ] Glass card components
- [ ] Callout blocks with accent bars
- [ ] All copy from sections above
- [ ] Stat count-up animation (JS, IntersectionObserver)
- [ ] Section fade-in on scroll
- [ ] Mobile responsive
- [ ] Commit + push (do NOT change app/page.tsx)
- [ ] Notify Jonathan to review at sosconnect.org/home.html

### Phase 2 — Canvas Animation
- [ ] Canvas layer behind content
- [ ] Grid drawn on canvas
- [ ] Node (white circle with glow) travels grid on scroll
- [ ] Lines light up behind node in `#89CFF0`
- [ ] Node splits at "Everyone is a helper" section
- [ ] Persona cards connect via grid lines on scroll
- [ ] SIGNAL steps light up sequentially
- [ ] Performance: 60fps on mobile
- [ ] Notify Jonathan to review animation

### Phase 3 — Next.js Port + Agent
- [ ] Port HTML to `app/page.tsx` (React components)
- [ ] Create `sos-homepage` agent (workspace, SOUL.md)
- [ ] Wire agent CTA with useChat + AI SDK
- [ ] Chips: Stay Updated, I Can Help, Learn More
- [ ] Agent system prompt trained on product bible
- [ ] Registration flow through agent
- [ ] Deploy to sosconnect.org
- [ ] Final Jonathan review
