# DSA Club — Dashboard UI/UX Architecture & Product Specification

> **Document Version:** 2.0.0 (Prompt 5 Release)  
> **Target Audience:** Frontend Engineers, UI/UX Designers, Product Architects  
> **Scope:** Definitive UX hierarchy, accessibility, design tokens, motion engineering, and data-to-component contract for the DSA Club Student Dashboard.

---

## 1. Executive Summary & Design Philosophy

The **DSA Club Dashboard** serves as the primary command center for software engineers mastering Data Structures & Algorithms. It adheres to an authentic **"Next Clear Action"** cognitive model designed around focus, truthfulness, and calm interaction:

1. **One Authoritative Primary Action:** At any moment, exactly one dominant action is surfaced in the hero cockpit. The learner is never confronted with competing primary CTAs (e.g. parallel "Resume" and "Start" buttons).
2. **Truthful & Explainable Evidence:** Recommendations and progress indicators reflect real, verifiable evidence from immutable learning events. If no evidence or active plan exists, the system honestly presents a setup or choose-a-path state rather than fabricating progress.
3. **Strict Mastery Semantics:**
   - Counting an independent solve requires zero hints (`hintsUsed === 0`) and an independent attempt.
   - Any hint usage (`hintsUsed >= 1`) automatically classifies the attempt as hint-assisted.
   - Generic mission completions, plan milestones, or spaced review flushes do not inflate independent problem solve counts.
4. **Calm, High-Contrast Aesthetics:** Preserves DSA Club’s dark slate and lime (`--accent-lime`) visual identity. Avoids gratuitous gradients, pulsing glows, distracting continuous animations, and synthetic audio effects.
5. **Full Reduced-Motion Support:** Respects system and user `prefers-reduced-motion` settings across every layout transition and micro-interaction.

---

## 2. Two-Level Information Hierarchy

The dashboard body is structured into two clean visual tiers to eliminate card clutter and cognitive overload:

```
┌────────────────────────────────────────────────────────────────────────┐
│ LEVEL 1: FIRST SCAN (Primary Cockpit)                                   │
│  - Learner Greeting & Real-time Context Status                         │
│  - Imminent Interview Notice & Starter Path Alerts (Conditional)       │
│  - NextSessionHero: One Dominant Action + "Why this is next" Disclosure │
│  - ResumeContextBanner: In-flight Draft / Session (Secondary Only)     │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ LEVEL 2: SUPPORTING DETAIL & CONTINUITY (Responsive Two-Column Rail)   │
│  ┌─────────────────────────────────┐ ┌───────────────────────────────┐ │
│  │ Left Column (lg:col-span-7)     │ │ Right Column (lg:col-span-5)  │ │
│  │  - GoalCheckpointProof          │ │  - ReviewQueuePreview         │ │
│  │    (Topic Evidence & Proof)     │ │    (Spaced Retrieval Status)  │ │
│  │  - AlternativeRoutesBar         │ │  - ActivityRibbon             │ │
│  │    (Topic Practice & Roadmaps)  │ │    (Stopwatch Minutes Heatmap)│ │
│  └─────────────────────────────────┘ └───────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### Level 1 — First Scan (Primary Cockpit)
- **Greeting & Context Status:** Personalized greeting and dynamic day/cycle context indicator (e.g., `Day 4 of 14 · Binary Search`).
- **NextSessionHero:** Visually dominant hero cockpit featuring:
  - Dominant primary CTA with authoritative destination URL, estimated duration, and topic name.
  - Compact **"Why this is next"** disclosure detailing:
    1. Signal used (e.g. required curriculum checkpoint, overdue spaced review, in-progress problem).
    2. Selection rule provenance (e.g. `in_progress_task`, `required_plan_task`, `due_review`).
    3. What completion unlocks (e.g. advances milestone, clears retention queue).
- **Secondary Action Banner (`ResumeContextBanner`):** Placed strictly below the hero when an in-flight problem draft or active study session exists, preventing CTA competition with the primary curriculum action.

### Level 2 — Supporting Detail (Responsive Two-Column Layout)
- **Left Column (`lg:col-span-7`):**
  - `GoalCheckpointProof`: Real topic-scoped solve counts and verified mastery proof. Renders clean empty states if no topic solves exist yet.
  - `AlternativeRoutesBar`: Discloses secondary exploration paths (practice questions, patterns, roadmap milestones) without cluttering the primary view.
- **Right Column (`lg:col-span-5`):**
  - `ReviewQueuePreview`: Displays overdue and scheduled spaced repetition items. Renders a compact, calm celebration state when the queue is clear (*"Queue is clear. No retention items due today."*).
  - `ActivityRibbon`: Single-measure activity heatmap tracking actual focused minutes (`actualMinutes`) spent in focused stopwatch sessions and verified attempts.

---

## 3. Technology Stack & Design Tokens

### 3.1 Technology Stack
- **Framework:** Next.js 15 (App Router, Server Actions, TypeScript).
- **Styling:** Vanilla CSS Custom Properties & Tailwind CSS v4 tokens.
- **Animation:** `framer-motion` (GPU-accelerated transforms and opacities; strictly disabled when `prefers-reduced-motion: reduce`).
- **Icons:** `lucide-react` (Accessible, stroke-width 1.75).
- **State & Data Contract:** Typed `DashboardDTO` version 2.

### 3.2 Design Tokens
The dashboard strictly utilizes DSA Club brand tokens defined in `src/styles/tokens.css` and `src/app/globals.css`:

```css
/* Background & Surfaces */
--bg-surface: #121316;              /* Main surface card background */
--bg-surface-raised: #1A1C20;       /* Secondary raised elements, kbd keys */
--bg-surface-elevated: #24272D;     /* Hover & popover background */
--border-subtle: #272B33;          /* 1px structural borders */

