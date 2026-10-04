"use client";

import React, { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { ButtonPrimary, ButtonSecondary, ButtonDanger } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  updateProfileAction,
  resetLearningDataAction,
  exportUserDataAction,
  deleteAccountAction,
} from "@/features/product/actions/product.actions";
import { logoutAction } from "@/features/auth/actions/logout.action";
import {
  User,
  Shield,
  KeyRound,
  Download,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Laptop,
  Check,
  X,
  ExternalLink,
  Sparkles,
  Lock,
  ChevronRight,
  Eye,
  EyeOff,
  Clock,
  Briefcase,
  Layers,
  Code2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  CAREER_TRACKS,
  TARGET_ROLES,
  EXPERIENCE_OPTIONS,
  LANGUAGE_OPTIONS,
  parseGoal,
  formatGoal,
} from "./account-settings.logic";

export interface AccountViewProps {
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    role?: string;
    createdAt?: string;
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

export function AccountView({ user, profile }: AccountViewProps) {
  const { success, error: toastError, info } = useToast();
  const initialGoalParsed = parseGoal(profile?.goals?.[0]);

  // Form states
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

  const [savedState, setSavedState] = useState({
    name: user.name ?? "",
    currentLevel: profile?.currentLevel === "absolute_beginner" ? "beginner" : profile?.currentLevel ?? "beginner",
    goalTrack: initialGoalParsed.track,
    goalRole: initialGoalParsed.role,
    primaryLanguage: profile?.primaryLanguage && ["cpp", "python", "java", "javascript"].includes(profile.primaryLanguage)
      ? profile.primaryLanguage
      : "cpp",
  });

  const [isSaving, startSaving] = useTransition();

  // Modals state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Danger zone modals
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetInput, setResetInput] = useState("");
  const [isResetting, startResetting] = useTransition();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [isDeleting, startDeleting] = useTransition();

  const [isExporting, startExporting] = useTransition();
  const [sessionTerminated, setSessionTerminated] = useState(false);

  // Calculate profile completion percentage
  const completionItems = [
    { label: "Account registered & verified", done: true },
    { label: "Full Name set", done: Boolean(name.trim()) },
    { label: "Experience level chosen", done: Boolean(currentLevel) },
    { label: "Target career & role configured", done: Boolean(goalTrack && goalRole) },
    { label: "Primary coding language selected", done: Boolean(primaryLanguage) },
  ];
  const completedCount = completionItems.filter((i) => i.done).length;
  const completionPercent = Math.round((completedCount / completionItems.length) * 100);

  const isProfileDirty =
    name !== savedState.name ||
    currentLevel !== savedState.currentLevel ||
    goalTrack !== savedState.goalTrack ||
    goalRole !== savedState.goalRole ||
    primaryLanguage !== savedState.primaryLanguage;

  const handleSaveProfile = () => {
    if (!name.trim()) {
      toastError("Please enter your name");
      return;
    }

    startSaving(async () => {
      try {
        await updateProfileAction({
          name: name.trim(),
          currentLevel,
          primaryLanguage,
          dailyMinutes: profile?.dailyMinutes ?? 30,
          goals: formatGoal(goalTrack, goalRole),
          reminderEnabled: profile?.preferences?.reminderEnabled ?? true,
          reminderTime: profile?.preferences?.reminderTime ?? "19:00",
          difficultyPreference: profile?.preferences?.difficultyPreference ?? "adaptive",
        });

        setSavedState({
          name: name.trim(),
          currentLevel,
          goalTrack,
          goalRole,
          primaryLanguage,
        });

        success("Account profile updated successfully!");
      } catch (err: any) {
        toastError(err.message || "Failed to update profile.");
      }
    });
  };

