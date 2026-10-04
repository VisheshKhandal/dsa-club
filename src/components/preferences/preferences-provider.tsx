"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type ThemeMode = "dark" | "light" | "system";
export type AccentColor = "purple" | "blue" | "emerald" | "amber" | "rose" | "cyan";
export type InterfaceDensity = "compact" | "comfortable" | "spacious";
export type UIScale = "small" | "default" | "large";
export type BorderRadius = "sharp" | "rounded" | "round";
export type MotionPreference = "full" | "reduced" | "minimal";
export type ContrastMode = "normal" | "high";
export type AIMentorDepth = "concise" | "socratic" | "comprehensive";
export type RevisionPacing = "standard" | "accelerated" | "relaxed";
export type DifficultyPreference = "adaptive" | "gentle" | "stretch";
export type LearningLoopStrategy = "balanced" | "concept_first" | "practice_heavy";

export interface DSAClubPreferences {
  // Appearance
  theme: ThemeMode;
  accentColor: AccentColor;
  contrast: ContrastMode;
  borderRadius: BorderRadius;

  // Personalization & Interface
  interfaceDensity: InterfaceDensity;
  uiScale: UIScale;
  motionPreference: MotionPreference;
  sidebarBehavior: "expanded" | "collapsed" | "remember";
  dashboardWidgets: {
    focus: boolean;
    activity: boolean;
    radar: boolean;
    achievements: boolean;
    recentEvidence: boolean;
  };

  // Learning & Recommendations
  dailyMinutes: number;
  reminderTime: string;
  reminderEnabled: boolean;
  difficultyPreference: DifficultyPreference;
  learningLoopStrategy: LearningLoopStrategy;
  practiceIntensity: "normal" | "intensive";

  // AI Mentor
  aiMentorDepth: AIMentorDepth;
  autoSuggestHints: boolean;

  // Missions & Practice Environment
  missionAutoAdvance: boolean;
  practiceTimerAutoStart: boolean;
  codeLanguage: "cpp" | "python" | "java" | "javascript";
  codeFontSize: number;
  codeTheme: "vs-dark" | "one-dark" | "monokai" | "slate-light";
  codeTabSize: number;
  codeWordWrap: boolean;
  codeAutoFormat: boolean;

  // Spaced Repetition
  revisionPacing: RevisionPacing;
  autoScheduleSolved: boolean;
  dailyRevisionCap: number; // 0 = unlimited

  // Notifications
  notifications: {
    studyReminders: boolean;
    revisionAlerts: boolean;
    missionMilestones: boolean;
    weeklyReports: boolean;
    achievementAlerts: boolean;
    companyPrepUpdates: boolean;
    recommendations: boolean;
    systemAlerts: boolean;
  };

  // Accessibility
  reducedMotion: boolean;
  highContrast: boolean;
  enhancedFocusRings: boolean;
}

export const DEFAULT_PREFERENCES: DSAClubPreferences = {
  theme: "dark",
  accentColor: "purple",
  contrast: "normal",
  borderRadius: "rounded",

  interfaceDensity: "comfortable",
  uiScale: "default",
  motionPreference: "full",
  sidebarBehavior: "remember",
  dashboardWidgets: {
    focus: true,
    activity: true,
    radar: true,
    achievements: true,
    recentEvidence: true,
  },

  dailyMinutes: 30,
  reminderTime: "19:00",
  reminderEnabled: true,
  difficultyPreference: "adaptive",
  learningLoopStrategy: "balanced",
  practiceIntensity: "normal",

  aiMentorDepth: "socratic",
  autoSuggestHints: true,

  missionAutoAdvance: true,
  practiceTimerAutoStart: true,
  codeLanguage: "cpp",
  codeFontSize: 14,
  codeTheme: "vs-dark",
  codeTabSize: 2,
  codeWordWrap: true,
  codeAutoFormat: true,

  revisionPacing: "standard",
  autoScheduleSolved: true,
  dailyRevisionCap: 15,

  notifications: {
    studyReminders: true,
    revisionAlerts: true,
    missionMilestones: true,
    weeklyReports: true,
    achievementAlerts: true,
    companyPrepUpdates: false,
    recommendations: true,
    systemAlerts: true,
  },

  reducedMotion: false,
  highContrast: false,
  enhancedFocusRings: true,
};

