"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { ButtonPrimary, ButtonSecondary, ButtonDanger } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  usePreferences,
  ThemeMode,
  AccentColor,
  InterfaceDensity,
  UIScale,
  BorderRadius,
  MotionPreference,
  ContrastMode,
  AIMentorDepth,
  DifficultyPreference,
  LearningLoopStrategy,
  RevisionPacing,
  DSAClubPreferences,
} from "@/components/preferences/preferences-provider";
import { updateUserSettingsAction } from "@/features/product/actions/product.actions";
import {
  Palette,
  Sliders,
  Sparkles,
  BookOpen,
  Code2,
  Bell,
  Eye,
  RotateCcw,
  Check,
  ChevronDown,
  Sun,
  Moon,
  Monitor,
  CheckCircle2,
  Clock,
  Compass,
  Laptop,
  Cpu,
  ShieldCheck,
  Zap,
  SlidersHorizontal,
  LayoutTemplate,
  HelpCircle,
  Flame,
  Volume2,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  DAILY_MINUTES_STEPS,
  DIFFICULTY_PREFERENCES,
  LEARNING_FOCUS_OPTIONS,
  getPaceDescription,
} from "../account/account-settings.logic";

export interface SettingsViewProps {
  initialPreferences?: Partial<DSAClubPreferences>;
}

type SettingsSectionId =
  | "appearance"
  | "personalization"
  | "learning"
  | "ai-mentor"
  | "editor"
  | "revision"
  | "notifications"
  | "accessibility";

