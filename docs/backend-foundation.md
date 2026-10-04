# DSA Club Backend Foundation

## Project Architecture

DSA Club is a modular monolith built on Next.js App Router. This is the right first production architecture: one deployable unit, one transactional database boundary, clear feature ownership, and no distributed-systems tax before the workload earns it.

`app` is the transport layer only. Server actions and route handlers authenticate, validate, and call feature services. Feature services own business decisions. Mongoose models own persistence contracts. Every learning action also produces an immutable `ActivityEvent`, while current state is stored in small read models (`TopicProgress`, `PatternMastery`, `UserStatistics`). This gives fast dashboard/recommendation reads without discarding auditability or the ability to recompute scores.

Critical invariants:

- UTC `Date` is stored everywhere; user timezone is used only to derive a local `dateKey` and notification schedule.
- Every user-owned collection starts its compound indexes with `userId`.
- Content has stable human slugs and MongoDB `_id`; joins use `_id`, URLs use slugs.
- Scores are bounded 0-100; confidence and review grades are bounded 1-5 / 0-5.
- Event writes are idempotent through `(userId, idempotencyKey)`.
- Recommendation snapshots are immutable and expire automatically; user actions on them are separately logged.

## Folder Structure

```text
src/
  app/                         Next.js routes and transport adapters only
    api/auth/                  NextAuth route
    api/cron/                  Protected scheduled jobs
    api/v1/                    Public/versioned API routes
  features/                    Business domains; each owns models/services/actions
    identity/                  User and onboarding profile
    content/                   Curated topic, pattern, problem, mission, company graph
    learning/                  Roadmaps and evidence-producing learning activity
    intelligence/              Read models, revision, recommendations, AI, notifications
    progress/                  Mastery score calculation
    revision/                  Spaced repetition scheduling
    roadmaps/                  Personalized roadmap creation
    recommendations/           Next-action ranking and daily plans
  lib/
    auth.ts                    Authentication integration boundary
    auth-guard.ts              Reusable server-side authorization guard
    db/                        Connection lifecycle, model registry, schema helpers
  types/                       Shared domain types, never database implementation details
scripts/                       Operational scripts such as index synchronization
docs/                          Architecture contracts and product-engineering decisions
```

The feature-first boundary prevents a future `components`, `services`, and `models` mega-folder from becoming a second codebase. Cross-feature calls occur through public service functions; direct model access stays within the owning feature except for reporting/recompute jobs.

## Database Collections

| Domain | Collections | Why they are separate |
| --- | --- | --- |
| Identity | `users`, `userProfiles` | Authentication identity changes at a different cadence from learning preferences. |
| Content graph | `topics`, `patterns`, `problems`, `missions`, `companies`, `companyPatterns`, `companyProblems` | Curated canonical data is globally shared, versionable, and never embedded into per-user state. |
| Roadmaps | `roadmapTemplates`, `roadmaps` | Templates are editorial assets; instantiated roadmaps preserve the personal plan that was generated. |
| Learning evidence | `topicProgress`, `patternMastery`, `problemAttempts`, `quizAttempts`, `learningSessions`, `reflectionLogs`, `bookmarks` | Attempts/logs are append-heavy evidence; progress documents are compact materialized state. |
| Decision engine | `revisionQueue`, `revisionHistory`, `recommendations`, `recommendationEvents`, `dailyPlans`, `userStatistics` | Scheduling, explainability, and fast home-screen reads require independent lifecycles. |
| Engagement and AI | `achievements`, `userAchievements`, `notifications`, `aiConversations`, `aiMessages` | Definitions are shared; instances/messages grow independently and are queried differently. |
| Operations | `activityEvents` | Immutable, idempotent activity stream for score recomputation, analytics, and debugging. |

## Schemas

All documents receive `createdAt` and `updatedAt`. `ObjectId` below means MongoDB `ObjectId` with a Mongoose `ref` where a canonical collection exists.

### Identity

