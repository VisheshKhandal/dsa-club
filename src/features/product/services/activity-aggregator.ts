import { subDays } from "date-fns";
import type { DailyActivityPoint, DashboardActivityMetrics } from "../types/dashboard-dto.types";

type AnyDoc = Record<string, any>;

/**
 * Returns a yyyy-MM-dd dateKey in IST (Asia/Kolkata) timezone.
 * This ensures stats are always bucketed by IST day, regardless of server timezone.
 */
const istDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function dateKey(date: Date | string): string {
  try {
    return istDateFormatter.format(new Date(date));
  } catch {
    return new Date(date).toISOString().slice(0, 10);
  }
}

interface ActivityAggregatorInput {
  sessionDocs: AnyDoc[];
  attemptDocs: AnyDoc[];
  planTaskDocs: AnyDoc[];
  eventDocs: AnyDoc[];
  revisionDocs: AnyDoc[];
  currentStreakDays: number;
  bestStreakDays: number;
  targetDailyMinutes: number;
  totalSolvedProblems: number;
}

/**
 * Computes truthful daily activity and metrics for the past 28 days.
 *
 * Guarantees:
 * 1. Truthful focused minutes: uses strictly actual tracked time.
 *    Never treats estimated task duration or default attempt durations as actual study time.
 * 2. Deduplication by underlying activity identity:
 *    If a session, attempt, plan task, and learning event refer to the same activity,
 *    its duration is counted exactly once.
 * 3. Separate, truthful counts for solves, attempts, reviews, and active days.
 */
