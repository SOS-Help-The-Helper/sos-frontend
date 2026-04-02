# Map Intelligence

> Last updated: 2026-04-02
> Owner: Henry-Prime
> Status: Shipped (26 tools total — 16 original + 10 map intelligence)

## Overview

The SOS map isn't a static display — it's an intelligent surface that the agent controls. Every tool the agent calls can update the map: adding pins, drawing routes, highlighting gaps, overlaying risk zones. The user sees the map change in real time as the conversation progresses.

## Architecture

```
User message → /api/chat → AI SDK + Sonnet → tool call
  → tool returns JSON with __tool (for UI) + __mapCommand (for map)
  → AIToolRenderer renders the card AND emits MapCommand
  → Map page subscribes to MapCommand → updates layers/sources/bounds
```

The `__mapCommand` pattern is generic — any tool can include a map command. The map handler switches on `cmd.type` and renders the appropriate visualization.

## Map Command Types

| Type | Trigger | What It Does |
|---|---|---|
| `show_results` | search_resources | Pins search results, hides permanent layers, fits bounds |
| `clear` | agent clears | Restores all permanent layers, clears overlays |
| `focus` | agent navigates | Fly to a point at specified zoom |
| `filter` | agent filters | Filter permanent layers by category |
| `show_nearby` | show_nearby tool | Summarize + pin everything within radius |
| `show_route` | show_route tool | Draw route line + destination marker, fit to route bounds |
| `show_disaster` | show_disaster_zone tool | Fly to disaster center, show boundary (when data available) |
| `compare` | compare_resources tool | Highlight + rank multiple resources with numbered pins |
| `show_gaps` | show_coverage_gaps tool | Red translucent circles where requests have no nearby resources |
| `show_activity` | show_activity tool | Green dots for recent matches, reports, offers |
| `show_risk` | show_risk tool | Amber/red circles for weather alerts, floods, outages |
| `track_sos` | track_my_sos tool | Your request pin + matched resource pin + dashed connecting line |
| `bookmark` | bookmark_resource tool | Star marker on saved resource |
| `share_location` | share_location tool | Creates temporary share URL |

## Tools (10 Map Intelligence)

### 1. show_nearby
**Triggers:** "What's around me?", "What's nearby?", "Show me what's close"
**Returns:** Count by category, closest resource name + distance, all pins within radius
**Map:** Pins all nearby results, flies to user location

### 2. show_route
**Triggers:** "How do I get to [place]?", "Directions to the shelter"
**Returns:** Distance (km), duration (min), travel mode
**Map:** Draws blue route line via Mapbox Directions API, adds destination marker, fits bounds to route
**Modes:** driving, walking, cycling

### 3. show_disaster_zone
**Triggers:** "Show the flood area", "Where is Helene impacting?"
**Returns:** Disaster name, status
**Map:** Flies to disaster center, will render polygon when boundary data available

### 4. compare_resources
**Triggers:** "Which shelter is closest?", "Compare food options", "Best one?"
**Returns:** Ranked list (distance + capacity), recommendation
**Map:** Numbered pins for top 5, highlighted in order

### 5. show_coverage_gaps
**Triggers:** "Where is help not reaching?", "Coverage gaps", "Underserved areas"
**Returns:** Gap count, total requests vs resources, message
**Map:** Red translucent circles over areas with requests but no resources within 5km
**Demo value:** This is the coordination gap VISUALIZED — Google.org gold

### 6. show_activity
**Triggers:** "What's happening right now?", "Recent activity", "Show me what's going on"
**Returns:** Match count, report count, time window
**Map:** Green dots for recent community activity (matches, reports, offers)

### 7. show_risk
**Triggers:** "Am I in danger?", "Is it safe here?", "Show alerts"
**Returns:** Alert count, severity levels, safe/not safe assessment
**Map:** Amber/red circles sized by severity, sourced from NWS via alerts-feed EF

### 8. track_my_sos
**Triggers:** "Where's my help?", "Track my request", "Show my SOS status"
**Returns:** Active SOS status, match status, match score
**Map:** Red pin (your request) + blue pin (matched resource) + dashed connecting line

### 9. bookmark_resource
**Triggers:** "Save this for later", "Bookmark this"
**Returns:** Confirmation
**Map:** Star marker on the resource (planned)

### 10. share_location
**Triggers:** "Share my location with the volunteer"
**Returns:** Share URL, confirmation
**Map:** Creates temporary live-share link (token-based, planned)

## Visual Language

| Layer | Color | Shape |
|---|---|---|
| Requests | `#EF4E4B` (red) | Circle, 8px |
| Resources | `#89CFF0` (blue) | Circle, 8px |
| Reports | `#FFFFFF` (white) | Circle, 6px |
| Route line | `#89CFF0` (blue) | Line, 4px wide |
| Coverage gaps | `rgba(239,78,75,0.15)` | Circle, 30px, red stroke |
| Activity | `#34d399` (green) | Circle, 8px |
| Risk zones | Amber/red by severity | Circle, 40px |
| SOS tracking | Red + blue pins | Circle, 12px, white stroke |
| Connection line | `#89CFF0` dashed | Line, 2px, dash [4,4] |

## Data Sources

| Tool | Data Source |
|---|---|
| show_nearby | resource-search EF |
| show_route | Mapbox Directions API |
| show_disaster_zone | disasters table |
| compare_resources | resource-search EF |
| show_coverage_gaps | requests + resources tables (direct read) |
| show_activity | matches + community_messages tables |
| show_risk | alerts-feed EF (NWS) |
| track_my_sos | soses + requests + matches tables |
| bookmark_resource | Client-side (planned: person metadata) |
| share_location | Generated token (planned: share_tokens table) |