| Collection | Purpose and fields | References / indexes / validation / scale | Example |
| --- | --- | --- | --- |
| `users` | Canonical account: `email:string`, `name:string`, `image:string?`, `role:enum`, `status:enum`, `timezone:string`, `locale:string`, `lastActiveAt:date`, `deletedAt:date?`. | Unique `{email}`; `{role,status}` and `{lastActiveAt}`. Email lowercased/max 254; soft delete preserves history. Small, one document per account. | `{_id:ObjectId("..."),email:"riya@example.com",role:"student",timezone:"Asia/Kolkata"}` |
| `userProfiles` | Onboarding and personalization: `userId:ObjectId`, `currentLevel:enum`, `primaryLanguage:enum`, `goals:enum[]`, `targetCompanyIds:ObjectId[]`, `dailyMinutes:number`, `targetDate:date?`, `preferences:object`. | Unique `{userId}`; refs users/companies. Daily minutes 15-720, valid `HH:mm` reminder. Isolated from auth so profile revisions do not touch identity. | `{userId:ObjectId("..."),currentLevel:"beginner",primaryLanguage:"java",dailyMinutes:90,goals:["placements"]}` |

### Content graph

| Collection | Purpose and fields | References / indexes / validation / scale | Example |
| --- | --- | --- | --- |
| `topics` | Curriculum unit: `slug`, `name`, `description`, `order`, `difficulty`, `prerequisiteTopicIds[]`, `estimatedMinutes`, `isPublished`. | Unique `{slug}`, `{isPublished,order}`. Slug regex; immutable editorial references. Small globally cached collection. | `{slug:"binary-search",name:"Binary Search",difficulty:"easy",prerequisiteTopicIds:[]}` |
| `patterns` | Reusable problem-solving pattern: `slug`, `name`, `topicId`, `description`, `signalKeywords[]`, `prerequisitePatternIds[]`, `difficulty`, `isPublished`. | Unique `{slug}`, `{topicId,isPublished}`. Keywords capped; content referenced by progress. Cache by published version. | `{slug:"two-pointers",topicId:ObjectId("..."),signalKeywords:["sorted","pair"]}` |
| `problems` | Curated problem metadata, never copies third-party problem bodies: `slug`, `title`, `summary`, `source`, `sourceUrl`, `externalId?`, `topicIds[]`, `patternIds[]`, `difficulty`, `estimatedMinutes`, `qualityScore`, `companyIds[]`, `tags[]`, `isPublished`. | Unique `{slug}`; `{topicIds,difficulty,isPublished}`, `{patternIds,difficulty,isPublished}`. URL/score bounds; supports query-based candidate selection. | `{slug:"two-sum",source:"leetcode",topicIds:[ObjectId("...")],patternIds:[ObjectId("...")],difficulty:"easy"}` |
| `missions` | A guided, measurable learning unit: `slug`, `title`, `description`, `topicId`, `patternId?`, `estimatedMinutes`, `difficulty`, `steps[{key,kind,targetId?,required,weight}]`, `isPublished`. | Unique `{slug}`, `{topicId,isPublished}`. Step kinds controlled; weights 0-1. Keep steps embedded because they are bounded and mission-owned. | `{slug:"binary-search-core",topicId:ObjectId("..."),steps:[{key:"practice-1",kind:"practice",weight:0.5}]}` |
| `companies` | Target-company taxonomy: `slug`, `name`, `tier`, `isActive`. | Unique `{slug}`; `{isActive}`. Stable shared data; cache aggressively. | `{slug:"google",name:"Google",tier:"big_tech"}` |
| `companyPatterns` | Company-to-pattern many-to-many edge: `companyId`, `patternId`, `relevanceScore`, `frequency`. | Unique `{companyId,patternId}`. Score 0-1. Separate edge permits evidence/source metadata later. | `{companyId:ObjectId("..."),patternId:ObjectId("..."),relevanceScore:0.94,frequency:"high"}` |
| `companyProblems` | Company-to-problem many-to-many edge: `companyId`, `problemId`, `reportedAt?`, `confidence`. | Unique `{companyId,problemId}`. Confidence 0-1; preserve reports as uncertain signals. | `{companyId:ObjectId("..."),problemId:ObjectId("..."),confidence:0.72}` |

