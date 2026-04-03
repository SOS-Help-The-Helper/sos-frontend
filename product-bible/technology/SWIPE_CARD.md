# SwipeCard — Shared Touch Interaction Component

> **Rule: Every swipeable surface in the app MUST use `components/swipe-card.tsx`. Never hand-roll drag/swipe logic.**

## Location
`components/swipe-card.tsx`

## Used By
| Page | Route | Context |
|------|-------|---------|
| Citizen Match | `/c/match` | Swipe requests/resources to accept help or skip |
| Partner Matching | `/matching` | Swipe proposed matches to accept/decline |
| Partner Matching (Vendor) | `/matching` (vendor view) | Swipe available jobs to bid or pass |

## Why This Component Exists

Mobile touch swiping is deceptively hard. We learned this the hard way through **4 bug-fix iterations** (commits `c28f1d4` → `a0b264d` → `472fc33` → `ac30bda`) on the partner matching page.

### The Problems With Naive Implementations

1. **React synthetic touch events are passive by default.** `onTouchMove` cannot call `preventDefault()`, so the browser scrolls the page instead of swiping the card. This is the #1 reason swipe breaks on mobile.

2. **No direction locking.** Without detecting whether the user is swiping horizontally or scrolling vertically (first ~8px of movement), every touch gesture fights the browser's scroll behavior.

3. **No `touch-action` CSS.** The browser needs `touch-action: pan-y` on the card element to know horizontal gestures are owned by JavaScript.

4. **Using `useState` during drag.** React state updates are too slow for 60fps touch tracking. Causes visible jank. Must use `useRef` for position tracking during the gesture.

### The Solution (What SwipeCard Does)

- **Native touch listeners** attached via `useEffect` with `{ passive: false }` on `touchmove` — allows `preventDefault()`
- **Direction locking** — first 8px of movement determines horizontal vs vertical; vertical = let browser scroll
- **Ref-based tracking** — `offsetRef`, `startXRef`, `swipingRef` updated synchronously; `setState` only for render
- **`touch-action: pan-y`** on the card element
- **Mouse drag support** for desktop testing
- **Keyboard support** — arrow keys for accessibility
- **Threshold-based decisions** — 80px drag triggers accept/decline; less snaps back

## API

```tsx
<SwipeCard
  key={`unique-per-card-${index}`}  // REQUIRED: forces remount on advance
  onAccept={() => { /* right swipe */ }}
  onDecline={() => { /* left swipe */ }}
  acceptLabel="Help ✓"    // shown in swipe indicator overlay
  declineLabel="Skip"
>
  {/* Your card content goes here */}
</SwipeCard>
```

## Critical: The `key` Prop

You **must** pass a unique `key` that changes when the card index advances. This forces React to unmount/remount the SwipeCard, resetting all internal refs and state. Without it, the next card inherits the previous card's drag state.

## Incident Log

| Date | Issue | Root Cause | Fix |
|------|-------|-----------|-----|
| 2026-03-26 | Partner swipe not working on mobile | Passive touch events + no direction lock | 4 iterative fixes → `ac30bda` |
| 2026-04-03 | Citizen `/c/match` swipe broken on mobile | Page was built with hand-rolled drag instead of SwipeCard | Replaced inline drag with SwipeCard import → `08d1441` |

## Architecture Rule

**When adding a new swipeable surface anywhere in the app:**
1. Import `SwipeCard` from `@/components/swipe-card`
2. Wrap your card content inside it
3. Pass `key`, `onAccept`, `onDecline`
4. Put your visual content as children
5. Do NOT write custom `onTouchStart`/`onTouchMove`/`onMouseDown` handlers

This rule exists because we've debugged mobile touch swipe twice. There should not be a third time.
