# Architecture Compatibility Report & Contract Audit
**Feature**: DSA Club Intelligence  
**Phase**: Phase 0 Audit & Contract Definition  
**Date**: September 2026  
**Status**: Completed & Approved for Implementation  

---

## 1. Audit Scope & Executive Summary

Before introducing the new domain models and the `/intelligence` surface, this audit establishes a concrete transition bridge between the legacy roadmap system and the new **DSA Club Intelligence** execution contract.

Key findings:
1. **Two duplicate roadmap paths exist**:
   - `src/features/roadmaps/services/roadmap.service.ts` (`generateRoadmap` from `RoadmapTemplateModel`)
   - `src/features/onboarding/services/roadmap-generator.service.ts` (`generatePersonalizedRoadmap` from `curriculum-rules.ts` + `planRoadmapStages`)
2. **Roadmap vs. Plan separation**:
   - `RoadmapModel` stores the curriculum graph (`stages`, `topicIds`, `missionIds`). It is preserved as curriculum structure.
   - `PlanModel`, `PlanDayModel`, and `PlanTaskModel` represent the learner's committed execution contract.
3. **No destructive mutations for existing users**:
   - Existing user progress in `MissionProgressModel`, `ProblemAttemptModel`, and `RevisionHistoryModel` remains 100% intact.
   - A lazy migration resolver (`resolveUserActivePlan`) initializes a baseline `Plan` v1 for users who completed onboarding or calibration without forcing re-onboarding.

---

## 2. Legacy Roadmap Services & Deprecation Plan

### Current State
| Service / File | Purpose | Consumers | Status |
| :--- | :--- | :--- | :--- |
| `src/features/onboarding/services/roadmap-generator.service.ts` | Generates stages dynamically based on 14-topic curriculum rules and boosts. | `completeOnboarding` in `onboarding.service.ts`, `customizeDashboardPlanAction` in `dashboard-plan.actions.ts`. | **Consolidate** into canonical planner. |
| `src/features/roadmaps/services/roadmap.service.ts` | Generates stages from published `RoadmapTemplateModel` documents. | Legacy template routing / studio. | **Retain as template viewer**; do not use for personalized active plans. |
| `src/features/onboarding/planning/roadmap-planner.ts` | Pure function returning `PlannedTopicStage[]`. | Preview mapper and generator. | **Promote** to core rule provider in `src/features/intelligence/planning/`. |

### Deprecation & Unification Path
1. `src/features/intelligence/planning/canonical-planner.ts` becomes the **single source of truth** for both onboarding preview and intelligence plan generation.
2. `completeOnboarding` and `customizeDashboardPlanAction` delegate plan creation to `activatePlanAction` (or `activatePlanFromInput`), creating an active `Plan` document.
3. `RoadmapModel` remains in the database as an optional reference (`roadmapId`) for backward-compatibility with older tests, but `PlanModel` is the authoritative contract for the dashboard and recommendations.

---

## 3. Existing User Migration Strategy (Lazy, Non-Destructive)

When an existing user visits `/dashboard` or `/intelligence`:

```
User accesses /dashboard or /intelligence
               │
               ▼
Does an active PlanModel exist for userId?
        ├── YES ──▶ Return active Plan & PlanDay
        └── NO  ──▶ Run `resolveUserActivePlan(userId)`:
                     1. Query `user.profile` and `RoadmapModel.findOne({ userId, status: "active" })`
                     2. If active roadmap exists:
                        - Create Plan v1 (source: "onboarding")
                        - Compute cycle length via `calculateCycleDuration`
                        - Insert PlanDay records for Days 1–7
                        - Materialize Day 1 PlanTasks from first incomplete stage missions
                     3. If no active roadmap exists (e.g. skipped or fresh user):
                        - Create baseline Starter Plan v1 on Arrays / Fundamentals
                     4. Return newly activated Plan without altering historical attempts or streak
```

**Zero Downtime & Zero Regression**:
- Historical `MissionProgressModel` records are never deleted or reset.
- Completed missions and solved problems are matched to plan tasks by `entityId` and automatically marked `status: 'completed'`.

---

## 4. Event Hooks & Evidence Flow

| Learner Action | Existing Event Handler | Intelligence Connection Point |
| :--- | :--- | :--- |
| **Mission Step Completed** | `LearningEngine.completeStage` | Checks task completion in active `PlanDay`; updates `PlanTask.completedAt`. |
| **Mission Finished (100%)** | `ProgressEngine.processMissionCompletion` | Calls `completePlanTaskAction(taskId, { score: 100 })`; evaluates `PlanDay` completion; materializes Day $K+1$. |
| **Problem Attempt Logged** | `logProblemAttemptAction` / `submitProblemAction` | If problem matches active `PlanTask.entityId`, sets task to `in_progress` or `completed` with duration & hint evidence. |
| **Revision Review Submitted**| `submitRevisionReview` in `revision.service.ts` | If revision queue item is in active plan, marks revision task complete and updates retention score. |
| **Daily Reflection Logged** | `createReflectionAction` / `DailyPlanModel` | Marks `taskKey: "daily_reflection"` complete on the current `PlanDay`. |

---

## 5. Cache Tag & Invalidation Registry

All mutations to active plans or tasks invalidate a unified cache registry:

```typescript
export function revalidateIntelligenceCache(userId: string) {
  try {
    if (typeof revalidateTag === "function") {
      revalidateTag(`intelligence-${userId}`);
      revalidateTag(`plan-${userId}`);
      revalidateTag(`dashboard-${userId}`);
      revalidateTag(`snapshot-${userId}`);
    }
  } catch {}
  try {
    revalidatePath("/dashboard");
    revalidatePath("/intelligence");
  } catch {}
}
```

---

## 6. Timezone & Day Boundary Policy

1. **User Timezone Resolution**:
   - Primary: `user.profile.timezone` (default: `"Asia/Kolkata"`).
   - Fallback: `"UTC"`.
2. **Date Key Definition**:
   - `dateKey` is always formatted in learner timezone as `YYYY-MM-DD` (e.g. `2026-09-24`).
3. **Plan Position Arithmetic**:
   - Effective plan day is calculated using calendar day difference minus aggregate paused days:
     $$\text{Day Index} = \min\Big(\text{totalDays}, \max\big(1, (\text{Date}_{\text{learner}} - \text{Date}_{\text{start}}) + 1 - \text{pausedDaysCount}\big)\Big)$$
4. **No GET Mutation Rule**:
   - A `GET` request on `/dashboard` or `/intelligence` calculates whether the learner is behind or needs recovery.
   - It outputs `recoveryPromptAvailable: true`, but **never** writes to the database during read operations.
   - Mutations occur only when the learner explicitly invokes `prepareRecoveryAction` or completes a task.

---

## 7. Exit Criteria for Phase 0

- [x] Identified deprecation path for dual roadmap generators.
- [x] Established lazy migration strategy for existing users.
- [x] Defined hook points for Mission, Problem, Revision, and Reflection events.
- [x] Verified cache invalidation tags across dashboard and intelligence.
- [x] Enforced strict dateKey and timezone calculation rules.
- [x] **Sign-off**: Approved to proceed to **Phase 1: Canonical Planner & Availability Validator**.