### Roadmaps and learning evidence

| Collection | Purpose and fields | References / indexes / validation / scale | Example |
| --- | --- | --- | --- |
| `roadmapTemplates` | Editorial blueprint: `slug`, `name`, `audience`, `version`, `stages[]`, `isPublished`. A stage has topic/mission IDs, order, minutes. | Unique `{slug,version}`; `{isPublished}`. Stages embedded because template-owned and bounded. Version, do not mutate history. | `{slug:"placement-beginner",version:1,stages:[{key:"arrays",estimatedMinutes:720}]}` |
| `roadmaps` | User-specific generated plan: `userId`, `templateId?`, `status`, onboarding `inputs`, `algorithmVersion`, generated `stages[]`. | `{userId,status,updatedAt:-1}`. Archive prior active plan on generation. Copy stage references and dates to make the plan reproducible. | `{userId:ObjectId("..."),status:"active",algorithmVersion:"roadmap-v1",stages:[{key:"arrays",status:"active"}]}` |
| `topicProgress` | Current topic scorecard: `userId`, `topicId`, state, eight evidence scores, `masteryScore`, counters and relevant dates. | Unique `{userId,topicId}`; `{userId,masteryScore,lastStudiedAt}`. Scores 0-100; recomputable from evidence. This is the primary weak/strong-topic read model. | `{userId:ObjectId("..."),topicId:ObjectId("..."),practiceScore:68,retentionScore:55,masteryScore:62}` |
| `patternMastery` | Current pattern scorecard: user/topic/pattern IDs, `recognitionScore`, `applicationScore`, `transferScore`, `masteryScore`, attempts, last date. | Unique `{userId,patternId}`; `{userId,masteryScore}`. Records recognition separately from solving to expose false confidence. | `{userId:ObjectId("..."),patternId:ObjectId("..."),recognitionScore:80,applicationScore:52}` |
| `problemAttempts` | Immutable practice evidence: user/problem IDs, `status`, `strategy`, duration, hint count, self-confidence, perceived difficulty, language, start/end dates. | `{userId,problemId,createdAt:-1}`, `{userId,status,completedAt:-1}`. Never overwrite an attempt; append a retry. This will be a high-volume collection, so time-range pagination only. | `{userId:ObjectId("..."),problemId:ObjectId("..."),status:"solved",strategy:"independent",durationSeconds:1420}` |
| `quizAttempts` | Immutable quiz evidence: user/topic/pattern IDs, correct/total, score, duration, submitted date. | `{userId,topicId,submittedAt:-1}`. Score 0-100; correct <= total enforced by service. | `{userId:ObjectId("..."),topicId:ObjectId("..."),correctCount:7,totalCount:10,score:70}` |
| `learningSessions` | Focus-time ledger: user/topic/mission IDs, start/end, planned/focused time, activity counts, quality. | `{userId,startedAt:-1}`. Focused seconds non-negative. Session aggregation feeds consistency, not mastery by itself. | `{userId:ObjectId("..."),plannedMinutes:45,focusedSeconds:2380}` |
| `reflectionLogs` | Student reflection evidence: user/topic/attempt IDs, content, self-rating, AI quality score, misconceptions. | `{userId,topicId,createdAt:-1}`. Content 20-5000 chars. AI evaluation is optional; student reflection is never rejected because AI is unavailable. | `{userId:ObjectId("..."),selfRating:3,qualityScore:72,extractedMisconceptions:["off-by-one bounds"]}` |
| `bookmarks` | Personal saved items: user ID, polymorphic `entityType`, `entityId`, note. | Unique `{userId,entityType,entityId}`. Entity must be supported enum; no ref because it is intentionally polymorphic. | `{userId:ObjectId("..."),entityType:"problem",entityId:ObjectId("..."),note:"Retry without hints"}` |

### Decision, revision, engagement, AI, operations