interface SectionNavItem {
  id: SettingsSectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const SECTION_ITEMS: SectionNavItem[] = [
  { id: "appearance", label: "Appearance & Theme", icon: Palette, description: "Theme mode, 6 accent colors & visual styling" },
  { id: "personalization", label: "Personalization & UI", icon: LayoutTemplate, description: "Density, scale, animations & widget toggles" },
  { id: "learning", label: "Study Cadence & Pace", icon: Clock, description: "Daily minutes, calibration & loop strategy" },
  { id: "ai-mentor", label: "AI Mentor & Intelligence", icon: Sparkles, description: "Guidance depth, hints & explanation mode" },
  { id: "editor", label: "Missions & Code Editor", icon: Code2, description: "Editor theme, font size, tabs & auto-advance" },
  { id: "revision", label: "Spaced Repetition (SRS)", icon: RotateCcw, description: "Review pacing, daily caps & auto-scheduler" },
  { id: "notifications", label: "Notifications & Alerts", icon: Bell, description: "Study reminders, streaks & revision alerts" },
  { id: "accessibility", label: "Accessibility", icon: Eye, description: "Contrast mode, motion & enhanced focus rings" },
];

const ACCENT_COLORS: { id: AccentColor; name: string; hex: string; desc: string }[] = [
  { id: "purple", name: "Electric Violet", hex: "#8B5CF6", desc: "DSA Club Signature" },
  { id: "blue", name: "Cyber Blue", hex: "#3B82F6", desc: "Crisp engineering clarity" },
  { id: "emerald", name: "Emerald Green", hex: "#10B981", desc: "High confidence mastery" },
  { id: "amber", name: "Warm Amber", hex: "#F59E0B", desc: "Focused algorithmic energy" },
  { id: "rose", name: "Neon Rose", hex: "#F43F5E", desc: "Vibrant competitive streak" },
  { id: "cyan", name: "Hyper Cyan", hex: "#06B6D4", desc: "Modern algorithmic terminal" },
];

export function SettingsView({ initialPreferences }: SettingsViewProps) {
  const { success, error: toastError, info } = useToast();
  const { preferences, setPreference, resetCategory, resetAll, isDirty } = usePreferences();
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("appearance");
  const [isSaving, startSaving] = useTransition();
  const [resetAllConfirmOpen, setResetAllConfirmOpen] = useState(false);

  const [mobileCategoryOpen, setMobileCategoryOpen] = useState(false);
  const mobileCategoryRef = useRef<HTMLDivElement>(null);

  // Close mobile category menu when clicking outside or pressing Escape
  useEffect(() => {
    if (!mobileCategoryOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileCategoryOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileCategoryRef.current && !mobileCategoryRef.current.contains(e.target as Node)) {
        setMobileCategoryOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mobileCategoryOpen]);

  const currentCategory = SECTION_ITEMS.find((item) => item.id === activeSection) ?? SECTION_ITEMS[0];
  const CurrentCategoryIcon = currentCategory.icon;

  const paceInfo = getPaceDescription(preferences.dailyMinutes);

  const handleSaveAll = () => {
    startSaving(async () => {
      try {
        await updateUserSettingsAction(preferences as unknown as Record<string, unknown>);
        success("All preferences synchronized and saved successfully.");
      } catch (err: any) {
        toastError(err.message || "Failed to persist preferences.");
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto pb-16 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-(--color-border) pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-(--color-purple) uppercase tracking-wider mb-1">
            <SlidersHorizontal className="size-3.5" />
            <span>Preferences & Control Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-(--color-text-primary)">
            Platform Settings
          </h1>
          <p className="text-sm text-(--color-text-secondary) mt-1 max-w-xl">
            Configure how DSA Club looks and works for you. Appearance changes apply application-wide immediately.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <ButtonSecondary
            onClick={() => setResetAllConfirmOpen(true)}
            className="flex items-center gap-1.5 text-xs h-9"
          >
            <RotateCcw className="size-3.5" />
            <span>Reset Defaults</span>
          </ButtonSecondary>
          <ButtonPrimary
            onClick={handleSaveAll}
            disabled={isSaving}
            className="flex items-center gap-2 text-xs h-9"
          >
            <Check className="size-3.5" />
            <span>{isSaving ? "Saving..." : "Save Preferences"}</span>
          </ButtonPrimary>
        </div>
      </div>

      {/* Mobile Category Selector (<lg): Compact, Non-overlapping, Accessible */}
      <div className="lg:hidden relative" ref={mobileCategoryRef}>
        <div className="text-[11px] font-bold uppercase tracking-wider text-(--color-text-muted) mb-1.5 px-1">
          Current Category
        </div>
        <button
          type="button"
          onClick={() => setMobileCategoryOpen((prev) => !prev)}
          className="w-full min-h-[44px] flex items-center justify-between p-3.5 rounded-(--radius-card) bg-(--color-surface-1) border border-(--color-border) text-left shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-purple)"
          aria-expanded={mobileCategoryOpen}
          aria-haspopup="listbox"
          aria-label="Select settings category"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid size-8 place-items-center rounded-(--radius-btn) bg-(--color-purple-subtle) text-(--color-purple) shrink-0">
              <CurrentCategoryIcon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-(--color-text-primary) truncate">
                {currentCategory.label}
              </div>
              <div className="text-[11px] text-(--color-text-muted) truncate mt-0.5">
                {currentCategory.description}
              </div>
            </div>
          </div>
          <div className="grid size-7 place-items-center rounded-(--radius-btn) bg-(--color-surface-2) text-(--color-text-muted) shrink-0 ml-2">
            <ChevronDown className={cn("size-4 transition-transform duration-200", mobileCategoryOpen && "rotate-180")} />
          </div>
        </button>

        {/* Mobile Category Dropdown / Sheet */}
        <AnimatePresence>
          {mobileCategoryOpen && (
            <>
              {/* Mobile Backdrop */}
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
                onClick={() => setMobileCategoryOpen(false)}
                aria-hidden="true"
              />
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                className="absolute left-0 right-0 top-full mt-2 z-50 rounded-(--radius-card) bg-(--color-surface-1) border border-(--color-border) shadow-2xl p-1.5 max-h-[70vh] overflow-y-auto scrollbar-thin"
                role="listbox"
              >
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-(--color-text-muted) border-b border-(--color-border)/60 mb-1">
                  Select Settings Category
                </div>
                {SECTION_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => {
                        setActiveSection(item.id);
                        setMobileCategoryOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 p-2.5 rounded-(--radius-btn) text-left text-xs transition-all",
                        isActive
                          ? "bg-(--color-purple-subtle) text-(--color-purple) font-semibold"
                          : "text-(--color-text-secondary) hover:text-(--color-text-primary) hover:bg-(--color-surface-2)"
                      )}
                    >
                      <Icon className={cn("size-4 shrink-0", isActive ? "text-(--color-purple)" : "text-(--color-text-muted)")} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{item.label}</div>
                        <div className="text-[10px] text-(--color-text-muted) truncate">{item.description}</div>
                      </div>
                      {isActive && (
                        <Check className="size-4 text-(--color-purple) shrink-0 ml-1" />
                      )}
                    </button>
                  );
                })}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Main Layout: Sticky Sidebar Navigation + Content Panes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Sticky Nav on Desktop (lg+) */}
        <div className="hidden lg:block lg:col-span-4 sticky top-20 z-10 space-y-4">
          <Card className="p-2 bg-(--color-surface-1) border border-(--color-border) space-y-1 shadow-sm">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-(--color-text-muted)">
              Preferences Categories
            </div>
            {SECTION_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-(--radius-btn) text-left text-xs font-medium transition-all group",
                    isActive
                      ? "bg-(--color-purple-subtle) text-(--color-purple) font-semibold border-l-2 border-(--color-purple)"
                      : "text-(--color-text-secondary) hover:text-(--color-text-primary) hover:bg-(--color-surface-2)"
                  )}
                >
                  <Icon className={cn("size-4 shrink-0 transition-colors", isActive ? "text-(--color-purple)" : "text-(--color-text-muted) group-hover:text-(--color-text-primary)")} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{item.label}</div>
                  </div>
                  {isActive && (
                    <motion.div
                      layoutId="activeSettingPill"
                      className="size-1.5 rounded-full bg-(--color-purple) shrink-0"
                    />
                  )}
                </button>
              );
            })}
          </Card>

          {/* Quick Live Preview Widget */}
          <div className="mt-4 p-4 rounded-(--radius-card) bg-(--color-surface-1) border border-(--color-border) space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-(--color-text-primary) flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-(--color-purple)" />
                Live Theme Engine Preview
              </span>
              <span className="text-[10px] uppercase font-bold text-(--color-purple) bg-(--color-purple-subtle) px-2 py-0.5 rounded-full">
                {preferences.accentColor}
              </span>
            </div>
            <div className="p-3 rounded-(--radius-btn) bg-(--color-surface-2) border border-(--color-border) space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-(--color-text-primary)">
                  Sample Component Card
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-(--color-purple) text-white font-semibold">
                  Active
                </span>
              </div>
              <p className="text-[11px] text-(--color-text-secondary) leading-relaxed">
                Tokens dynamically reflect your current accent color, radius, and contrast settings.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  className="px-2.5 py-1 text-xs rounded-(--radius-btn) bg-(--color-purple) text-white font-medium shadow-sm hover:opacity-90"
                >
                  Primary Action
                </button>
                <button
                  type="button"
                  className="px-2.5 py-1 text-xs rounded-(--radius-btn) bg-(--color-surface-1) border border-(--color-border) text-(--color-text-secondary) hover:text-(--color-text-primary)"
                >
                  Secondary
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section Panels */}
        <div className="lg:col-span-8 space-y-6 min-w-0 w-full">
          {/* SECTION 1: APPEARANCE */}
          {activeSection === "appearance" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <Card className="p-6 bg-(--color-surface-1) border border-(--color-border) space-y-6">
                <div className="flex items-center justify-between border-b border-(--color-border) pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-(--radius-btn) bg-(--color-purple-subtle) text-(--color-purple)">
                      <Palette className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-(--color-text-primary)">
                        Theme Mode
                      </h2>
                      <p className="text-xs text-(--color-text-secondary)">
                        Select your preferred brightness scheme. Changes take effect across all views immediately.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => resetCategory("appearance")}
                    className="text-xs text-(--color-text-muted) hover:text-(--color-purple) flex items-center gap-1"
                  >
                    <RotateCcw className="size-3" /> Reset
                  </button>
                </div>

                {/* Theme Mode Tiles */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { mode: "dark" as ThemeMode, label: "Dark Mode", desc: "Low-light engineering focus", icon: Moon },
                    { mode: "light" as ThemeMode, label: "Light Mode", desc: "Clean bright contrast", icon: Sun },
                    { mode: "system" as ThemeMode, label: "System Sync", desc: "Matches operating system", icon: Monitor },
                  ].map((t) => {
                    const Icon = t.icon;
                    const isSelected = preferences.theme === t.mode;
                    return (
                      <button
                        key={t.mode}
                        type="button"
                        onClick={() => setPreference("theme", t.mode)}
                        className={cn(
                          "p-4 rounded-(--radius-card) border text-left transition-all relative overflow-hidden flex flex-col justify-between",
                          isSelected
                            ? "border-(--color-purple) bg-(--color-purple-subtle)/30 ring-2 ring-(--color-purple)/40"
                            : "border-(--color-border) bg-(--color-surface-2) hover:border-(--color-border-hover)"
                        )}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <Icon className={cn("size-5", isSelected ? "text-(--color-purple)" : "text-(--color-text-muted)")} />
                          {isSelected && <CheckCircle2 className="size-4 text-(--color-purple)" />}
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-(--color-text-primary) block">
                            {t.label}
                          </span>
                          <span className="text-[11px] text-(--color-text-secondary) mt-0.5 block">
                            {t.desc}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Accent Color Palette */}
                <div className="space-y-3 pt-4 border-t border-(--color-border)">
                  <div>
                    <h3 className="text-xs font-semibold text-(--color-text-primary)">
                      Accent Color (Signature Highlight)
                    </h3>
                    <p className="text-xs text-(--color-text-secondary)">
                      Select the primary accent color applied across progress bars, active states, buttons, and badges.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {ACCENT_COLORS.map((acc) => {
                      const isSelected = preferences.accentColor === acc.id;
                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => setPreference("accentColor", acc.id)}
                          className={cn(
                            "p-3 rounded-(--radius-card) border text-left transition-all flex items-center gap-3",
                            isSelected
                              ? "border-(--color-purple) bg-(--color-purple-subtle)/30 ring-2 ring-(--color-purple)/40"
                              : "border-(--color-border) bg-(--color-surface-2) hover:border-(--color-border-hover)"
                          )}
                        >
                          <div
                            className="size-5 rounded-full shrink-0 shadow-inner flex items-center justify-center text-white text-[10px]"
                            style={{ backgroundColor: acc.hex }}
                          >
                            {isSelected && <Check className="size-3 stroke-[3]" />}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-(--color-text-primary) block truncate">
                              {acc.name}
                            </span>
                            <span className="text-[10px] text-(--color-text-muted) block truncate">
                              {acc.desc}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Border Radius Selection */}
                <div className="space-y-3 pt-4 border-t border-(--color-border)">
                  <div>
                    <h3 className="text-xs font-semibold text-(--color-text-primary)">
                      Component Border Radius
                    </h3>
                    <p className="text-xs text-(--color-text-secondary)">
                      Controls the corner curvature of cards, buttons, dialogs, and inputs.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "sharp" as BorderRadius, label: "Sharp (4px)", preview: "rounded-xs" },
                      { id: "rounded" as BorderRadius, label: "Rounded (8px)", preview: "rounded-md" },
                      { id: "round" as BorderRadius, label: "Round (14px)", preview: "rounded-xl" },
                    ].map((rad) => {
                      const isSelected = preferences.borderRadius === rad.id;
                      return (
                        <button
                          key={rad.id}
                          type="button"
                          onClick={() => setPreference("borderRadius", rad.id)}
                          className={cn(
                            "p-3 rounded-(--radius-btn) border text-center transition-all",
                            isSelected
                              ? "border-(--color-purple) bg-(--color-purple-subtle)/30 text-(--color-purple) font-semibold ring-1 ring-(--color-purple)"
                              : "border-(--color-border) bg-(--color-surface-2) text-(--color-text-secondary) hover:border-(--color-border-hover)"
                          )}
                        >
                          <div className={cn("size-6 mx-auto mb-1.5 border border-(--color-purple) bg-(--color-purple)/20", rad.preview)} />
                          <span className="text-xs block">{rad.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* SECTION 2: PERSONALIZATION & UI */}
          {activeSection === "personalization" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <Card className="p-6 bg-(--color-surface-1) border border-(--color-border) space-y-6">
                <div className="flex items-center justify-between border-b border-(--color-border) pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-(--radius-btn) bg-(--color-purple-subtle) text-(--color-purple)">
                      <LayoutTemplate className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-(--color-text-primary)">
                        Interface Layout & Density
                      </h2>
                      <p className="text-xs text-(--color-text-secondary)">
                        Tailor data spacing, interface scale, and desktop dashboard widgets.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => resetCategory("interface")}
                    className="text-xs text-(--color-text-muted) hover:text-(--color-purple) flex items-center gap-1"
                  >
                    <RotateCcw className="size-3" /> Reset
                  </button>
                </div>

                {/* Interface Density */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-(--color-text-primary)">
                    Data Display Density
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "compact" as InterfaceDensity, label: "Compact", desc: "Dense data view, tighter padding for power users" },
                      { id: "comfortable" as InterfaceDensity, label: "Comfortable", desc: "Balanced standard layout spacing (Default)" },
                      { id: "spacious" as InterfaceDensity, label: "Spacious", desc: "Relaxed breathing room between elements" },
                    ].map((den) => {
                      const isSelected = preferences.interfaceDensity === den.id;
                      return (
                        <button
                          key={den.id}
                          type="button"
                          onClick={() => setPreference("interfaceDensity", den.id)}
                          className={cn(
                            "p-3 rounded-(--radius-btn) border text-left transition-all",
                            isSelected
                              ? "border-(--color-purple) bg-(--color-purple-subtle)/30 ring-1 ring-(--color-purple)"
                              : "border-(--color-border) bg-(--color-surface-2) hover:border-(--color-border-hover)"
                          )}
                        >
                          <span className="text-xs font-semibold text-(--color-text-primary) block">
                            {den.label}
                          </span>
                          <span className="text-[10px] text-(--color-text-secondary) mt-0.5 block">
                            {den.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* UI Scale */}
                <div className="space-y-3 pt-4 border-t border-(--color-border)">
                  <h3 className="text-xs font-semibold text-(--color-text-primary)">
                    UI Font & View Scaling
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "small" as UIScale, label: "Compact (90%)", desc: "Maximum screen real-estate" },
                      { id: "default" as UIScale, label: "Default (100%)", desc: "Optimized readability" },
                      { id: "large" as UIScale, label: "Large (110%)", desc: "Enhanced legibility & larger tap targets" },
                    ].map((sc) => {
                      const isSelected = preferences.uiScale === sc.id;
                      return (
                        <button
                          key={sc.id}
                          type="button"
                          onClick={() => setPreference("uiScale", sc.id)}
                          className={cn(
                            "p-3 rounded-(--radius-btn) border text-left transition-all",
                            isSelected
                              ? "border-(--color-purple) bg-(--color-purple-subtle)/30 ring-1 ring-(--color-purple)"
                              : "border-(--color-border) bg-(--color-surface-2) hover:border-(--color-border-hover)"
                          )}
                        >
                          <span className="text-xs font-semibold text-(--color-text-primary) block">
                            {sc.label}
                          </span>
                          <span className="text-[10px] text-(--color-text-secondary) mt-0.5 block">
                            {sc.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Motion Preferences */}
                <div className="space-y-3 pt-4 border-t border-(--color-border)">
                  <h3 className="text-xs font-semibold text-(--color-text-primary)">
                    Motion & Micro-interactions
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "full" as MotionPreference, label: "Full Motion", desc: "Smooth spring transitions & layout animations" },
                      { id: "reduced" as MotionPreference, label: "Reduced Motion", desc: "Subtle fades without sliding shifts" },
                      { id: "minimal" as MotionPreference, label: "Instant / None", desc: "No animations, instantaneous changes" },
                    ].map((mot) => {
                      const isSelected = preferences.motionPreference === mot.id;
                      return (
                        <button
                          key={mot.id}
                          type="button"
                          onClick={() => setPreference("motionPreference", mot.id)}
                          className={cn(
                            "p-3 rounded-(--radius-btn) border text-left transition-all",
                            isSelected
                              ? "border-(--color-purple) bg-(--color-purple-subtle)/30 ring-1 ring-(--color-purple)"
                              : "border-(--color-border) bg-(--color-surface-2) hover:border-(--color-border-hover)"
                          )}
                        >
                          <span className="text-xs font-semibold text-(--color-text-primary) block">
                            {mot.label}
                          </span>
                          <span className="text-[10px] text-(--color-text-secondary) mt-0.5 block">
                            {mot.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dashboard Widgets Toggles */}
                <div className="space-y-3 pt-4 border-t border-(--color-border)">
                  <h3 className="text-xs font-semibold text-(--color-text-primary)">
                    Active Dashboard Modules
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { key: "focus" as const, label: "Primary Focus & Next Recommendation" },
                      { key: "activity" as const, label: "Daily Streak & Velocity Calendar" },
                      { key: "radar" as const, label: "Weakness & Pattern Radar" },
                      { key: "achievements" as const, label: "Mastery Milestones & Badges" },
                    ].map((w) => {
                      const enabled = preferences.dashboardWidgets[w.key];
                      return (
                        <div
                          key={w.key}
                          className="flex items-center justify-between p-3 rounded-(--radius-btn) bg-(--color-surface-2) border border-(--color-border)"
                        >
                          <span className="text-xs font-medium text-(--color-text-primary)">
                            {w.label}
                          </span>
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) =>
                              setPreference("dashboardWidgets", {
                                ...preferences.dashboardWidgets,
                                [w.key]: e.target.checked,
                              })
                            }
                            className="accent-(--color-purple) size-4 cursor-pointer"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* SECTION 3: STUDY CADENCE & PACE */}
          {activeSection === "learning" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <Card className="p-6 bg-(--color-surface-1) border border-(--color-border) space-y-6">
                <div className="flex items-center justify-between border-b border-(--color-border) pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-(--radius-btn) bg-(--color-purple-subtle) text-(--color-purple)">
                      <Clock className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-(--color-text-primary)">
                        Daily Study Cadence & Pace
                      </h2>
                      <p className="text-xs text-(--color-text-secondary)">
                        Calibrate your daily commitment, algorithm difficulty, and learning loop philosophy.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => resetCategory("learning")}
                    className="text-xs text-(--color-text-muted) hover:text-(--color-purple) flex items-center gap-1"
                  >
                    <RotateCcw className="size-3" /> Reset
                  </button>
                </div>

                {/* Daily Minutes Slider & Badge */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-(--color-text-primary) block">
                        Daily Study Commitment
                      </span>
                      <span className="text-xs text-(--color-text-secondary)">
                        {paceInfo.pace} · {paceInfo.frequency} ({paceInfo.weeklyHours})
                      </span>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-(--color-purple-subtle) text-(--color-purple) font-bold text-xs">
                      {preferences.dailyMinutes} min / day
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {DAILY_MINUTES_STEPS.map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setPreference("dailyMinutes", mins)}
                        className={cn(
                          "py-2 text-xs font-medium rounded-(--radius-btn) border transition-all text-center",
                          preferences.dailyMinutes === mins
                            ? "border-(--color-purple) bg-(--color-purple-subtle) text-(--color-purple) font-bold ring-1 ring-(--color-purple)"
                            : "border-(--color-border) bg-(--color-surface-2) text-(--color-text-secondary) hover:border-(--color-border-hover)"
                        )}
                      >
                        {mins} min
                      </button>
                    ))}
                  </div>
                </div>

                {/* Daily Reminder Time */}
                <div className="space-y-3 pt-4 border-t border-(--color-border)">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-(--color-text-primary) block">
                        Daily Practice Reminder
                      </span>
                      <span className="text-xs text-(--color-text-secondary)">
                        We&apos;ll alert you to keep your study streak active.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.reminderEnabled}
                      onChange={(e) => setPreference("reminderEnabled", e.target.checked)}
                      className="accent-(--color-purple) size-4 cursor-pointer"
                    />
                  </div>

                  {preferences.reminderEnabled && (
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-(--color-text-secondary)">
                        Reminder Time:
                      </label>
                      <input
                        type="time"
                        value={preferences.reminderTime}
                        onChange={(e) => setPreference("reminderTime", e.target.value)}
                        className="px-3 py-1.5 rounded-(--radius-btn) bg-(--color-surface-2) border border-(--color-border) text-xs text-(--color-text-primary) focus:border-(--color-purple)"
                      />
                    </div>
                  )}
                </div>

                {/* Difficulty Preference */}
                <div className="space-y-3 pt-4 border-t border-(--color-border)">
                  <div>
                    <h3 className="text-xs font-semibold text-(--color-text-primary)">
                      Difficulty Calibration
                    </h3>
                    <p className="text-xs text-(--color-text-secondary)">
                      How aggressively the recommendation system serves higher difficulty tiers.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {DIFFICULTY_PREFERENCES.map((dp) => {
                      const isSelected = preferences.difficultyPreference === dp.value;
                      return (
                        <button
                          key={dp.value}
                          type="button"
                          onClick={() => setPreference("difficultyPreference", dp.value as DifficultyPreference)}
                          className={cn(
                            "p-3.5 rounded-(--radius-card) border text-left transition-all",
                            isSelected
                              ? "border-(--color-purple) bg-(--color-purple-subtle)/30 ring-1 ring-(--color-purple)"
                              : "border-(--color-border) bg-(--color-surface-2) hover:border-(--color-border-hover)"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-(--color-text-primary)">
                              {dp.label}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-(--color-purple-subtle) text-(--color-purple)">
                              {dp.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-(--color-text-secondary) leading-relaxed">
                            {dp.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Learning Loop Strategy */}
                <div className="space-y-3 pt-4 border-t border-(--color-border)">
                  <div>
                    <h3 className="text-xs font-semibold text-(--color-text-primary)">
                      Learning Loop Strategy
                    </h3>
                    <p className="text-xs text-(--color-text-secondary)">
                      Shapes how your daily dashboard prioritizes reading intuition vs raw problem reps.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {LEARNING_FOCUS_OPTIONS.map((lf) => {
                      const isSelected = preferences.learningLoopStrategy === lf.value;
                      return (
                        <button
                          key={lf.value}
                          type="button"
                          onClick={() => setPreference("learningLoopStrategy", lf.value as LearningLoopStrategy)}
                          className={cn(
                            "p-3.5 rounded-(--radius-card) border text-left transition-all",
                            isSelected
                              ? "border-(--color-purple) bg-(--color-purple-subtle)/30 ring-1 ring-(--color-purple)"
                              : "border-(--color-border) bg-(--color-surface-2) hover:border-(--color-border-hover)"
                          )}
                        >
                          <span className="text-xs font-semibold text-(--color-text-primary) block mb-1">
                            {lf.label}
                          </span>
                          <p className="text-[11px] text-(--color-text-secondary) leading-relaxed">
                            {lf.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* SECTION 4: AI MENTOR & INTELLIGENCE */}
          {activeSection === "ai-mentor" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <Card className="p-6 bg-(--color-surface-1) border border-(--color-border) space-y-6">
                <div className="flex items-center justify-between border-b border-(--color-border) pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-(--radius-btn) bg-(--color-purple-subtle) text-(--color-purple)">
                      <Sparkles className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-(--color-text-primary)">
                        DSA Club Intelligence & AI Mentor
                      </h2>
                      <p className="text-xs text-(--color-text-secondary)">
                        Configure pedagogical depth and interactive mentoring behavior during pre-solve and practice.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => resetCategory("ai")}
                    className="text-xs text-(--color-text-muted) hover:text-(--color-purple) flex items-center gap-1"
                  >
                    <RotateCcw className="size-3" /> Reset
                  </button>
                </div>

                {/* Guidance Depth */}
                <div className="space-y-3">
                  <div>
                    <h3 className="text-xs font-semibold text-(--color-text-primary)">
                      AI Mentor Guidance Depth
                    </h3>
                    <p className="text-xs text-(--color-text-secondary)">
                      Choose how the mentor responds when you ask for clarification or hints.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        depth: "concise" as AIMentorDepth,
                        label: "Concise & Fast",
                        desc: "Direct pattern tips, edge cases, and time/space targets without long narratives.",
                      },
                      {
                        depth: "socratic" as AIMentorDepth,
                        label: "Socratic Guided (Recommended)",
                        desc: "Asks clarifying questions to build intuition without spoiling the full solution.",
                      },
                      {
                        depth: "comprehensive" as AIMentorDepth,
                        label: "Deep Explanations",
                        desc: "Full mental models, dry-run walkthroughs, invariant analysis, and trade-offs.",
                      },
                    ].map((g) => {
                      const isSelected = preferences.aiMentorDepth === g.depth;
                      return (
                        <button
                          key={g.depth}
                          type="button"
                          onClick={() => setPreference("aiMentorDepth", g.depth)}
                          className={cn(
                            "p-3.5 rounded-(--radius-card) border text-left transition-all",
                            isSelected
                              ? "border-(--color-purple) bg-(--color-purple-subtle)/30 ring-1 ring-(--color-purple)"
                              : "border-(--color-border) bg-(--color-surface-2) hover:border-(--color-border-hover)"
                          )}
                        >
                          <span className="text-xs font-semibold text-(--color-text-primary) block mb-1">
                            {g.label}
                          </span>
                          <p className="text-[11px] text-(--color-text-secondary) leading-relaxed">
                            {g.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mentor Behavioral Toggles */}
                <div className="space-y-3 pt-4 border-t border-(--color-border)">
                  <h3 className="text-xs font-semibold text-(--color-text-primary)">
                    Automated Intelligence Probes
                  </h3>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between p-3.5 rounded-(--radius-btn) bg-(--color-surface-2) border border-(--color-border)">
                      <div>
                        <span className="text-xs font-semibold text-(--color-text-primary) block">
                          Auto-suggest Hint when Inactive
                        </span>
                        <span className="text-[11px] text-(--color-text-secondary)">
                          If you have paused on a problem for &gt;5 minutes, gently surface a pattern recognition prompt.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.autoSuggestHints}
                        onChange={(e) => setPreference("autoSuggestHints", e.target.checked)}
                        className="accent-(--color-purple) size-4 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* SECTION 5: MISSIONS & CODE EDITOR */}
          {activeSection === "editor" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <Card className="p-6 bg-(--color-surface-1) border border-(--color-border) space-y-6">
                <div className="flex items-center justify-between border-b border-(--color-border) pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-(--radius-btn) bg-(--color-purple-subtle) text-(--color-purple)">
                      <Code2 className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-(--color-text-primary)">
                        Missions & In-Browser Code Editor
                      </h2>
                      <p className="text-xs text-(--color-text-secondary)">
                        Customize the coding workspace, syntax theme, font sizing, and stage transitions.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => resetCategory("editor")}
                    className="text-xs text-(--color-text-muted) hover:text-(--color-purple) flex items-center gap-1"
                  >
                    <RotateCcw className="size-3" /> Reset
                  </button>
                </div>

                {/* Editor Theme & Font Size */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-(--color-text-secondary) block">
                      Code Editor Theme
                    </label>
                    <select
                      value={preferences.codeTheme}
                      onChange={(e) => setPreference("codeTheme", e.target.value as any)}
                      className="w-full px-3 py-2 rounded-(--radius-btn) bg-(--color-surface-2) border border-(--color-border) text-xs text-(--color-text-primary) focus:border-(--color-purple)"
                    >
                      <option value="vs-dark">VS Code Dark</option>
                      <option value="one-dark">One Dark Pro</option>
                      <option value="monokai">Monokai Algorithmic</option>
                      <option value="slate-light">Clean Slate Light</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-(--color-text-secondary) block">
                      Editor Font Size ({preferences.codeFontSize}px)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[13, 14, 16].map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setPreference("codeFontSize", sz)}
                          className={cn(
                            "py-1.5 text-xs font-medium rounded-(--radius-btn) border transition-all text-center",
                            preferences.codeFontSize === sz
                              ? "border-(--color-purple) bg-(--color-purple-subtle) text-(--color-purple) font-bold"
                              : "border-(--color-border) bg-(--color-surface-2) text-(--color-text-secondary)"
                          )}
                        >
                          {sz}px
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tab Size & Word Wrap */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-(--color-text-secondary) block">
                      Tab Indentation
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[2, 4].map((tb) => (
                        <button
                          key={tb}
                          type="button"
                          onClick={() => setPreference("codeTabSize", tb)}
                          className={cn(
                            "py-1.5 text-xs font-medium rounded-(--radius-btn) border transition-all text-center",
                            preferences.codeTabSize === tb
                              ? "border-(--color-purple) bg-(--color-purple-subtle) text-(--color-purple) font-bold"
                              : "border-(--color-border) bg-(--color-surface-2) text-(--color-text-secondary)"
                          )}
                        >
                          {tb} spaces
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-(--radius-btn) bg-(--color-surface-2) border border-(--color-border) self-end">
                    <div>
                      <span className="text-xs font-medium text-(--color-text-primary) block">
                        Soft Word Wrap
                      </span>
                      <span className="text-[10px] text-(--color-text-muted)">
                        Wrap long code lines without horizontal scrolling
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.codeWordWrap}
                      onChange={(e) => setPreference("codeWordWrap", e.target.checked)}
                      className="accent-(--color-purple) size-4 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Mission & Practice Behavior */}
                <div className="space-y-2.5 pt-4 border-t border-(--color-border)">
                  <h3 className="text-xs font-semibold text-(--color-text-primary)">
                    Mission & Drill Automation
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-(--radius-btn) bg-(--color-surface-2) border border-(--color-border)">
                      <div>
                        <span className="text-xs font-medium text-(--color-text-primary) block">
                          Auto-Advance Mission Stages
                        </span>
                        <span className="text-[10px] text-(--color-text-muted)">
                          Automatically scroll to and activate the next learning stage upon completing current drill.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.missionAutoAdvance}
                        onChange={(e) => setPreference("missionAutoAdvance", e.target.checked)}
                        className="accent-(--color-purple) size-4 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-(--radius-btn) bg-(--color-surface-2) border border-(--color-border)">
                      <div>
                        <span className="text-xs font-medium text-(--color-text-primary) block">
                          Auto-Start Stopwatch on Problem Load
                        </span>
                        <span className="text-[10px] text-(--color-text-muted)">
                          Begin elapsed time tracking automatically when opening an interview problem.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.practiceTimerAutoStart}
                        onChange={(e) => setPreference("practiceTimerAutoStart", e.target.checked)}
                        className="accent-(--color-purple) size-4 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* SECTION 6: SPACED REPETITION (SRS) */}
          {activeSection === "revision" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <Card className="p-6 bg-(--color-surface-1) border border-(--color-border) space-y-6">
                <div className="flex items-center justify-between border-b border-(--color-border) pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-(--radius-btn) bg-(--color-purple-subtle) text-(--color-purple)">
                      <RotateCcw className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-(--color-text-primary)">
                        Spaced Repetition Engine (SRS)
                      </h2>
                      <p className="text-xs text-(--color-text-secondary)">
                        Configure review intervals, daily capacity caps, and automatic recall scheduling.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => resetCategory("revision")}
                    className="text-xs text-(--color-text-muted) hover:text-(--color-purple) flex items-center gap-1"
                  >
                    <RotateCcw className="size-3" /> Reset
                  </button>
                </div>

                {/* Revision Pacing */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-(--color-text-primary)">
                    Recall Scheduling Multiplier
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: "relaxed" as RevisionPacing, label: "Relaxed (1.5x Intervals)", desc: "Longer intervals between reviews; recommended for students with high baseline memory." },
                      { id: "standard" as RevisionPacing, label: "Standard SM-2 (1.0x)", desc: "Scientifically calibrated spaced repetition interval curve for peak retention." },
                      { id: "accelerated" as RevisionPacing, label: "Accelerated (0.7x)", desc: "More frequent drills; ideal if preparing for an immediate interview in 2-4 weeks." },
                    ].map((rp) => {
                      const isSelected = preferences.revisionPacing === rp.id;
                      return (
                        <button
                          key={rp.id}
                          type="button"
                          onClick={() => setPreference("revisionPacing", rp.id)}
                          className={cn(
                            "p-3.5 rounded-(--radius-card) border text-left transition-all",
                            isSelected
                              ? "border-(--color-purple) bg-(--color-purple-subtle)/30 ring-1 ring-(--color-purple)"
                              : "border-(--color-border) bg-(--color-surface-2) hover:border-(--color-border-hover)"
                          )}
                        >
                          <span className="text-xs font-semibold text-(--color-text-primary) block mb-1">
                            {rp.label}
                          </span>
                          <p className="text-[11px] text-(--color-text-secondary) leading-relaxed">
                            {rp.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Daily Cap & Auto Schedule */}
                <div className="space-y-3 pt-4 border-t border-(--color-border)">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-(--color-text-primary) block">
                        Maximum Due Items Per Day
                      </span>
                      <span className="text-xs text-(--color-text-secondary)">
                        Prevents revision backlog pile-up on busy days.
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[5, 10, 15, 20].map((cap) => (
                        <button
                          key={cap}
                          type="button"
                          onClick={() => setPreference("dailyRevisionCap", cap)}
                          className={cn(
                            "px-2.5 py-1 text-xs font-medium rounded-(--radius-btn) border transition-all",
                            preferences.dailyRevisionCap === cap
                              ? "border-(--color-purple) bg-(--color-purple-subtle) text-(--color-purple) font-bold"
                              : "border-(--color-border) bg-(--color-surface-2) text-(--color-text-secondary)"
                          )}
                        >
                          {cap}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-(--radius-btn) bg-(--color-surface-2) border border-(--color-border) mt-3">
                    <div>
                      <span className="text-xs font-medium text-(--color-text-primary) block">
                        Auto-schedule Solved Problems into SRS
                      </span>
                      <span className="text-[11px] text-(--color-text-muted)">
                        Every problem you solve in practice will be scheduled for a 24h retention check automatically.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.autoScheduleSolved}
                      onChange={(e) => setPreference("autoScheduleSolved", e.target.checked)}
                      className="accent-(--color-purple) size-4 cursor-pointer"
                    />
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* SECTION 7: NOTIFICATIONS */}
          {activeSection === "notifications" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <Card className="p-6 bg-(--color-surface-1) border border-(--color-border) space-y-6">
                <div className="flex items-center justify-between border-b border-(--color-border) pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-(--radius-btn) bg-(--color-purple-subtle) text-(--color-purple)">
                      <Bell className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-(--color-text-primary)">
                        Notifications & Alerts
                      </h2>
                      <p className="text-xs text-(--color-text-secondary)">
                        Select what triggers notifications in your header and browser.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => resetCategory("notifications")}
                    className="text-xs text-(--color-text-muted) hover:text-(--color-purple) flex items-center gap-1"
                  >
                    <RotateCcw className="size-3" /> Reset
                  </button>
                </div>

                <div className="space-y-3">
                  {[
                    { key: "studyReminders" as const, title: "Daily Study Reminders", desc: "Notification at your configured reminder hour if daily goal not reached" },
                    { key: "revisionAlerts" as const, title: "Spaced Repetition Drills Due", desc: "Alerts when scheduled problems or pattern flashcards are ready for review" },
                    { key: "missionMilestones" as const, title: "Mission Completion & Mastery Badges", desc: "Alerts when you master a pattern or unlock topic readiness" },
                    { key: "recommendations" as const, title: "Pattern & Problem Recommendations", desc: "Intelligent suggestions for next patterns, problems, and mocks based on your weak areas" },
                    { key: "weeklyReports" as const, title: "Weekly Progress Intelligence Summary", desc: "Weekly review of solved problems, velocity, and weaknesses repaired" },
                    { key: "achievementAlerts" as const, title: "Achievement & Streak Celebrations", desc: "Popups celebrating consecutive study streak milestones (7, 14, 30 days)" },
                    { key: "companyPrepUpdates" as const, title: "Target Company Prep Updates", desc: "Notifies when new interview questions for your selected company track are added" },
                    { key: "systemAlerts" as const, title: "Product & System Announcements", desc: "Product updates, feature releases, and learning platform improvements" },
                  ].map((n) => {
                    const enabled = preferences.notifications[n.key];
                    return (
                      <div
                        key={n.key}
                        className="flex items-center justify-between p-3.5 rounded-(--radius-btn) bg-(--color-surface-2) border border-(--color-border)"
                      >
                        <div>
                          <span className="text-xs font-semibold text-(--color-text-primary) block">
                            {n.title}
                          </span>
                          <span className="text-[11px] text-(--color-text-secondary) mt-0.5 block">
                            {n.desc}
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) =>
                            setPreference("notifications", {
                              ...preferences.notifications,
                              [n.key]: e.target.checked,
                            })
                          }
                          className="accent-(--color-purple) size-4 cursor-pointer"
                        />
                      </div>
                    );
                  })}
                </div>
              </Card>
            </motion.div>
          )}

          {/* SECTION 8: ACCESSIBILITY */}
          {activeSection === "accessibility" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <Card className="p-6 bg-(--color-surface-1) border border-(--color-border) space-y-6">
                <div className="flex items-center justify-between border-b border-(--color-border) pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-(--radius-btn) bg-(--color-purple-subtle) text-(--color-purple)">
                      <Eye className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-(--color-text-primary)">
                        Accessibility & Legibility
                      </h2>
                      <p className="text-xs text-(--color-text-secondary)">
                        Visual contrast, keyboard focus indicators, and vestibular motion adjustments.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => resetCategory("accessibility")}
                    className="text-xs text-(--color-text-muted) hover:text-(--color-purple) flex items-center gap-1"
                  >
                    <RotateCcw className="size-3" /> Reset
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3.5 rounded-(--radius-btn) bg-(--color-surface-2) border border-(--color-border)">
                    <div>
                      <span className="text-xs font-semibold text-(--color-text-primary) block">
                        High Contrast Mode
                      </span>
                      <span className="text-[11px] text-(--color-text-secondary)">
                        Boosts borders, separator lines, and text contrast across dark and light surfaces.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.contrast === "high"}
                      onChange={(e) => setPreference("contrast", e.target.checked ? "high" : "normal")}
                      className="accent-(--color-purple) size-4 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-(--radius-btn) bg-(--color-surface-2) border border-(--color-border)">
                    <div>
                      <span className="text-xs font-semibold text-(--color-text-primary) block">
                        Enhanced Keyboard Focus Rings
                      </span>
                      <span className="text-[11px] text-(--color-text-secondary)">
                        Displays a prominent high-visibility outline on all focused inputs, buttons, and code tabs.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.enhancedFocusRings}
                      onChange={(e) => setPreference("enhancedFocusRings", e.target.checked)}
                      className="accent-(--color-purple) size-4 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-(--radius-btn) bg-(--color-surface-2) border border-(--color-border)">
                    <div>
                      <span className="text-xs font-semibold text-(--color-text-primary) block">
                        Reduced Motion (Vestibular Safety)
                      </span>
                      <span className="text-[11px] text-(--color-text-secondary)">
                        Disables parallax effects, sliding sheet transitions, and animated card lifts.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.motionPreference === "reduced" || preferences.reducedMotion}
                      onChange={(e) => {
                        setPreference("reducedMotion", e.target.checked);
                        setPreference("motionPreference", e.target.checked ? "reduced" : "full");
                      }}
                      className="accent-(--color-purple) size-4 cursor-pointer"
                    />
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Bottom Save / Status Bar */}
          <div className="flex items-center justify-between p-4 rounded-(--radius-card) bg-(--color-surface-1) border border-(--color-border)">
            <div className="flex items-center gap-2">
              {isDirty ? (
                <>
                  <span className="size-2 rounded-full bg-(--color-amber) animate-pulse" />
                  <span className="text-xs font-medium text-(--color-amber)">
                    Unsaved preference changes
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4 text-(--color-green)" />
                  <span className="text-xs font-medium text-(--color-text-secondary)">
                    All preferences synchronized
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <ButtonSecondary
                onClick={() => setResetAllConfirmOpen(true)}
                className="text-xs h-8"
              >
                Reset All
              </ButtonSecondary>
              <ButtonPrimary
                onClick={handleSaveAll}
                disabled={isSaving}
                className="text-xs h-8"
              >
                {isSaving ? "Saving..." : "Save Preferences"}
              </ButtonPrimary>
            </div>
          </div>
        </div>
      </div>

      {/* Reset All Modal Confirmation */}
      <AnimatePresence>
        {resetAllConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-(--color-surface-1) border border-(--color-border) rounded-(--radius-card) p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-2 text-(--color-purple)">
                <RotateCcw className="size-5" />
                <h3 className="text-sm font-semibold text-(--color-text-primary)">
                  Reset All Preferences to Default?
                </h3>
              </div>
              <p className="text-xs text-(--color-text-secondary) leading-relaxed">
                This will reset your theme, accent color, study cadence, AI mentor depth, and code editor settings back to DSA Club standard defaults.
              </p>
              <div className="flex justify-end gap-2 pt-3 border-t border-(--color-border)">
                <ButtonSecondary
                  onClick={() => setResetAllConfirmOpen(false)}
                  className="text-xs h-8"
                >
                  Cancel
                </ButtonSecondary>
                <ButtonPrimary
                  onClick={() => {
                    resetAll();
                    setResetAllConfirmOpen(false);
                    success("Preferences have been reset to DSA Club defaults.");
                  }}
                  className="text-xs h-8"
                >
                  Confirm Reset
                </ButtonPrimary>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
