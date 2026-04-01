# Use Cases

## What's in this section

Cross-cutting scenarios showing how the SOS coordination loop runs for specific need domains. Each use case documents: the real-world scenario, which personas are involved, how the 5-step loop (Intake → Matching → Logistics → Fulfillment → Learning) plays out, field constraints, and real evidence from disaster response.

Use cases are NOT features (what the product does) or JTBDs (why someone hires the product — those live in `personas/`). Use cases are **how the system coordinates real people and resources for a specific domain**, grounded in field data.

## Files

| File | Domain | Primary Sources |
|---|---|---|
| FOOD_DISTRIBUTION.md | Food inventory, appointment slots, bulk pickup | Victoria — Bald Creek Relief, America Cares, FHM |
| TRANSPORT_LOGISTICS.md | Pallet relay, driver matching, dispatch | Victoria — America Cares, ERV |
| WELFARE_CHECKS.md | Address-based checks, SAR, status tracking | Luke (ARCC), Victoria field reports |
| DISASTER_HOUSING.md | Temporary shelter → transitional → permanent | Helene case study, ERV |

## Update rules

- New use case = new file. One domain per file.
- Every use case MUST reference real field data (screenshots, intel, interviews). No theoretical scenarios.
- Link to relevant personas, features, and coordination docs — don't duplicate their content.
- When a use case drives a new feature: update `features/` AND `roadmap/TASK_BOARD.md`.
- Review cadence: after every Victoria intel drop or partner interview.

## Template

```markdown
# [Domain] Use Case

## The Problem (field evidence)
What actually happens today — with quotes, screenshots, real examples.

## Personas Involved
Which personas participate and their roles in this scenario.

## The Coordination Loop
How INTAKE → MATCHING → LOGISTICS → FULFILLMENT → LEARNING runs for this domain.

## Constraints
Real-world constraints discovered from field data (e.g., pallets need forklifts).

## What We Build
Which features address this use case, current status, gaps.

## Evidence
Links to intel channel posts, screenshots, interviews, field reports.
```