| Collection | Purpose and fields | References / indexes / validation / scale | Example |
| --- | --- | --- | --- |
| `revisionQueue` | One current spaced-repetition state per user/entity: user, polymorphic entity, `state`, `dueAt`, interval/ease/repetition/lapse fields, priority, source, snooze. | Unique `{userId,entityType,entityId}`; `{userId,state,dueAt,priority:-1}`. Interval `.04-3650`, ease `1.3-3.2`. This is a compact hot working set. | `{userId:ObjectId("..."),entityType:"pattern",entityId:ObjectId("..."),state:"due",intervalDays:7,easeFactor:2.45}` |
| `revisionHistory` | Immutable record of every review: queue/user/entity IDs, grade, confidence, response time, prior/next interval, overdue flag. | `{userId,reviewedAt:-1}`, `{queueId,reviewedAt:-1}`. Grade 0-5. Enables retention analytics and algorithm migration. | `{queueId:ObjectId("..."),grade:4,confidence:4,previousIntervalDays:3,nextIntervalDays:7}` |
| `recommendations` | Explainable, expiring ranked snapshot: user, generated/expires dates, algorithm version, context, ranked candidates, selection timestamps. | `{userId,generatedAt:-1}` plus TTL `{expiresAt}`. Candidate explanations capped. Snapshot protects experiments and enables retrospectives. | `{userId:ObjectId("..."),algorithmVersion:"recommendation-v1",candidates:[{rank:1,actionType:"revision",score:190}]}` |
| `recommendationEvents` | Append-only response to a recommendation: user/recommendation IDs, rank, event, date, metadata. | `{recommendationId,occurredAt}`, `{userId,occurredAt:-1}`. Event enum protects analytics. Use for ranking calibration. | `{recommendationId:ObjectId("..."),candidateRank:1,event:"completed"}` |
| `dailyPlans` | One local-day plan: user, `dateKey`, timezone, target/completed minutes, status, ordered embedded plan items. | Unique `{userId,dateKey}`. Date key must be YYYY-MM-DD. Items stay embedded because a daily plan is bounded. | `{userId:ObjectId("..."),dateKey:"2026-07-31",targetMinutes:90,items:[{order:1,status:"pending"}]}` |
| `userStatistics` | One fast home-page state document: totals, streak, interview/overall/consistency/retention/reflection/pattern scores, current/last IDs, weak/strong topic IDs. | Unique `{userId}`. Scores 0-100. Materialized from source events; never the only source of truth. | `{userId:ObjectId("..."),currentStreakDays:8,interviewReadinessScore:47,weakTopicIds:[ObjectId("...")]}` |
| `achievements` | Shared achievement definitions: key, title, description, category, criteria, active flag. | Unique `{key}`. Criteria is versioned structured JSON. Cache active definitions. | `{key:"seven-day-streak",category:"consistency",criteria:{days:7}}` |
| `userAchievements` | Earned achievement instance: user/achievement IDs, unlocked date, metadata. | Unique `{userId,achievementId}`. Idempotent unlock. | `{userId:ObjectId("..."),achievementId:ObjectId("..."),unlockedAt:ISODate("...")}` |
| `notifications` | In-app notification: user, type, title/body, deep link, status, schedule/read dates. | `{userId,status,scheduledAt:-1}`. Titles/bodies limited; delivery channels can be added as a child collection later. | `{userId:ObjectId("..."),type:"revision_due",status:"unread"}` |
| `aiConversations` | AI thread container: user, title, optional topic/problem/roadmap context, status, last message date. | `{userId,lastMessageAt:-1}`. Context is explicit to avoid unbounded prompt reconstruction. | `{userId:ObjectId("..."),context:{topicId:ObjectId("...")},status:"active"}` |
| `aiMessages` | Immutable AI/user/system message: conversation/user IDs, role, content, model, token usage, safety flags, metadata. | `{conversationId,createdAt}`. Content max 20k; paginate by cursor, never embed messages in conversation. | `{conversationId:ObjectId("..."),role:"assistant",model:"gpt-4o-mini",tokenUsage:{input:400,output:120}}` |
| `activityEvents` | Immutable learning event stream: user, event type, optional polymorphic target, occurrence date, payload, idempotency key. | Unique `{userId,idempotencyKey}`, `{userId,occurredAt:-1}`. Typed event payload validated before write. Partition/archive at scale. | `{userId:ObjectId("..."),type:"problem_solved",entityType:"problem",entityId:ObjectId("..."),idempotencyKey:"attempt:abc"}` |