export function aggregateActivityMetrics(input: ActivityAggregatorInput): DashboardActivityMetrics {
  const {
    sessionDocs,
    attemptDocs,
    planTaskDocs,
    eventDocs,
    revisionDocs,
    currentStreakDays,
    bestStreakDays,
    targetDailyMinutes,
    totalSolvedProblems,
  } = input;


  // 1. Deduplicate tracked activity minutes by underlying entity identity
  // Map: dateKey -> Map<activityIdentity, minutes>
  const minutesByDateAndIdentity = new Map<string, Map<string, number>>();

  function recordActivityMinutes(date: Date | string | undefined, identity: string, minutes: number) {
    if (!date || minutes <= 0) return;
    const dKey = dateKey(date);
    if (!minutesByDateAndIdentity.has(dKey)) {
      minutesByDateAndIdentity.set(dKey, new Map());
    }
    const dayMap = minutesByDateAndIdentity.get(dKey)!;
    // Keep max minutes if identity is seen multiple times
    const existing = dayMap.get(identity) || 0;
    dayMap.set(identity, Math.max(existing, minutes));
  }

  // Pre-build index: attemptId -> problemId for exact problem resolution
  const attemptToProblemMap = new Map<string, string>();
  // Pre-build session -> attempt mapping so sessions, attempts, and plan tasks coalesce
  const sessionToAttemptMap = new Map<string, string>();

  for (const a of attemptDocs) {
    const aid = String(a._id || "");
    const pid = String(a.problemId?._id || a.problemId || "");
    if (aid && pid) {
      attemptToProblemMap.set(aid, pid);
    }
    if (a.sessionId && aid) {
      sessionToAttemptMap.set(String(a.sessionId), aid);
    }
  }

  // A. Learning Sessions (stopwatch / focus timer)
  for (const s of sessionDocs) {
    const focusedSec = Number(s.focusedSeconds || 0);
    if (focusedSec > 0 && s.startedAt) {
      const mins = Math.round(focusedSec / 60);
      const sid = String(s.sessionId || s._id || "");
      const mappedAttemptId = sessionToAttemptMap.get(sid);
      const id = mappedAttemptId ? `attempt:${mappedAttemptId}` : `session:${sid || `session-${s.startedAt}`}`;
      recordActivityMinutes(s.startedAt, id, mins);
    }
  }

  // B. Problem Attempts (actual tracked durationSeconds only; always use attempt identity)
  for (const a of attemptDocs) {
    const durSec = Number(a.durationSeconds || 0);
    // Truthful: only count duration if explicitly tracked > 0. Do NOT invent 15m.
    if (durSec > 0 && a.createdAt) {
      const mins = Math.round(durSec / 60);
      const attemptId = String(a._id || `attempt-${a.createdAt}`);
      recordActivityMinutes(a.createdAt, `attempt:${attemptId}`, mins);
    }
  }

  // C. Plan Tasks (actualMinutes only; deduplicate if linked to problem attempt)
  for (const t of planTaskDocs) {
    const actualMins = Number(t.actualMinutes || 0);
    if (actualMins > 0 && t.completedAt) {
      const linkedAttemptId = t.evidence?.problemAttemptId ? String(t.evidence.problemAttemptId) : null;
      const linkedMissionId = t.entityType === "mission" && t.entityId ? String(t.entityId) : null;
      if (linkedAttemptId) {
        // Linked to problem attempt: register under attempt identity so it deduplicates
        recordActivityMinutes(t.completedAt, `attempt:${linkedAttemptId}`, actualMins);
      } else if (linkedMissionId) {
        // Linked to mission: register under mission identity so it deduplicates
        recordActivityMinutes(t.completedAt, `mission:${linkedMissionId}`, actualMins);
      } else {
        const id = String(t._id || `task-${t.completedAt}`);
        recordActivityMinutes(t.completedAt, `task:${id}`, actualMins);
      }
    }
  }

  // D. Learning Events (payload.minutesSpent only if not linked to attempt/session/task)
  for (const e of eventDocs) {
    const minsSpent = Number(e.payload?.minutesSpent || 0);
    if (minsSpent > 0 && e.occurredAt) {
      const linkedAttemptId = e.payload?.problemAttemptId ? String(e.payload.problemAttemptId) : null;
      const linkedTaskId = e.planTaskId ? String(e.planTaskId) : null;
      const linkedSessionId = e.sessionId ? String(e.sessionId) : null;
      const linkedMissionId = e.missionId ? String(e.missionId) : null;

      if (linkedAttemptId) {
        recordActivityMinutes(e.occurredAt, `attempt:${linkedAttemptId}`, minsSpent);
      } else if (linkedSessionId) {
        const mappedAttemptId = sessionToAttemptMap.get(linkedSessionId);
        recordActivityMinutes(e.occurredAt, mappedAttemptId ? `attempt:${mappedAttemptId}` : `session:${linkedSessionId}`, minsSpent);
      } else if (linkedMissionId) {
        recordActivityMinutes(e.occurredAt, `mission:${linkedMissionId}`, minsSpent);
      } else if (linkedTaskId) {
        recordActivityMinutes(e.occurredAt, `task:${linkedTaskId}`, minsSpent);
      } else {
        recordActivityMinutes(e.occurredAt, `event:${e._id || e.idempotencyKey}`, minsSpent);
      }
    }
  }

  // 2. Build 28-day timeline using IST-aware "today"
  // Compute today's IST dateKey and build backward from it so the last element
  // is always today in IST regardless of server timezone.
  const todayISTKey = dateKey(new Date());
  const todayISTDate = new Date(todayISTKey + "T00:00:00+05:30");
  const activityHistory: DailyActivityPoint[] = Array.from({ length: 28 }, (_, index) => {
    const date = subDays(todayISTDate, 27 - index);
    const key = dateKey(date);

    // Sum deduplicated minutes
    const dayIdentityMap = minutesByDateAndIdentity.get(key);
    let actualMinutes = 0;
    if (dayIdentityMap) {
      for (const mins of dayIdentityMap.values()) {
        actualMinutes += mins;
      }
    }

    // Solved problems today (strictly canonical problem IDs)
    const solvedSet = new Set<string>();
    for (const a of attemptDocs) {
      if (a.createdAt && dateKey(a.createdAt) === key && a.status === "solved") {
        const pid = String(a.problemId?._id || a.problemId || "");
        if (pid) solvedSet.add(pid);
      }
    }
    for (const t of planTaskDocs) {
      if (t.completedAt && dateKey(t.completedAt) === key && t.entityType === "problem") {
        const pid = t.entityId
          ? String(t.entityId)
          : t.evidence?.problemAttemptId && attemptToProblemMap.has(String(t.evidence.problemAttemptId))
          ? attemptToProblemMap.get(String(t.evidence.problemAttemptId))!
          : null;
        if (pid) {
          solvedSet.add(pid);
        }
      }
    }
    const problemsSolved = solvedSet.size;

    // Attempted problems today (strictly canonical problem IDs)
    const attemptSet = new Set<string>();
    for (const a of attemptDocs) {
      if (a.createdAt && dateKey(a.createdAt) === key) {
        const pid = String(a.problemId?._id || a.problemId || "");
        if (pid) attemptSet.add(pid);
      }
    }
    for (const t of planTaskDocs) {
      if (t.completedAt && dateKey(t.completedAt) === key && t.entityType === "problem") {
        const pid = t.entityId
          ? String(t.entityId)
          : t.evidence?.problemAttemptId && attemptToProblemMap.has(String(t.evidence.problemAttemptId))
          ? attemptToProblemMap.get(String(t.evidence.problemAttemptId))!
          : null;
        if (pid) {
          attemptSet.add(pid);
        }
      }
    }
    const problemsAttempted = attemptSet.size;

    // Completed revisions today (deduplicated by reviewAttemptId)
    const revSet = new Set<string>();
    for (const r of revisionDocs) {
      if (r.reviewedAt && dateKey(r.reviewedAt) === key) {
        const revId = String(r.reviewAttemptId || r._id);
        revSet.add(revId);
      }
    }
    for (const e of eventDocs) {
      if (e.occurredAt && dateKey(e.occurredAt) === key && e.eventType === "review_completed") {
        const revId = String(e.payload?.reviewAttemptId || e.reviewAttemptId || e._id || e.idempotencyKey);
        revSet.add(revId);
      }
    }
    const revisionsDone = revSet.size;

    // Completed missions today (distinct mission IDs from plan tasks or learning events)
    const missionSet = new Set<string>();
    for (const t of planTaskDocs) {
      if (t.completedAt && dateKey(t.completedAt) === key && t.entityType === "mission") {
        const mid = t.entityId ? String(t.entityId) : String(t._id);
        missionSet.add(mid);
      }
    }
    for (const e of eventDocs) {
      if (e.occurredAt && dateKey(e.occurredAt) === key && (e.missionId || e.payload?.missionSubmissionId)) {
        missionSet.add(String(e.missionId || e.payload?.missionSubmissionId));
      }
    }
    const missionsCompleted = missionSet.size;

    // Heatmap activity score reflects meaningful effort:
    // actual tracked minutes, or minimum effort units per verified solve/attempt/review/mission
    const activityScore = Math.max(actualMinutes, problemsSolved * 20, problemsAttempted * 10, revisionsDone * 10, missionsCompleted * 20);

    return {
      date: date.toISOString(),
      dateKey: key,
      dayOfWeek: date.getDay(),
      actualMinutes,
      minutes: actualMinutes,
      problemsSolved,
      problemsAttempted,
      revisionsDone,
      missionsCompleted,
      activityScore,
    };
  });

  const todayPoint = activityHistory[activityHistory.length - 1];
  const todayFocusedMinutes = todayPoint?.actualMinutes ?? 0;
  const todaySolvesCount = todayPoint?.problemsSolved ?? 0;
  const todayAttemptsCount = todayPoint?.problemsAttempted ?? 0;
  const todayMissionsCount = todayPoint?.missionsCompleted ?? 0;

  const totalActiveDays = activityHistory.filter(
    (d) => d.actualMinutes > 0 || d.problemsSolved > 0 || d.problemsAttempted > 0 || d.revisionsDone > 0 || (d.missionsCompleted ?? 0) > 0
  ).length;

  const totalMinutesPast28 = activityHistory.reduce((sum, d) => sum + d.actualMinutes, 0);
  const totalFocusedHours = Math.round((totalMinutesPast28 / 60) * 10) / 10;

  return {
    todayFocusedMinutes,
    todayTargetMinutes: Math.max(15, targetDailyMinutes || 45),
    todaySolvesCount,
    todayAttemptsCount,
    todayMissionsCount,
    currentStreakDays,
    bestStreakDays: Math.max(currentStreakDays, bestStreakDays),
    totalActiveDays,
    totalFocusedHours,
    totalSolvedProblems,
    activityHistory,
  };
}