/* Brand & Functional Accents */
--accent-lime: #A3E635;             /* Primary brand accent & positive CTA */
--accent-lime-hover: #84CC16;       /* Focused / hovered lime button */
--accent-amber: #F59E0B;            /* Imminent interview & critical review alert */
--accent-red: #EF4444;              /* Error & high difficulty */
--accent-cyan: #06B6D4;             /* Informational badges */

/* Typography Colors */
--text-primary: #F9FAFB;            /* High-contrast headings and labels */
--text-secondary: #9CA3AF;          /* Descriptive copy and subtitles */
--text-muted: #6B7280;              /* Micro-labels, metadata, timestamps */
```

---

## 4. Authoritative Recommendation & Data Loop

The dashboard is driven by a single traceable pipeline:

$$\text{Learner Action} \longrightarrow \text{Idempotent LearningEvent} \longrightarrow \text{Rebuildable Projection} \longrightarrow \text{Authoritative Decision} \longrightarrow \text{DashboardDTO} \longrightarrow \text{Rendered UI}$$

### 4.1 9-Tier Deterministic Precedence
The authoritative learning action is resolved by `resolveAuthoritativeLearningAction`:

1. **Tier 1:** In-progress task of today's plan day (`in_progress_task`).
2. **Tier 2:** In-flight problem draft or active focus session (`in_flight_draft` / `active_session`).
3. **Tier 3:** Paused plan state (`plan_paused`).
4. **Tier 4:** Next required task of today's plan day (`required_plan_task`).
5. **Tier 5:** High-priority due retention review (`due_review`).
6. **Tier 6:** Optional practice task of today's plan day (`optional_plan_task`).
7. **Tier 7:** Self-paced / Roadmap mission continuity (`roadmap_continuity`).
8. **Tier 8:** Self-paced practice recommendation (`self_paced_recommendation`).
9. **Tier 9:** Setup / choose-a-path state (`setup`).

### 4.2 Strict Mastery Semantics
- Zero hints required for independent solve:
  $$\text{independentSolve} = \text{true} \iff (\text{isProblemSolve} \land \text{hintsUsed} = 0 \land \text{explicitStrategy} = \text{"independent"})$$
- When `hintsUsed >= 1`, strategy is locked to `"hint_assisted"`.
- Missing or undefined `independentSolve` never defaults to `true`.
- Missions, review flushes, and generic tasks do not increment `independentSolveCount`.

### 4.3 Pedagogical Ordering
- Missions and curriculum topics are sorted by `{ order: 1, createdAt: 1 }` plus prerequisite rules.
- Studio mission editor enforces and persists explicit numeric `order`.
- Fallbacks never hardcode "Sliding Window" or "Arrays" as universal defaults.

---

## 5. Keyboard Navigation & Accessibility (WCAG 2.2 AA)

### 5.1 Keyboard Shortcuts
- <kbd>Space</kbd> or <kbd>Enter</kbd>: Triggers the hero's authoritative primary action.
- <kbd>R</kbd>: Jumps directly to the Spaced Repetition queue `/review`.
- <kbd>P</kbd>: Jumps directly to Practice problems `/practice`.
- <kbd>?</kbd>: Opens the Keyboard Shortcuts Guide dialog.
- <kbd>Escape</kbd>: Closes the Shortcuts Guide and returns focus to the opener button.

### 5.2 Single-Key Shortcut Protection
Single-character shortcuts (<kbd>R</kbd>, <kbd>P</kbd>) can be toggled on/off in the Keyboard Shortcuts modal:
- Setting is persisted in `localStorage` under `dsa-club:single-key-shortcuts`.
- Prevents accidental navigation for learners utilizing screen readers, voice dictation, or assistive key remappers.
- All shortcuts are automatically suppressed when typing inside an `<input>`, `<textarea>`, or content-editable element.

### 5.3 Focus Management & Dialog Accessibility
- Modal dialog uses `role="dialog"`, `aria-modal="true"`, and `aria-labelledby="shortcuts-modal-title"`.
- Focus is automatically trapped inside the modal container when open.
- Tabbing cycles forward from the close button through the toggle switch; Shift+Tab cycles backward.
- Closing via <kbd>Escape</kbd> or the close button immediately restores keyboard focus to the opening `<button>`.

---

## 6. Motion & Calmness Standards

1. **No Gratuitous Animation:** The dashboard does not render looping glowing perimeters, pulsating buttons, or particle effects.
2. **Purposeful Micro-Motion:**
   - Entry stagger: 160ms with cubic easing `[0.16, 1, 0.3, 1]`.
   - Hover elevations: Subtle 1px translation with border-color transition.
3. **Reduced Motion Mode:**
   - When `prefers-reduced-motion: reduce` is enabled, all motion transitions set duration to `0s` and scale to `1`.
   - Layout transitions render instantaneously without displacement.

---

## 7. Component Map

| Component | Path | Responsibility |
| :--- | :--- | :--- |
| `DashboardView` | `src/components/product/dashboard/DashboardView.tsx` | Root 2-level responsive layout, keyboard shortcut listener, accessible modal. |
| `NextSessionHero` | `src/components/product/dashboard/NextSessionHero.tsx` | Dominant hero cockpit, "Why this is next" disclosure, primary CTA. |
| `ResumeContextBanner` | `src/components/product/dashboard/ResumeContextBanner.tsx` | In-flight problem draft banner (secondary action). |
| `GoalCheckpointProof` | `src/components/product/dashboard/GoalCheckpointProof.tsx` | Topic mastery proof, verified solves, and honest empty states. |
| `AlternativeRoutesBar` | `src/components/product/dashboard/AlternativeRoutesBar.tsx` | Topic practice links and roadmap continuity triggers. |
| `ReviewQueuePreview` | `src/components/product/dashboard/ReviewQueuePreview.tsx` | Spaced retrieval queue with calm clear queue state. |
| `ActivityRibbon` | `src/components/product/dashboard/ActivityRibbon.tsx` | Calendar-aligned 28-day focused minutes heatmap. |