## Relationships

One-to-one: `users -> userProfiles` and `users -> userStatistics` use a unique `userId`. They are separate documents because their write patterns differ from identity and each other.

One-to-many: a `topic` owns many patterns/missions; a user owns many attempts, sessions, reflections, revisions, recommendations, notifications, and AI conversations. The child stores the parent `ObjectId` and the index begins with that parent ID.

Many-to-many: topics-to-problems and patterns-to-problems are bounded arrays of canonical IDs on `problems`; company-to-pattern and company-to-problem use edge collections because edge metadata matters. User-to-achievement uses `userAchievements`. Avoid a join collection for a bounded, read-mostly taxonomy relationship with no relationship attributes.

Embed a value when it is bounded, queried only with its parent, and must remain an atomic snapshot: roadmap stages, mission steps, daily plan items, recommendation candidates. Reference when children can grow unbounded, need their own indexes/lifecycle, are shared, or are independently queried: attempts, messages, revisions, content items.

Use `ObjectId` for canonical internal identity and joins. Do not use it for public URLs (`slug`), local day identity (`dateKey`), idempotency (`idempotencyKey`), enums, external provider IDs, or polymorphic targets where an `entityType + entityId` pair is required. Never rely on Mongoose population in critical recommendation paths; batch query canonical documents or cache them.

## Recommendation Engine

The recommendation engine reads compact state plus fresh obligations, ranks candidates, stores the complete decision, and emits interaction events. The implementation is in `features/recommendations/services/recommendation.service.ts`.

Inputs and source of truth:

| Signal | Source | Effect |
| --- | --- | --- |
| Current/last topic, last solved problem, daily streak, readiness | `userStatistics` | Protect continuity and avoid arbitrary context switching. |
| Weak/strong topics and evidence dimensions | `topicProgress` | Repair low mastery before it becomes a blind spot. |
| Pattern mastery | `patternMastery` | Select recognition/application practice appropriate to the gap. |
| Revision due, lapses, urgency | `revisionQueue` | Due retrieval practice outranks new material. |
| Company target | `userProfiles`, `companyPatterns`, `companyProblems` | Boost relevant patterns/problems without allowing company hype to bypass fundamentals. |
| Roadmap stage and mission completion | `roadmaps`, mission progress events | Prefer the next finite roadmap step. |
| Quiz, practice, reflection, AI signals | Evidence logs and recomputed progress | Detect misunderstanding, low confidence, shallow reflection, repeated hint dependence. |
| Time and daily goal | `userProfiles`, `dailyPlans`, session totals | Only offer actions that fit the available window. |

Initial scoring is deterministic and explainable: due revision (100 + queue priority), active-roadmap mission (90), weakness repair (70 + mastery gap), then continuity/momentum (50). Production evolution should calculate a normalized score with: 30% retention urgency, 22% mastery gap, 18% roadmap urgency, 12% company alignment, 8% time fit, 5% streak protection, 5% novelty/fatigue control. Every coefficient is versioned in `algorithmVersion`; do not silently change a user’s historical decision logic.

## Roadmap Engine

1. Onboarding persists level, target companies, minutes/day, language, target date, and goal in `userProfiles`.
2. Template selection filters published `roadmapTemplates` by level, goal, and time band.
3. Company edges boost ordering of high-value patterns and problems inside eligible stages; prerequisites always win over a boost.
4. The generator turns estimated minutes into date ranges using daily minutes, snapshots template stage IDs/dates into a new `roadmaps` document, marks the first stage active, and archives an earlier active roadmap.
5. The live roadmap is adaptive: missed work adjusts future planned dates, but changes occur as an explicit regenerated version or stage reschedule event, never by overwriting historical evidence.
6. A milestone completes only when its topic evidence meets a configured minimum; watching/visiting content never completes it.