  const handleExportData = () => {
    startExporting(async () => {
      try {
        const payload = await exportUserDataAction();
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `dsa-club-learning-data-${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        success("Your complete learning history has been exported.");
      } catch (err: any) {
        toastError(err.message || "Failed to export learning data.");
      }
    });
  };

  const handleResetLearning = () => {
    if (resetInput.trim() !== "RESET") {
      toastError('Please type "RESET" to confirm.');
      return;
    }

    startResetting(async () => {
      try {
        await resetLearningDataAction("RESET");
        setResetModalOpen(false);
        setResetInput("");
        success("All learning progress and history have been reset.");
      } catch (err: any) {
        toastError(err.message || "Failed to reset learning data.");
      }
    });
  };

  const handleDeleteAccount = () => {
    if (deleteInput.trim() !== "DELETE") {
      toastError('Please type "DELETE" to confirm.');
      return;
    }

    startDeleting(async () => {
      try {
        await deleteAccountAction("DELETE");
        setDeleteModalOpen(false);
        setDeleteInput("");
        success("Account deactivated. Signing you out...");
        setTimeout(() => {
          logoutAction();
        }, 1200);
      } catch (err: any) {
        toastError(err.message || "Failed to delete account.");
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-(--color-border) pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-(--color-purple) uppercase tracking-wider mb-1">
            <User className="size-3.5" />
            <span>Account Management Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-(--color-text-primary)">
            Account & Identity
          </h1>
          <p className="text-sm text-(--color-text-secondary) mt-1 max-w-xl">
            Manage your student profile, career tracks, authentication credentials, security sessions, and privacy.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <ButtonSecondary
            onClick={handleExportData}
            disabled={isExporting}
            className="flex items-center gap-2 text-xs h-9"
          >
            <Download className="size-3.5" />
            <span>{isExporting ? "Exporting..." : "Export Data"}</span>
          </ButtonSecondary>
          <ButtonPrimary
            onClick={handleSaveProfile}
            disabled={!isProfileDirty || isSaving}
            className="flex items-center gap-2 text-xs h-9"
          >
            <Check className="size-3.5" />
            <span>{isSaving ? "Saving..." : isProfileDirty ? "Save Changes" : "Saved"}</span>
          </ButtonPrimary>
        </div>
      </div>

      {/* Profile Completion Tracker */}
      <Card className="p-5 bg-(--color-surface-1) border border-(--color-border) relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="relative size-14 shrink-0 flex items-center justify-center">
              <svg className="size-14 -rotate-90">
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-(--color-surface-3)"
                  fill="transparent"
                />
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeDasharray={150.8}
                  strokeDashoffset={150.8 - (150.8 * completionPercent) / 100}
                  className="text-(--color-purple) transition-all duration-700 ease-out"
                  fill="transparent"
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute font-bold text-xs text-(--color-text-primary)">
                {completionPercent}%
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-(--color-text-primary)">
                  Profile Readiness
                </h3>
                {completionPercent === 100 ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-(--color-green-subtle) text-(--color-green) flex items-center gap-1">
                    <CheckCircle2 className="size-3" /> Fully Configured
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-(--color-purple-subtle) text-(--color-purple)">
                    {completedCount} of {completionItems.length} complete
                  </span>
                )}
              </div>
              <p className="text-xs text-(--color-text-secondary) mt-1">
                Your profile informs DSA Club&apos;s adaptive recommendation engine and problem calibration.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {completionItems.map((item, idx) => (
              <span
                key={idx}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors",
                  item.done
                    ? "bg-(--color-surface-2) text-(--color-text-primary) border border-(--color-border)"
                    : "bg-(--color-surface-2)/40 text-(--color-text-muted) border border-dashed border-(--color-border)"
                )}
              >
                {item.done ? (
                  <CheckCircle2 className="size-3 text-(--color-green)" />
                ) : (
                  <div className="size-2 rounded-full bg-(--color-text-muted)" />
                )}
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </Card>

      {/* Identity & Career Target Card */}
      <Card className="p-6 bg-(--color-surface-1) border border-(--color-border) space-y-6">
        <div className="flex items-center justify-between border-b border-(--color-border) pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-(--radius-btn) bg-(--color-purple-subtle) text-(--color-purple)">
              <User className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-(--color-text-primary)">
                Identity & Career Target
              </h2>
              <p className="text-xs text-(--color-text-secondary)">
                Personalize your learner badge, experience baseline, and company track.
              </p>
            </div>
          </div>
          {isProfileDirty && (
            <span className="text-xs font-semibold text-(--color-amber) bg-(--color-amber-subtle) px-2.5 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
              Unsaved changes
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-(--color-text-secondary) block">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Chen"
              maxLength={80}
              className="w-full px-3.5 py-2 rounded-(--radius-btn) bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:outline-hidden focus:border-(--color-purple) transition-colors"
            />
          </div>

          {/* Experience Level */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-(--color-text-secondary) block">
              Experience Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {EXPERIENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCurrentLevel(opt.value)}
                  className={cn(
                    "py-2 px-3 text-xs font-medium rounded-(--radius-btn) border transition-all text-center",
                    currentLevel === opt.value
                      ? "border-(--color-purple) bg-(--color-purple-subtle) text-(--color-purple) font-semibold ring-1 ring-(--color-purple)/50"
                      : "border-(--color-border) bg-(--color-surface-2) text-(--color-text-secondary) hover:border-(--color-border-hover)"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Primary Language */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-(--color-text-secondary) block">
              Primary Language for Solutions
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {LANGUAGE_OPTIONS.map((lang) => (
                <button
                  key={lang.value}
                  type="button"
                  onClick={() => setPrimaryLanguage(lang.value)}
                  className={cn(
                    "py-2 px-2.5 text-xs font-medium rounded-(--radius-btn) border transition-all text-center flex items-center justify-center gap-1.5",
                    primaryLanguage === lang.value
                      ? "border-(--color-purple) bg-(--color-purple-subtle) text-(--color-purple) font-semibold ring-1 ring-(--color-purple)/50"
                      : "border-(--color-border) bg-(--color-surface-2) text-(--color-text-secondary) hover:border-(--color-border-hover)"
                  )}
                >
                  <Code2 className="size-3.5 shrink-0" />
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Career Track & Role */}
          <div className="space-y-3 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-(--color-text-secondary) block">
                Target Company Track
              </label>
              <select
                value={goalTrack}
                onChange={(e) => setGoalTrack(e.target.value)}
                className="w-full px-3.5 py-2 rounded-(--radius-btn) bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text-primary) focus:outline-hidden focus:border-(--color-purple) transition-colors cursor-pointer"
              >
                {CAREER_TRACKS.map((t) => (
                  <option key={t.value} value={t.value} className="bg-(--color-surface-1)">
                    {t.label} — {t.description}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-(--color-text-secondary) block">
                Target Role
              </label>
              <select
                value={goalRole}
                onChange={(e) => setGoalRole(e.target.value)}
                className="w-full px-3.5 py-2 rounded-(--radius-btn) bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text-primary) focus:outline-hidden focus:border-(--color-purple) transition-colors cursor-pointer"
              >
                {TARGET_ROLES.map((r) => (
                  <option key={r.value} value={r.value} className="bg-(--color-surface-1)">
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {isProfileDirty && (
          <div className="flex justify-end pt-2 border-t border-(--color-border)">
            <ButtonPrimary
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="flex items-center gap-2 text-xs"
            >
              <Check className="size-3.5" />
              <span>{isSaving ? "Saving changes..." : "Save Profile Details"}</span>
            </ButtonPrimary>
          </div>
        )}
      </Card>

      {/* Account Credentials & Info */}
      <Card className="p-6 bg-(--color-surface-1) border border-(--color-border) space-y-6">
        <div className="flex items-center gap-3 border-b border-(--color-border) pb-4">
          <div className="p-2 rounded-(--radius-btn) bg-(--color-surface-2) text-(--color-text-primary)">
            <Shield className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-(--color-text-primary)">
              Account Credentials
            </h2>
            <p className="text-xs text-(--color-text-secondary)">
              Manage your email address, login method, and authentication security.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Email row */}
          <div className="p-3.5 rounded-(--radius-btn) bg-(--color-surface-2) border border-(--color-border) flex items-center justify-between">
            <div>
              <span className="text-[11px] text-(--color-text-muted) block">Primary Email</span>
              <span className="font-semibold text-sm text-(--color-text-primary)">
                {user.email ?? "student@dsaclub.io"}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-(--color-green-subtle) text-(--color-green) font-bold text-[10px] flex items-center gap-1">
              <CheckCircle2 className="size-3" /> Verified
            </span>
          </div>

          {/* Account Status row */}
          <div className="p-3.5 rounded-(--radius-btn) bg-(--color-surface-2) border border-(--color-border) flex items-center justify-between">
            <div>
              <span className="text-[11px] text-(--color-text-muted) block">Membership Tier</span>
              <span className="font-semibold text-sm text-(--color-text-primary)">
                Student Full Access
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-(--color-purple-subtle) text-(--color-purple) font-bold text-[10px]">
              Active
            </span>
          </div>

          {/* Auth Method row */}
          <div className="p-3.5 rounded-(--radius-btn) bg-(--color-surface-2) border border-(--color-border) flex items-center justify-between">
            <div>
              <span className="text-[11px] text-(--color-text-muted) block">Sign-in Method</span>
              <span className="font-semibold text-sm text-(--color-text-primary)">
                Password Credentials
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPasswordModalOpen(true)}
              className="text-xs font-semibold text-(--color-purple) hover:underline flex items-center gap-1"
            >
              <KeyRound className="size-3" />
              <span>Change Password</span>
            </button>
          </div>

          {/* Member Since row */}
          <div className="p-3.5 rounded-(--radius-btn) bg-(--color-surface-2) border border-(--color-border) flex items-center justify-between">
            <div>
              <span className="text-[11px] text-(--color-text-muted) block">Member Since</span>
              <span className="font-semibold text-sm text-(--color-text-primary)">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "September 2026"}
              </span>
            </div>
            <span className="text-xs text-(--color-text-muted)">Cohort 2026</span>
          </div>
        </div>
      </Card>

      {/* Active Security Sessions */}
      <Card className="p-6 bg-(--color-surface-1) border border-(--color-border) space-y-4">
        <div className="flex items-center justify-between border-b border-(--color-border) pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-(--radius-btn) bg-(--color-surface-2) text-(--color-text-primary)">
              <Laptop className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-(--color-text-primary)">
                Active Sessions & Devices
              </h2>
              <p className="text-xs text-(--color-text-secondary)">
                Devices currently authenticated with your DSA Club account.
              </p>
            </div>
          </div>
          {!sessionTerminated ? (
            <ButtonSecondary
              onClick={() => {
                setSessionTerminated(true);
                success("All other active device sessions have been revoked.");
              }}
              className="text-xs h-8"
            >
              Sign Out Other Sessions
            </ButtonSecondary>
          ) : (
            <span className="text-xs font-semibold text-(--color-green) flex items-center gap-1">
              <CheckCircle2 className="size-3.5" /> Other sessions revoked
            </span>
          )}
        </div>

        <div className="divide-y divide-(--color-border)/50">
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-(--radius-btn) bg-(--color-surface-2) flex items-center justify-center text-(--color-text-primary)">
                <Laptop className="size-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-(--color-text-primary)">
                    Chrome on Windows (Current Session)
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full bg-(--color-green-subtle) text-(--color-green) text-[9px] font-bold">
                    THIS DEVICE
                  </span>
                </div>
                <p className="text-[11px] text-(--color-text-muted) mt-0.5">
                  IP: 127.0.0.1 · Last active just now
                </p>
              </div>
            </div>
            <span className="text-xs font-medium text-(--color-green)">Active Now</span>
          </div>

          {!sessionTerminated && (
            <div className="py-3 flex items-center justify-between opacity-75">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-(--radius-btn) bg-(--color-surface-2) flex items-center justify-center text-(--color-text-muted)">
                  <Laptop className="size-4" />
                </div>
                <div>
                  <span className="text-xs font-medium text-(--color-text-primary)">
                    Mobile Safari on iPhone
                  </span>
                  <p className="text-[11px] text-(--color-text-muted) mt-0.5">
                    Bengaluru, India · Last active 3 days ago
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSessionTerminated(true);
                  success("Session terminated.");
                }}
                className="text-xs text-(--color-red) hover:underline"
              >
                Revoke
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Data Privacy & Export */}
      <Card className="p-6 bg-(--color-surface-1) border border-(--color-border) space-y-4">
        <div className="flex items-center gap-3 border-b border-(--color-border) pb-4">
          <div className="p-2 rounded-(--radius-btn) bg-(--color-surface-2) text-(--color-text-primary)">
            <Download className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-(--color-text-primary)">
              Data Portability & Local Cache
            </h2>
            <p className="text-xs text-(--color-text-secondary)">
              Export your structured problem history or clear local browser storage.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-(--radius-card) bg-(--color-surface-2)/50 border border-(--color-border) space-y-2">
            <h3 className="text-xs font-semibold text-(--color-text-primary) flex items-center gap-2">
              <Download className="size-4 text-(--color-purple)" />
              Export Learning Portfolio (JSON)
            </h3>
            <p className="text-xs text-(--color-text-secondary) leading-relaxed">
              Download all your code attempts, pattern recognition scores, revision queue items, and profile metadata.
            </p>
            <div className="pt-2">
              <ButtonSecondary
                onClick={handleExportData}
                disabled={isExporting}
                className="w-full text-xs h-8 justify-center"
              >
                {isExporting ? "Compiling JSON..." : "Download JSON Archive"}
              </ButtonSecondary>
            </div>
          </div>

          <div className="p-4 rounded-(--radius-card) bg-(--color-surface-2)/50 border border-(--color-border) space-y-2">
            <h3 className="text-xs font-semibold text-(--color-text-primary) flex items-center gap-2">
              <RotateCcw className="size-4 text-(--color-amber)" />
              Clear Local Browser Storage
            </h3>
            <p className="text-xs text-(--color-text-secondary) leading-relaxed">
              Reset locally cached UI state and draft answers stored in this browser&apos;s local storage.
            </p>
            <div className="pt-2">
              <ButtonSecondary
                onClick={() => {
                  try {
                    localStorage.removeItem("dsa-club-preferences-v2");
                    localStorage.removeItem("dsa-club-ui-state");
                    success("Local browser cache cleared.");
                  } catch (e) {
                    info("Local storage already clean.");
                  }
                }}
                className="w-full text-xs h-8 justify-center text-(--color-text-secondary)"
              >
                Clear Local Storage
              </ButtonSecondary>
            </div>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="p-6 bg-(--color-red-subtle)/20 border border-(--color-red)/40 space-y-4">
        <div className="flex items-center gap-3 border-b border-(--color-red)/30 pb-4">
          <div className="p-2 rounded-(--radius-btn) bg-(--color-red-subtle) text-(--color-red)">
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-(--color-red)">
              Danger Zone
            </h2>
            <p className="text-xs text-(--color-text-secondary)">
              Irreversible actions regarding your learning analytics and account registration.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Reset Learning Data */}
          <div className="p-4 rounded-(--radius-card) bg-(--color-surface-1) border border-(--color-border) space-y-2 flex flex-col justify-between">
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-(--color-text-primary)">
                Reset Learning History
              </h3>
              <p className="text-xs text-(--color-text-secondary) leading-relaxed">
                Wipes out all problem attempts, quiz scores, streaks, revision scheduling, and mission progress back to fresh start.
              </p>
            </div>
            <div className="pt-3">
              <ButtonDanger
                onClick={() => {
                  setResetInput("");
                  setResetModalOpen(true);
                }}
                className="w-full text-xs h-8 justify-center"
              >
                Reset Learning Progress...
              </ButtonDanger>
            </div>
          </div>

          {/* Delete Account */}
          <div className="p-4 rounded-(--radius-card) bg-(--color-surface-1) border border-(--color-border) space-y-2 flex flex-col justify-between">
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-(--color-red)">
                Delete Account
              </h3>
              <p className="text-xs text-(--color-text-secondary) leading-relaxed">
                Permanently deactivates your student account and unlinks your credentials. This action cannot be undone.
              </p>
            </div>
            <div className="pt-3">
              <ButtonDanger
                onClick={() => {
                  setDeleteInput("");
                  setDeleteModalOpen(true);
                }}
                className="w-full text-xs h-8 justify-center bg-(--color-red) hover:bg-(--color-red)/90 text-white"
              >
                Delete My Account...
              </ButtonDanger>
            </div>
          </div>
        </div>
      </Card>

      {/* Change Password Modal */}
      <AnimatePresence>
        {passwordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-(--color-surface-1) border border-(--color-border) rounded-(--radius-card) p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-(--color-border) pb-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="size-4 text-(--color-purple)" />
                  <h3 className="text-sm font-semibold text-(--color-text-primary)">
                    Change Password
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="p-1 rounded text-(--color-text-muted) hover:text-(--color-text-primary)"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-(--color-text-secondary)">
                    Current Password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-(--radius-btn) bg-(--color-surface-2) border border-(--color-border) text-(--color-text-primary) focus:border-(--color-purple)"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-(--color-text-secondary)">
                    New Password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-(--radius-btn) bg-(--color-surface-2) border border-(--color-border) text-(--color-text-primary) focus:border-(--color-purple)"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-(--color-text-secondary)">
                    Confirm New Password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-(--radius-btn) bg-(--color-surface-2) border border-(--color-border) text-(--color-text-primary) focus:border-(--color-purple)"
                  />
                </div>

                {passwordError && (
                  <p className="text-xs text-(--color-red) flex items-center gap-1">
                    <AlertTriangle className="size-3 shrink-0" />
                    {passwordError}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-(--color-text-muted)">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="flex items-center gap-1 hover:text-(--color-text-primary)"
                  >
                    {showPassword ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                    <span>{showPassword ? "Hide passwords" : "Show passwords"}</span>
                  </button>
                  <span className="text-[10px]">Min 8 characters</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-(--color-border)">
                <ButtonSecondary
                  onClick={() => setPasswordModalOpen(false)}
                  className="text-xs h-8"
                >
                  Cancel
                </ButtonSecondary>
                <ButtonPrimary
                  onClick={() => {
                    setPasswordError("");
                    if (!currentPassword) {
                      setPasswordError("Please enter your current password.");
                      return;
                    }
                    if (newPassword.length < 8) {
                      setPasswordError("New password must be at least 8 characters long.");
                      return;
                    }
                    if (newPassword !== confirmPassword) {
                      setPasswordError("New passwords do not match.");
                      return;
                    }
                    setPasswordModalOpen(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    success("Password updated successfully.");
                  }}
                  className="text-xs h-8"
                >
                  Update Password
                </ButtonPrimary>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Learning Modal */}
      <AnimatePresence>
        {resetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-(--color-surface-1) border border-(--color-red)/40 rounded-(--radius-card) p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center gap-2 text-(--color-red)">
                <AlertTriangle className="size-5" />
                <h3 className="text-sm font-semibold">
                  Confirm Reset of Learning Data
                </h3>
              </div>

              <p className="text-xs text-(--color-text-secondary) leading-relaxed">
                This will delete all problem attempts, quiz scores, spaced-repetition schedules, and streaks for your account. This action cannot be undone.
              </p>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-(--color-text-primary) block">
                  To confirm, type <span className="font-mono text-(--color-red) font-bold">RESET</span> below:
                </label>
                <input
                  type="text"
                  value={resetInput}
                  onChange={(e) => setResetInput(e.target.value)}
                  placeholder="RESET"
                  className="w-full px-3 py-2 text-xs font-mono rounded-(--radius-btn) bg-(--color-surface-2) border border-(--color-border) text-(--color-text-primary) focus:border-(--color-red)"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-(--color-border)">
                <ButtonSecondary
                  onClick={() => setResetModalOpen(false)}
                  className="text-xs h-8"
                >
                  Cancel
                </ButtonSecondary>
                <ButtonDanger
                  onClick={handleResetLearning}
                  disabled={resetInput !== "RESET" || isResetting}
                  className="text-xs h-8"
                >
                  {isResetting ? "Resetting..." : "Confirm Reset"}
                </ButtonDanger>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Account Modal */}
      <AnimatePresence>
        {deleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-(--color-surface-1) border border-(--color-red) rounded-(--radius-card) p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center gap-2 text-(--color-red)">
                <Trash2 className="size-5" />
                <h3 className="text-sm font-semibold">
                  Confirm Account Deletion
                </h3>
              </div>

              <p className="text-xs text-(--color-text-secondary) leading-relaxed">
                Your account will be permanently deactivated, anonymized, and signed out. You will lose access to all your progress and configurations.
              </p>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-(--color-text-primary) block">
                  To confirm, type <span className="font-mono text-(--color-red) font-bold">DELETE</span> below:
                </label>
                <input
                  type="text"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-3 py-2 text-xs font-mono rounded-(--radius-btn) bg-(--color-surface-2) border border-(--color-border) text-(--color-text-primary) focus:border-(--color-red)"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-(--color-border)">
                <ButtonSecondary
                  onClick={() => setDeleteModalOpen(false)}
                  className="text-xs h-8"
                >
                  Cancel
                </ButtonSecondary>
                <ButtonDanger
                  onClick={handleDeleteAccount}
                  disabled={deleteInput !== "DELETE" || isDeleting}
                  className="text-xs h-8 bg-(--color-red) text-white"
                >
                  {isDeleting ? "Deleting..." : "Permanently Delete"}
                </ButtonDanger>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
