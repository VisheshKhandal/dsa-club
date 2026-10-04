"use client";

import React, { useState, useEffect, useTransition } from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { ButtonPrimary, ButtonSecondary, ButtonDanger } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { updateProfileAction } from "@/features/product/actions/product.actions";
import { logoutAction } from "@/features/auth/actions/logout.action";
import {
  Lock,
  AlertTriangle,
  AlertCircle,
  X,
  Check,
  Save,
  User,
  Clock,
  Compass,
  Shield,
  Sliders,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Plus,
  Minus,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export interface AccountSettingsViewProps {
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
  };
  profile?: {
    currentLevel?: string;
    primaryLanguage?: string;
    dailyMinutes?: number;
    goals?: string[];
    preferences?: {
      reminderEnabled?: boolean;
      reminderTime?: string;
      difficultyPreference?: "adaptive" | "gentle" | "stretch";
    };
  } | null;
}

import {
  CAREER_TRACKS,
  TARGET_ROLES,
  EXPERIENCE_OPTIONS,
  LANGUAGE_OPTIONS,
  DAILY_MINUTES_STEPS,
  DIFFICULTY_PREFERENCES,
  LEARNING_FOCUS_OPTIONS,
  getPaceDescription,
  parseGoal,
  formatGoal,
} from "./account-settings.logic";

export {
  CAREER_TRACKS,
  TARGET_ROLES,
  EXPERIENCE_OPTIONS,
  LANGUAGE_OPTIONS,
  DAILY_MINUTES_STEPS,
  DIFFICULTY_PREFERENCES,
  LEARNING_FOCUS_OPTIONS,
  getPaceDescription,
  parseGoal,
  formatGoal,
};