## Revision Engine

Every revisable entity has exactly one `revisionQueue` record and unlimited `revisionHistory` entries. Review date, due date, and time-zone-neutral `Date` values are stored in UTC.

The implemented SM-2-inspired scheduler starts at 1 day, then 3 days, then multiplies by an ease factor constrained to 1.3-3.2. Grade below 3 is a lapse: interval resets to 1 day, repetition resets, lapse count rises, and priority increases. Confidence modifies ease mildly, so an apparently correct but uncertain answer is scheduled sooner. A high confidence grade increases the interval carefully rather than making it disappear.

The hourly cron changes eligible scheduled/snoozed items to `due`. Missed reviews are never discarded; they retain their original due date, sort by priority then age, and `wasOverdue` is recorded on completion. A healthy streak can reduce notification pressure or daily queue size, but must never artificially extend intervals: retention evidence, not gamification, controls the schedule.

## Progress Engine

Topic mastery is computed from evidence, not page views:

`mastery = .17 understanding + .10 confidence + .12 quiz + .25 practice + .08 reflection + .15 retention + .05 consistency + .08 pattern recognition`

Each component is 0-100 and is backed by evidence: explanation checks/mission steps for understanding; self-rating calibrated against outcomes for confidence; quiz attempts for quiz; independent solves, time, hints, and difficulty for practice; structured reflections for reflection; revision grades/overdue behavior for retention; completed focus sessions across recent weeks for consistency; unfamiliar-problem recognition and pattern application for pattern recognition.

`topicProgress` stores the materialized dimensions and state threshold. `patternMastery` stores recognition, application, and transfer separately. `userStatistics` aggregates the cross-topic readiness score. Recompute jobs may rebuild all these documents from `activityEvents`, attempts, reviews, sessions, and reflections, which is why progress is not an append-only log nor a sole source of truth.

## Scaling Strategy

| Scale | Architecture | Database posture |
| --- | --- | --- |
| 100 users | Vercel serverless + Atlas shared tier; direct Mongoose reads/writes. | Keep existing compound indexes; use lean reads for recommendation queries. |
| 1,000 users | Atlas dedicated small cluster; cron hourly; add Atlas backups and slow-query alerts. | Cursor pagination for logs/messages/attempts. Maintain materialized statistics synchronously or via a small queue. |
| 100,000 users | Separate read-heavy recommendation compute from request path with a queue/worker; Atlas autoscaling and read replicas. | Redis for published content, active daily plan, recommendation snapshot, rate limits. Batch recompute with aggregation pipelines. Archive older raw events. |
| 1 million users | Dedicated worker fleet, Kafka/SQS-style event transport, atlas sharding by hashed `userId`, analytics warehouse. | Precompute daily candidate pools; use change streams/outbox. Shard high-volume user collections; do not shard global content collections prematurely. |

Pagination is always cursor-based on `(createdAt, _id)` or domain sequence fields; never use `skip` for large history. Aggregation is appropriate for nightly readiness rollups, cohort analytics, and retention summaries; request-time recommendation reads query materialized documents. Cache published topics/patterns/missions/company edges by content version, and cache only short-lived personalized outputs. Redis keys should be namespaced/versioned (`dsa:v1:user:{id}:stats`) with event-triggered invalidation.

## Future Improvements

- Add an outbox collection and worker to guarantee event publication after MongoDB writes.
- Version editorial content and scoring formulas, then attach version IDs to all generated plans and recommendations.
- Add a content-ingestion/admin domain with author review, source attribution, and draft/publish workflows.
- Introduce MongoDB Atlas Search for semantic problem discovery and retrieval-augmented AI coaching.
- Add privacy controls, retention jobs, consent records, and export/delete workflows before broad launch.
- Use evaluation datasets and counterfactual replay before allowing an ML ranker to replace deterministic recommendation rules.
- Add observability: structured logs, traces, model/token cost ledger, engine decision dashboards, and data-quality alarms.
