```md
# Frontend Rules — SIRUJUK Anti Fraud System

## 1. Purpose

Frontend SIRUJUK is a **decision visualization layer**, not a marketing UI or consumer product.

Its only purpose:

- Display referral risk score
- Explain fraud/risk reasoning clearly
- Support audit workflow (review, approve, reject)
- Provide fast, readable decision insights for verifiers

If a UI element does not support decision-making or audit traceability, it is invalid.

---

## 2. Tech Stack

- Next.js (App Router)
- TypeScript (mandatory)
- Tailwind CSS (primary styling)
- Shadcn UI
- React Query (server state)
- Zustand (minimal client state only if needed)
- Jest + React Testing Library (unit testing)
- MSW (API mocking for tests)

---

## 3. Architecture Rules (STRICT)

### 3.1 Separation of Concerns

- UI = display only
- Hooks = UI state logic
- Lib = business formatting helpers (NOT decision logic)
- Backend (Go) = all business logic
- ML (FastAPI) = inference only

❌ Frontend must NOT:

- calculate fraud score
- decide risk category
- implement business rules

---

## 4. Design System (MINIMAL + STRICT)

### 4.1 Visual Style

- clean
- neutral
- structured
- readable in < 3 seconds

❌ FORBIDDEN:

- gradients
- colorful backgrounds
- decorative illustrations
- animated icons for decoration
- neon colors
- multiple accent color themes
- “startup landing page style UI”

---

### 4.2 Color System (STRICT)

Allowed only:

- Gray scale (UI base)
- Blue (primary action)
- Green (safe)
- Yellow (warning)
- Red (high risk)

No additional colors allowed.

---

### 4.3 Typography

- Jakarta-Sans only
- clear hierarchy (H1, H2, body, caption)
- no decorative fonts
- readability first

---

### 4.4 Layout System

- grid-based layout
- consistent spacing scale (4, 8, 12, 16, 24, 32)
- predictable structure across pages
- no arbitrary spacing values

---

### 4.5 Border Rules

- border-radius MUST be `4xl` globally
- no exceptions

---

## 5. Atomic Design Structure

### Atoms

- Button
- Input
- Text
- Badge (risk only)
- Card

### Molecules

- SearchBar
- FilterRow
- StatusChipGroup
- RiskBadgeGroup

### Organisms

- ReferralTable
- RiskScorePanel
- AuditQueueList
- ReferralDetailPanel

### Templates

- DashboardLayout
- AuditLayout
- DetailLayout

---

## 6. File Structure Rules (MANDATORY)

### Components
```

components/
├── atoms/
├── molecules/
├── organisms/
├── templates/

```

### Hooks (ALL logic here, not in UI)
```

hooks/
├── useReferral.ts
├── useAuditQueue.ts
├── useRiskScore.ts

```

### Business helpers (NO decision logic)
```

lib/
├── formatters.ts
├── constants.ts

```

### Assets (STRICT SEPARATION)
```

assets/
├── icons/
│ ├── risk-high.svg
│ ├── risk-medium.svg
│ ├── risk-low.svg

```

❌ SVG INLINE IN COMPONENTS IS FORBIDDEN

---

## 7. Risk Display Rules (CRITICAL)

Risk must NEVER be shown as number only.

Always include:
- label
- color indicator
- explanation text

### Mapping:
- GREEN → Safe Referral
- YELLOW → Needs Review
- RED → High Risk - Audit Required

---

## 8. Core Pages

### Dashboard
- total referrals
- risk distribution
- system health overview

### Audit Queue
- flagged referrals list
- sortable by risk score
- priority queue for TKMKB

### Referral Detail
- patient & doctor info
- diagnosis
- ML + rule-based explanation
- risk breakdown
- audit decision actions

---

## 9. Performance Rules

- prioritize Core Web Vitals
- route-based code splitting
- lazy load heavy tables
- avoid unnecessary re-renders
- keep bundle size minimal

Targets:
- LCP < 2.5s
- CLS < 0.1

---

## 10. Accessibility (MANDATORY)

- WCAG 2.1 AA compliance
- full keyboard navigation
- semantic HTML required
- ARIA labels for interactive components
- no reliance on color alone

---

## 11. Testing Rules

Mandatory:
- unit tests for components
- integration tests for audit flow
- mock API via MSW

Minimum:
- all audit-critical flows must be tested

---

## 12. Error Handling

- no raw system errors in UI
- always show user-friendly message
- fallback UI required for:
  - API failure
  - empty state
  - timeout state

---

## 13. Data Privacy Rules

- no sensitive patient data logging
- no console logging of medical data
- mask identifiers where needed
- frontend must never persist sensitive data

---

## 14. UX Principles (STRICT)

- clarity over aesthetics
- structure over decoration
- speed over animation
- explanation over assumption

If user cannot understand risk in 3 seconds → UI is considered failed.

---

## 15. Success Criteria

Frontend is successful if:

- auditor understands risk instantly
- doctor understands rejection reason clearly
- UI is consistent and predictable
- no ambiguity in decisions
- works on low-end devices

---

## 16. Non-Negotiable Rule

This frontend is NOT:
- marketing website
- fintech UI product
- startup landing page

This frontend IS:
> a decision transparency system for healthcare fraud detection

All UI decisions must align with this purpose.
```