export function isNotificationTypeAllowed(type: string, preferences?: DSAClubPreferences["notifications"]): boolean {
  if (!preferences) return true;
  switch (type) {
    case "revision_due":
      return preferences.revisionAlerts ?? true;
    case "achievement":
      return preferences.achievementAlerts ?? preferences.missionMilestones ?? true;
    case "recommendation":
      return preferences.recommendations ?? true;
    case "plan_ready":
    case "streak_risk":
      return preferences.studyReminders ?? true;
    case "system":
      return preferences.systemAlerts ?? true;
    default:
      return true;
  }
}

const STORAGE_KEY = "dsa-club-preferences-v2";

export function applyPreferencesToDOM(prefs: DSAClubPreferences) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // 1. Resolve Theme
  let resolvedTheme = prefs.theme;
  if (resolvedTheme === "system") {
    resolvedTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  root.setAttribute("data-theme", resolvedTheme);
  if (resolvedTheme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
  }
  try {
    localStorage.setItem("theme", resolvedTheme);
  } catch {}

  // 2. Accent Color
  root.setAttribute("data-accent", prefs.accentColor);

  // 3. Density
  root.setAttribute("data-density", prefs.interfaceDensity);

  // 4. UI Scale
  root.setAttribute("data-ui-scale", prefs.uiScale);

  // 5. Border Radius
  root.setAttribute("data-radius", prefs.borderRadius);

  // 6. Contrast
  const activeContrast = prefs.highContrast || prefs.contrast === "high" ? "high" : "normal";
  root.setAttribute("data-contrast", activeContrast);

  // 7. Motion
  const activeMotion = prefs.reducedMotion || prefs.motionPreference === "reduced" ? "reduced" : prefs.motionPreference;
  root.setAttribute("data-motion", activeMotion);
}