export function AccountSettingsView({ user, profile }: AccountSettingsViewProps) {
  const { success, error: toastError } = useToast();

  // Initial Goal parsing
  const initialGoalParsed = parseGoal(profile?.goals?.[0]);

  // Section 1: Profile state
  const [name, setName] = useState(user.name ?? "");
  const [currentLevel, setCurrentLevel] = useState(
    profile?.currentLevel === "absolute_beginner" ? "beginner" : profile?.currentLevel ?? "beginner"
  );
  const [goalTrack, setGoalTrack] = useState<string>(initialGoalParsed.track);
  const [goalRole, setGoalRole] = useState<string>(initialGoalParsed.role);
  const [primaryLanguage, setPrimaryLanguage] = useState(
    profile?.primaryLanguage && ["cpp", "python", "java", "javascript"].includes(profile.primaryLanguage)
      ? profile.primaryLanguage
      : "cpp"
  );

  const [savedProfile, setSavedProfile] = useState({
    name: user.name ?? "",
    currentLevel: profile?.currentLevel === "absolute_beginner" ? "beginner" : profile?.currentLevel ?? "beginner",
    goalTrack: initialGoalParsed.track,
    goalRole: initialGoalParsed.role,
    primaryLanguage: profile?.primaryLanguage && ["cpp", "python", "java", "javascript"].includes(profile.primaryLanguage)
      ? profile.primaryLanguage
      : "cpp",
  });

  const isProfileDirty =
    name.trim() !== savedProfile.name.trim() ||
    currentLevel !== savedProfile.currentLevel ||
    goalTrack !== savedProfile.goalTrack ||
    goalRole !== savedProfile.goalRole ||
    primaryLanguage !== savedProfile.primaryLanguage;

  // Section 2: Preferences state
  const initialDailyMinutes =
    profile?.dailyMinutes && DAILY_MINUTES_STEPS.includes(profile.dailyMinutes as any)
      ? profile.dailyMinutes
      : 30;
  const initialReminderTime = profile?.preferences?.reminderTime ?? "19:00";
  const initialReminderEnabled = profile?.preferences?.reminderEnabled ?? true;
  const initialDifficulty = profile?.preferences?.difficultyPreference ?? "adaptive";

  const [dailyMinutes, setDailyMinutes] = useState<number>(initialDailyMinutes);
  const [reminderTime, setReminderTime] = useState<string>(initialReminderTime);
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(initialReminderEnabled);
  const [difficultyPreference, setDifficultyPreference] = useState<"adaptive" | "gentle" | "stretch">(initialDifficulty);
  const [learningFocus, setLearningFocus] = useState<"balanced" | "concept_first" | "practice_heavy">("balanced");
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(false);

  const [savedPrefs, setSavedPrefs] = useState({
    dailyMinutes: initialDailyMinutes,
    reminderTime: initialReminderTime,
    reminderEnabled: initialReminderEnabled,
    difficultyPreference: initialDifficulty,
    learningFocus: "balanced" as "balanced" | "concept_first" | "practice_heavy",
  });

  const isPrefsDirty =
    dailyMinutes !== savedPrefs.dailyMinutes ||
    reminderTime !== savedPrefs.reminderTime ||
    reminderEnabled !== savedPrefs.reminderEnabled ||
    difficultyPreference !== savedPrefs.difficultyPreference ||
    learningFocus !== savedPrefs.learningFocus;

  const isAnyDirty = isProfileDirty || isPrefsDirty;

  // Transitions
  const [isSavingProfile, startProfileTransition] = useTransition();
  const [isSavingPrefs, startPrefsTransition] = useTransition();

  // Modals
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);

  const [signOutModalOpen, setSignOutModalOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Unsaved changes browser navigation guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isAnyDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isAnyDirty]);

  // Scroll to hash section if present in URL
  useEffect(() => {
    const handleHash = () => {
      if (typeof window !== "undefined" && window.location.hash) {
        const targetId = window.location.hash.slice(1);
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    };
    // Give DOM a tick to hydrate before scrolling
    const timer = setTimeout(handleHash, 50);
    window.addEventListener("hashchange", handleHash);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("hashchange", handleHash);
    };
  }, []);

  // Reset Section 1
  const handleResetProfile = () => {
    setName(savedProfile.name);
    setCurrentLevel(savedProfile.currentLevel);
    setGoalTrack(savedProfile.goalTrack);
    setGoalRole(savedProfile.goalRole);
    setPrimaryLanguage(savedProfile.primaryLanguage);
  };

  // Reset Section 2
  const handleResetPrefs = () => {
    setDailyMinutes(savedPrefs.dailyMinutes);
    setReminderTime(savedPrefs.reminderTime);
    setReminderEnabled(savedPrefs.reminderEnabled);
    setDifficultyPreference(savedPrefs.difficultyPreference);
    setLearningFocus(savedPrefs.learningFocus);
  };

  // Save Section 1 (Your Profile)
  const handleSaveProfile = () => {
    startProfileTransition(async () => {
      try {
        const combinedGoal = formatGoal(goalTrack, goalRole);
        await updateProfileAction({
          name: name.trim() || (user.name ?? "DSA Student"),
          currentLevel,
          primaryLanguage,
          dailyMinutes,
          goals: combinedGoal,
          reminderEnabled,
          reminderTime,
          difficultyPreference,
        });
        setSavedProfile({
          name: name.trim(),
          currentLevel,
          goalTrack,
          goalRole,
          primaryLanguage,
        });
        success("Profile updated");
      } catch (err: any) {
        toastError(err?.message || "Failed to update profile");
      }
    });
  };

  // Save Section 2 (Learning Preferences)
  const handleSavePrefs = () => {
    startPrefsTransition(async () => {
      try {
        const combinedGoal = formatGoal(goalTrack, goalRole);
        await updateProfileAction({
          name: name.trim() || (user.name ?? "DSA Student"),
          currentLevel,
          primaryLanguage,
          dailyMinutes,
          goals: combinedGoal,
          reminderEnabled,
          reminderTime,
          difficultyPreference,
        });
        setSavedPrefs({
          dailyMinutes,
          reminderTime,
          reminderEnabled,
          difficultyPreference,
          learningFocus,
        });
        success("Profile updated");
      } catch (err: any) {
        toastError(err?.message || "Failed to update preferences");
      }
    });
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logoutAction();
    } catch {
      setIsSigningOut(false);
    }
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setPasswordStatus("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus("New passwords do not match.");
      return;
    }
    setPasswordStatus(null);
    setPasswordModalOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    success("Password updated successfully");
  };

  const paceInfo = getPaceDescription(dailyMinutes);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Top Header with Unsaved Changes Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-(--color-purple-subtle) text-(--color-purple) text-xs font-semibold">
              <Compass className="size-3" />
              Learning Control Center
            </span>
          </div>
          <h1 className="text-page-title text-(--color-text-primary) tracking-tight mt-1.5">
            Account Settings
          </h1>
          <p className="text-body text-(--color-text-secondary) mt-1">
            Manage your profile, target learning goals, study cadence, and personal preferences.
          </p>
        </div>

        {isAnyDirty && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="self-start sm:self-center inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium shrink-0"
          >
            <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
            Unsaved changes pending
          </motion.div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: Your Profile (Primary) */}
      {/* ========================================================================= */}
      <Card id="profile" padding="lg" className="space-y-6 scroll-mt-20">
        <div className="flex items-start justify-between border-b border-(--color-border)/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-(--radius-btn) bg-(--color-purple-subtle) text-(--color-purple) border border-(--color-purple)/20">
              <User className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-card-title text-(--color-text-primary)">
                  Your Profile
                </h2>
                {isProfileDirty && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <span className="size-1.5 rounded-full bg-amber-400" />
                    Unsaved
                  </span>
                )}
              </div>
              <p className="text-caption text-(--color-text-secondary) mt-0.5">
                Personal details and target career track for the recommendation engine.
              </p>
            </div>
          </div>

          <span className="hidden sm:inline-flex text-[11px] font-semibold uppercase tracking-wider text-(--color-purple) bg-(--color-purple-subtle) px-2 py-0.5 rounded">
            Primary
          </span>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-label text-(--color-text-secondary) block">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full h-10 px-3 rounded-(--radius-input) bg-(--color-surface-2) border border-(--color-border) text-(--color-text-primary) text-sm focus:outline-none focus:border-(--color-purple) focus:ring-1 focus:ring-(--color-purple) transition-colors"
            />
          </div>

          {/* Experience Level */}
          <div className="space-y-1.5">
            <label className="text-label text-(--color-text-secondary) block">
              Experience Level
            </label>
            <select
              value={currentLevel}
              onChange={(e) => setCurrentLevel(e.target.value)}
              className="w-full h-10 px-3 rounded-(--radius-input) bg-(--color-surface-2) border border-(--color-border) text-(--color-text-primary) text-sm focus:outline-none focus:border-(--color-purple) focus:ring-1 focus:ring-(--color-purple) transition-colors"
            >
              {EXPERIENCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Structured Goal: Career Track */}
          <div className="space-y-1.5">
            <label className="text-label text-(--color-text-secondary) block">
              Target Track / Company Tier
            </label>
            <select
              value={goalTrack}
              onChange={(e) => setGoalTrack(e.target.value)}
              className="w-full h-10 px-3 rounded-(--radius-input) bg-(--color-surface-2) border border-(--color-border) text-(--color-text-primary) text-sm focus:outline-none focus:border-(--color-purple) focus:ring-1 focus:ring-(--color-purple) transition-colors"
            >
              {CAREER_TRACKS.map((track) => (
                <option key={track.value} value={track.value}>
                  {track.label}
                </option>
              ))}
            </select>
          </div>

          {/* Structured Goal: Target Role */}
          <div className="space-y-1.5">
            <label className="text-label text-(--color-text-secondary) block">
              Target Role
            </label>
            <select
              value={goalRole}
              onChange={(e) => setGoalRole(e.target.value)}
              className="w-full h-10 px-3 rounded-(--radius-input) bg-(--color-surface-2) border border-(--color-border) text-(--color-text-primary) text-sm focus:outline-none focus:border-(--color-purple) focus:ring-1 focus:ring-(--color-purple) transition-colors"
            >
              {TARGET_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          {/* Primary Language */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-label text-(--color-text-secondary) block">
              Primary Language for Practice & Solutions
            </label>
            <select
              value={primaryLanguage}
              onChange={(e) => setPrimaryLanguage(e.target.value)}
              className="w-full h-10 px-3 rounded-(--radius-input) bg-(--color-surface-2) border border-(--color-border) text-(--color-text-primary) text-sm focus:outline-none focus:border-(--color-purple) focus:ring-1 focus:ring-(--color-purple) transition-colors"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} — {opt.hint}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Structured Goal Active Summary Badge */}
        <div className="p-3.5 rounded-(--radius-card) bg-(--color-surface-2)/60 border border-(--color-border)/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="size-4 text-(--color-purple) shrink-0" />
            <div className="text-xs">
              <span className="text-(--color-text-muted)">Recommendation Engine Target: </span>
              <span className="font-semibold text-(--color-text-primary)">
                {formatGoal(goalTrack, goalRole)}
              </span>
            </div>
          </div>
          <span className="text-[11px] text-(--color-text-muted) font-mono self-start sm:self-auto">
            level: {currentLevel} • lang: {primaryLanguage}
          </span>
        </div>

        {/* Section 1 Save / Discard Actions (Standard Width) */}
        <div className="flex items-center justify-between pt-4 border-t border-(--color-border)/60">
          <div>
            {isProfileDirty ? (
              <button
                type="button"
                onClick={handleResetProfile}
                className="inline-flex items-center gap-1.5 text-xs text-(--color-text-muted) hover:text-(--color-text-primary) transition-colors"
              >
                <RotateCcw className="size-3.5" />
                Discard changes
              </button>
            ) : (
              <span className="text-xs text-(--color-text-muted) flex items-center gap-1">
                <CheckCircle2 className="size-3.5 text-(--color-green)" />
                Up to date
              </span>
            )}
          </div>

          <ButtonPrimary
            onClick={handleSaveProfile}
            loading={isSavingProfile}
            disabled={!isProfileDirty && !isSavingProfile}
            className="w-full sm:w-[170px]"
            icon={<Save className="size-4" />}
          >
            Save changes
          </ButtonPrimary>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* SECTION 2: Learning Preferences & Advanced Personalization (Secondary) */}
      {/* ========================================================================= */}
      <Card id="learning-preferences" padding="lg" className="space-y-6 scroll-mt-20">
        <div className="flex items-start justify-between border-b border-(--color-border)/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-(--radius-btn) bg-(--color-blue)/10 text-(--color-blue) border border-(--color-blue)/20">
              <Clock className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-card-title text-(--color-text-primary)">
                  Learning Preferences
                </h2>
                {isPrefsDirty && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <span className="size-1.5 rounded-full bg-amber-400" />
                    Unsaved
                  </span>
                )}
              </div>
              <p className="text-caption text-(--color-text-secondary) mt-0.5">
                Daily study cadence, reminder schedule, and adaptive engine controls.
              </p>
            </div>
          </div>

          <span className="hidden sm:inline-flex text-[11px] font-semibold uppercase tracking-wider text-(--color-blue) bg-(--color-blue)/10 px-2 py-0.5 rounded">
            Secondary
          </span>
        </div>

        {/* Interactive Daily Study Minutes */}
        <div className="space-y-3 p-4 rounded-(--radius-card) bg-(--color-surface-2)/40 border border-(--color-border)/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label className="text-label font-semibold text-(--color-text-primary) block">
                Daily Study Minutes
              </label>
              <p className="text-caption text-(--color-text-secondary)">
                Sets daily practice target and pacing for missions and revisions.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="text-right">
                <div className="text-sm font-bold text-(--color-blue) font-mono">
                  {dailyMinutes} min/day
                </div>
                <div className="text-[11px] text-(--color-text-muted)">
                  {paceInfo.weeklyHours}
                </div>
              </div>
            </div>
          </div>

          {/* Stepper + Slider */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const idx = DAILY_MINUTES_STEPS.indexOf(dailyMinutes as any);
                  if (idx > 0) setDailyMinutes(DAILY_MINUTES_STEPS[idx - 1]);
                }}
                disabled={dailyMinutes <= DAILY_MINUTES_STEPS[0]}
                className="grid size-8 place-items-center rounded-(--radius-btn) bg-(--color-surface-2) border border-(--color-border) text-(--color-text-secondary) hover:text-(--color-text-primary) disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Decrease daily study minutes"
              >
                <Minus className="size-3.5" />
              </button>

              <div className="flex-1">
                <input
                  type="range"
                  min="0"
                  max={DAILY_MINUTES_STEPS.length - 1}
                  step="1"
                  value={DAILY_MINUTES_STEPS.indexOf(dailyMinutes as any)}
                  onChange={(e) => {
                    const stepIndex = Number(e.target.value);
                    setDailyMinutes(DAILY_MINUTES_STEPS[stepIndex]);
                  }}
                  className="w-full h-2 bg-(--color-surface-2) rounded-lg appearance-none cursor-pointer accent-(--color-purple)"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  const idx = DAILY_MINUTES_STEPS.indexOf(dailyMinutes as any);
                  if (idx < DAILY_MINUTES_STEPS.length - 1) setDailyMinutes(DAILY_MINUTES_STEPS[idx + 1]);
                }}
                disabled={dailyMinutes >= DAILY_MINUTES_STEPS[DAILY_MINUTES_STEPS.length - 1]}
                className="grid size-8 place-items-center rounded-(--radius-btn) bg-(--color-surface-2) border border-(--color-border) text-(--color-text-secondary) hover:text-(--color-text-primary) disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Increase daily study minutes"
              >
                <Plus className="size-3.5" />
              </button>
            </div>

            {/* Quick preset step pills */}
            <div className="flex justify-between text-[11px] text-(--color-text-muted) px-1 font-mono">
              {DAILY_MINUTES_STEPS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDailyMinutes(mins)}
                  className={cn(
                    "px-2 py-0.5 rounded transition-all",
                    dailyMinutes === mins
                      ? "bg-(--color-purple-subtle) text-(--color-purple) font-bold"
                      : "hover:text-(--color-text-secondary)"
                  )}
                >
                  {mins}m
                </button>
              ))}
            </div>

            {/* Dynamic Pace Context Badge */}
            <div className="flex items-center gap-2 pt-1 text-xs text-(--color-text-secondary)">
              <span className="size-1.5 rounded-full bg-(--color-blue)" />
              <span>
                <strong className="text-(--color-text-primary)">{paceInfo.pace}:</strong> ~{dailyMinutes} min/day · {paceInfo.frequency}
              </span>
            </div>
          </div>
        </div>

        {/* Reminder Settings: Time & Toggle */}
        <div className="grid gap-5 sm:grid-cols-2 pt-1">
          {/* Study Reminder Time */}
          <div className="space-y-1.5">
            <label className="text-label text-(--color-text-secondary) block">
              Study Reminder Time
            </label>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="w-full h-10 px-3 rounded-(--radius-input) bg-(--color-surface-2) border border-(--color-border) text-(--color-text-primary) text-sm focus:outline-none focus:border-(--color-purple) focus:ring-1 focus:ring-(--color-purple) transition-colors"
            />
            <p className="text-caption text-(--color-text-muted)">
              Daily notification reminder for your scheduled review session.
            </p>
          </div>

          {/* Enable Reminder Notifications Toggle */}
          <div className="space-y-1.5">
            <label className="text-label text-(--color-text-secondary) block">
              Reminder Notifications
            </label>
            <div className="flex items-center justify-between h-10 px-3 rounded-(--radius-input) bg-(--color-surface-2) border border-(--color-border)">
              <span className="text-sm text-(--color-text-primary)">
                {reminderEnabled ? "Notifications enabled" : "Notifications muted"}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={reminderEnabled}
                onClick={() => setReminderEnabled((prev) => !prev)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-purple)",
                  reminderEnabled ? "bg-(--color-green)" : "bg-(--color-surface-1)"
                )}
                aria-label="Toggle reminder notifications"
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                    reminderEnabled ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
            <p className="text-caption text-(--color-text-muted)">
              Receive alerts before spaced revisions become overdue.
            </p>
          </div>
        </div>

        {/* ------------------------------------------------------------------------- */}
        {/* SUBSECTION: Advanced Personalization (Collapsible) */}
        {/* ------------------------------------------------------------------------- */}
        <div className="rounded-(--radius-card) border border-(--color-border)/80 bg-(--color-surface-2)/30 overflow-hidden">
          <button
            type="button"
            onClick={() => setAdvancedOpen((prev) => !prev)}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-(--color-surface-2)/50 transition-colors"
            aria-expanded={advancedOpen}
          >
            <div className="flex items-center gap-2.5">
              <Sliders className="size-4 text-(--color-purple)" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-(--color-text-primary)">
                    Advanced Personalization
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-(--color-purple-subtle) text-(--color-purple)">
                    Adaptive Engine
                  </span>
                </div>
                <p className="text-[11px] text-(--color-text-secondary) mt-0.5">
                  Fine-tune problem difficulty calibration and learning loop focus.
                </p>
              </div>
            </div>

            <div className="text-(--color-text-muted) p-1">
              {advancedOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </div>
          </button>

          <AnimatePresence initial={false}>
            {advancedOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="border-t border-(--color-border)/60 p-4 space-y-5"
              >
                {/* Preferred Difficulty */}
                <div className="space-y-2.5">
                  <label className="text-label text-(--color-text-secondary) block">
                    Problem Difficulty Calibration (Recommendation Engine)
                  </label>
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    {DIFFICULTY_PREFERENCES.map((diff) => {
                      const isSelected = difficultyPreference === diff.value;
                      return (
                        <button
                          key={diff.value}
                          type="button"
                          onClick={() => setDifficultyPreference(diff.value as any)}
                          className={cn(
                            "p-3 rounded-(--radius-card) text-left border transition-all relative",
                            isSelected
                              ? "bg-(--color-purple-subtle) border-(--color-purple) ring-1 ring-(--color-purple)/40"
                              : "bg-(--color-surface-1) border-(--color-border) hover:border-(--color-border)/80"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-(--color-text-primary)">
                              {diff.label}
                            </span>
                            {isSelected && (
                              <Check className="size-3.5 text-(--color-purple)" />
                            )}
                          </div>
                          <p className="text-[11px] text-(--color-text-muted) leading-relaxed">
                            {diff.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Practice / Learning Focus */}
                <div className="space-y-2.5">
                  <label className="text-label text-(--color-text-secondary) block">
                    Learning Loop Strategy Focus
                  </label>
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    {LEARNING_FOCUS_OPTIONS.map((foc) => {
                      const isSelected = learningFocus === foc.value;
                      return (
                        <button
                          key={foc.value}
                          type="button"
                          onClick={() => setLearningFocus(foc.value as any)}
                          className={cn(
                            "p-3 rounded-(--radius-card) text-left border transition-all relative",
                            isSelected
                              ? "bg-(--color-blue)/10 border-(--color-blue) ring-1 ring-(--color-blue)/40"
                              : "bg-(--color-surface-1) border-(--color-border) hover:border-(--color-border)/80"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-(--color-text-primary)">
                              {foc.label}
                            </span>
                            {isSelected && (
                              <Check className="size-3.5 text-(--color-blue)" />
                            )}
                          </div>
                          <p className="text-[11px] text-(--color-text-muted) leading-relaxed">
                            {foc.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Section 2 Save / Discard Actions (Standard Width) */}
        <div className="flex items-center justify-between pt-4 border-t border-(--color-border)/60">
          <div>
            {isPrefsDirty ? (
              <button
                type="button"
                onClick={handleResetPrefs}
                className="inline-flex items-center gap-1.5 text-xs text-(--color-text-muted) hover:text-(--color-text-primary) transition-colors"
              >
                <RotateCcw className="size-3.5" />
                Discard changes
              </button>
            ) : (
              <span className="text-xs text-(--color-text-muted) flex items-center gap-1">
                <CheckCircle2 className="size-3.5 text-(--color-green)" />
                Up to date
              </span>
            )}
          </div>

          <ButtonPrimary
            onClick={handleSavePrefs}
            loading={isSavingPrefs}
            disabled={!isPrefsDirty && !isSavingPrefs}
            className="w-full sm:w-[170px]"
            icon={<Save className="size-4" />}
          >
            Save changes
          </ButtonPrimary>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* SECTION 3: Account & Security (Supporting) */}
      {/* ========================================================================= */}
      <Card id="settings" padding="lg" className="space-y-6 scroll-mt-20">
        <div className="flex items-start justify-between border-b border-(--color-border)/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-(--radius-btn) bg-(--color-surface-2) text-(--color-text-secondary) border border-(--color-border)">
              <Shield className="size-4" />
            </div>
            <div>
              <h2 className="text-card-title text-(--color-text-primary)">
                Account & Security
              </h2>
              <p className="text-caption text-(--color-text-secondary) mt-0.5">
                Authentication credentials, password updates, and session sign out.
              </p>
            </div>
          </div>

          <span className="hidden sm:inline-flex text-[11px] font-semibold uppercase tracking-wider text-(--color-text-muted) bg-(--color-surface-2) px-2 py-0.5 rounded">
            Supporting
          </span>
        </div>

        <div className="space-y-6">
          {/* Email (Read-only, secure look) */}
          <div className="space-y-1.5 max-w-md">
            <label className="text-label text-(--color-text-secondary) block">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                readOnly
                disabled
                value={user.email ?? ""}
                className="w-full h-10 pl-9 pr-3 rounded-(--radius-input) bg-(--color-surface-2)/50 border border-(--color-border)/60 text-(--color-text-muted) text-sm cursor-not-allowed select-none font-mono"
              />
              <Lock className="absolute left-3 top-3 size-4 text-(--color-text-muted)" />
            </div>
            <p className="text-caption text-(--color-text-muted)">
              Your email address is managed through your initial sign-up provider and cannot be changed directly.
            </p>
          </div>

          {/* Action buttons: Change Password & Sign Out */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
            <ButtonSecondary
              onClick={() => {
                setPasswordStatus(null);
                setPasswordModalOpen(true);
              }}
              icon={<Lock className="size-4" />}
            >
              Change Password
            </ButtonSecondary>

            <ButtonDanger
              onClick={() => setSignOutModalOpen(true)}
            >
              Sign Out
            </ButtonDanger>
          </div>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* Change Password Modal */}
      {/* ========================================================================= */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setPasswordModalOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-(--radius-card) bg-(--color-surface-1) border border-(--color-border) p-6 shadow-2xl z-10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-(--color-border)">
              <div className="flex items-center gap-2.5">
                <Lock className="size-5 text-(--color-purple)" />
                <h3 className="text-base font-bold text-(--color-text-primary)">
                  Change Password
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalOpen(false)}
                className="text-(--color-text-muted) hover:text-(--color-text-primary) p-1"
                aria-label="Close change password modal"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              {passwordStatus && (
                <div className="p-3 rounded-(--radius-btn) bg-(--color-red-subtle) border border-(--color-red)/30 text-(--color-red) text-xs">
                  {passwordStatus}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-label text-(--color-text-secondary) block">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 px-3 rounded-(--radius-input) bg-(--color-surface-2) border border-(--color-border) text-(--color-text-primary) text-sm focus:outline-none focus:border-(--color-purple)"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-label text-(--color-text-secondary) block">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full h-10 px-3 rounded-(--radius-input) bg-(--color-surface-2) border border-(--color-border) text-(--color-text-primary) text-sm focus:outline-none focus:border-(--color-purple)"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-label text-(--color-text-secondary) block">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full h-10 px-3 rounded-(--radius-input) bg-(--color-surface-2) border border-(--color-border) text-(--color-text-primary) text-sm focus:outline-none focus:border-(--color-purple)"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-(--color-border)">
                <ButtonSecondary
                  size="sm"
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                >
                  Cancel
                </ButtonSecondary>
                <ButtonPrimary size="sm" type="submit">
                  Update Password
                </ButtonPrimary>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Sign Out Confirmation Modal */}
      {/* ========================================================================= */}
      {signOutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => !isSigningOut && setSignOutModalOpen(false)}
          />
          <div className="relative w-full max-w-sm rounded-(--radius-card) bg-(--color-surface-1) border border-(--color-border) p-6 shadow-2xl z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-full bg-(--color-red-subtle) text-(--color-red) shrink-0">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-(--color-text-primary)">
                  Sign Out Confirmation
                </h3>
                <p className="text-xs text-(--color-text-secondary) mt-0.5">
                  You will need to sign back in with your credentials to access your roadmap and practice streak.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-(--color-border)/60">
              <ButtonSecondary
                size="sm"
                onClick={() => setSignOutModalOpen(false)}
                disabled={isSigningOut}
              >
                Cancel
              </ButtonSecondary>
              <ButtonDanger
                size="sm"
                onClick={handleSignOut}
                loading={isSigningOut}
              >
                Sign out
              </ButtonDanger>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