interface PreferencesContextType {
  preferences: DSAClubPreferences;
  updatePreference: <K extends keyof DSAClubPreferences>(key: K, value: DSAClubPreferences[K]) => void;
  setPreference: <K extends keyof DSAClubPreferences>(key: K, value: DSAClubPreferences[K]) => void;
  updateNestedPreference: <
    Section extends "dashboardWidgets" | "notifications",
    Key extends keyof DSAClubPreferences[Section]
  >(
    section: Section,
    key: Key,
    value: DSAClubPreferences[Section][Key]
  ) => void;
  resetCategory: (
    category:
      | "appearance"
      | "personalization"
      | "interface"
      | "learning"
      | "ai"
      | "practice"
      | "editor"
      | "revision"
      | "notifications"
      | "accessibility"
  ) => void;
  resetAllPreferences: () => void;
  resetAll: () => void;
  isDirty: boolean;
  isHydrated: boolean;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<DSAClubPreferences>(DEFAULT_PREFERENCES);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const merged: DSAClubPreferences = {
          ...DEFAULT_PREFERENCES,
          ...parsed,
          dashboardWidgets: {
            ...DEFAULT_PREFERENCES.dashboardWidgets,
            ...(parsed.dashboardWidgets || {}),
          },
          notifications: {
            ...DEFAULT_PREFERENCES.notifications,
            ...(parsed.notifications || {}),
          },
        };
        setPreferences(merged);
        applyPreferencesToDOM(merged);
      } else {
        applyPreferencesToDOM(DEFAULT_PREFERENCES);
      }
    } catch {
      applyPreferencesToDOM(DEFAULT_PREFERENCES);
    }
    setIsHydrated(true);
  }, []);

  // System theme listener when in system mode
  useEffect(() => {
    if (preferences.theme !== "system") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      applyPreferencesToDOM(preferences);
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [preferences]);

  // Save changes & apply to DOM
  const saveAndApply = useCallback((updated: DSAClubPreferences) => {
    setPreferences(updated);
    applyPreferencesToDOM(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }, []);

  const updatePreference = useCallback(
    <K extends keyof DSAClubPreferences>(key: K, value: DSAClubPreferences[K]) => {
      setPreferences((prev) => {
        const next = { ...prev, [key]: value };
        // Sync mutual flags
        if (key === "reducedMotion") {
          next.motionPreference = value ? "reduced" : "full";
        }
        if (key === "highContrast") {
          next.contrast = value ? "high" : "normal";
        }
        saveAndApply(next);
        return next;
      });
    },
    [saveAndApply]
  );

  const updateNestedPreference = useCallback(
    <
      Section extends "dashboardWidgets" | "notifications",
      Key extends keyof DSAClubPreferences[Section]
    >(
      section: Section,
      key: Key,
      value: DSAClubPreferences[Section][Key]
    ) => {
      setPreferences((prev) => {
        const next = {
          ...prev,
          [section]: {
            ...prev[section],
            [key]: value,
          },
        };
        saveAndApply(next);
        return next;
      });
    },
    [saveAndApply]
  );

  const resetCategory = useCallback(
    (
      category:
        | "appearance"
        | "personalization"
        | "interface"
        | "learning"
        | "ai"
        | "practice"
        | "editor"
        | "revision"
        | "notifications"
        | "accessibility"
    ) => {
      setPreferences((prev) => {
        let next = { ...prev };
        switch (category) {
          case "appearance":
            next = {
              ...next,
              theme: DEFAULT_PREFERENCES.theme,
              accentColor: DEFAULT_PREFERENCES.accentColor,
              contrast: DEFAULT_PREFERENCES.contrast,
              borderRadius: DEFAULT_PREFERENCES.borderRadius,
            };
            break;
          case "personalization":
          case "interface":
            next = {
              ...next,
              interfaceDensity: DEFAULT_PREFERENCES.interfaceDensity,
              uiScale: DEFAULT_PREFERENCES.uiScale,
              motionPreference: DEFAULT_PREFERENCES.motionPreference,
              sidebarBehavior: DEFAULT_PREFERENCES.sidebarBehavior,
              dashboardWidgets: { ...DEFAULT_PREFERENCES.dashboardWidgets },
            };
            break;
          case "learning":
            next = {
              ...next,
              dailyMinutes: DEFAULT_PREFERENCES.dailyMinutes,
              reminderTime: DEFAULT_PREFERENCES.reminderTime,
              reminderEnabled: DEFAULT_PREFERENCES.reminderEnabled,
              difficultyPreference: DEFAULT_PREFERENCES.difficultyPreference,
              learningLoopStrategy: DEFAULT_PREFERENCES.learningLoopStrategy,
              practiceIntensity: DEFAULT_PREFERENCES.practiceIntensity,
            };
            break;
          case "ai":
            next = {
              ...next,
              aiMentorDepth: DEFAULT_PREFERENCES.aiMentorDepth,
              autoSuggestHints: DEFAULT_PREFERENCES.autoSuggestHints,
            };
            break;
          case "practice":
          case "editor":
            next = {
              ...next,
              missionAutoAdvance: DEFAULT_PREFERENCES.missionAutoAdvance,
              practiceTimerAutoStart: DEFAULT_PREFERENCES.practiceTimerAutoStart,
              codeLanguage: DEFAULT_PREFERENCES.codeLanguage,
              codeFontSize: DEFAULT_PREFERENCES.codeFontSize,
              codeTheme: DEFAULT_PREFERENCES.codeTheme,
              codeTabSize: DEFAULT_PREFERENCES.codeTabSize,
              codeWordWrap: DEFAULT_PREFERENCES.codeWordWrap,
              codeAutoFormat: DEFAULT_PREFERENCES.codeAutoFormat,
            };
            break;
          case "revision":
            next = {
              ...next,
              revisionPacing: DEFAULT_PREFERENCES.revisionPacing,
              autoScheduleSolved: DEFAULT_PREFERENCES.autoScheduleSolved,
              dailyRevisionCap: DEFAULT_PREFERENCES.dailyRevisionCap,
            };
            break;
          case "notifications":
            next = {
              ...next,
              notifications: { ...DEFAULT_PREFERENCES.notifications },
            };
            break;
          case "accessibility":
            next = {
              ...next,
              reducedMotion: DEFAULT_PREFERENCES.reducedMotion,
              highContrast: DEFAULT_PREFERENCES.highContrast,
              enhancedFocusRings: DEFAULT_PREFERENCES.enhancedFocusRings,
            };
            break;
        }
        saveAndApply(next);
        return next;
      });
    },
    [saveAndApply]
  );

  const resetAllPreferences = useCallback(() => {
    saveAndApply({ ...DEFAULT_PREFERENCES });
  }, [saveAndApply]);

  const isDirty = React.useMemo(() => {
    return JSON.stringify(preferences) !== JSON.stringify(DEFAULT_PREFERENCES);
  }, [preferences]);

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        updatePreference,
        setPreference: updatePreference,
        updateNestedPreference,
        resetCategory,
        resetAllPreferences,
        resetAll: resetAllPreferences,
        isDirty,
        isHydrated,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return ctx;
}
