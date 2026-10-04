"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX, CheckCircle, Timer } from "lucide-react";
import { recordCompletedFocusSessionAction } from "@/features/product/actions/product.actions";

interface PomodoroFocusWidgetProps {
  defaultMinutes?: number;
  targetTitle?: string;
  missionId?: string;
  topicId?: string;
  onSessionLogged?: () => void;
  embedded?: boolean;
}

export function PomodoroFocusWidget({
  defaultMinutes = 25,
  targetTitle = "Deep Work Session",
  missionId,
  topicId,
  onSessionLogged,
  embedded = false,
}: PomodoroFocusWidgetProps) {
  const [selectedMinutes, setSelectedMinutes] = useState(defaultMinutes);
  const [secondsRemaining, setSecondsRemaining] = useState(defaultMinutes * 60);
  const [isActive, setIsActive] = useState(false);
  const [isAmbientPlaying, setIsAmbientPlaying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambientOscRef = useRef<OscillatorNode | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);

  // Initialize or update duration when preset changes (if not running)
  const handleSelectPreset = (mins: number) => {
    if (isActive) return;
    setSelectedMinutes(mins);
    setSecondsRemaining(mins * 60);
    setIsCompleted(false);
  };

  // Web Audio subtle 432Hz binaural drone
  const toggleAmbientSound = useCallback(() => {
    if (isAmbientPlaying) {
      // Stop
      try {
        if (ambientGainRef.current && audioCtxRef.current) {
          ambientGainRef.current.gain.exponentialRampToValueAtTime(0.0001, audioCtxRef.current.currentTime + 0.5);
          setTimeout(() => {
            ambientOscRef.current?.stop();
            audioCtxRef.current?.close();
            audioCtxRef.current = null;
            ambientOscRef.current = null;
            ambientGainRef.current = null;
          }, 500);
        }
      } catch {}
      setIsAmbientPlaying(false);
    } else {
      // Start
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(432, ctx.currentTime);

        // Soft exponential fade in
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.015, ctx.currentTime + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        ambientOscRef.current = osc;
        ambientGainRef.current = gain;
        setIsAmbientPlaying(true);
      } catch {
        setIsAmbientPlaying(false);
      }
    }
  }, [isAmbientPlaying]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      try {
        ambientOscRef.current?.stop();
        audioCtxRef.current?.close();
      } catch {}
    };
  }, []);

  const handleFinishSession = useCallback(async () => {
    const elapsedSeconds = selectedMinutes * 60 - secondsRemaining;
    if (elapsedSeconds < 30) return;
    setIsSubmitting(true);
    try {
      await recordCompletedFocusSessionAction({
        plannedMinutes: selectedMinutes,
        focusedSeconds: elapsedSeconds,
        missionId,
        topicId,
      });
      setIsCompleted(true);
      onSessionLogged?.();
    } catch {
      // silent fallback
    } finally {
      setIsSubmitting(false);
    }
  }, [missionId, onSessionLogged, secondsRemaining, selectedMinutes, topicId]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => prev - 1);
      }, 1000);
    } else if (secondsRemaining <= 0 && isActive) {
      setIsActive(false);
      setIsCompleted(true);
      void handleFinishSession();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [handleFinishSession, isActive, secondsRemaining]);

  const handleReset = () => {
    setIsActive(false);
    setSecondsRemaining(selectedMinutes * 60);
    setIsCompleted(false);
  };

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const progressPercent = Math.min(100, Math.max(0, Math.round(((selectedMinutes * 60 - secondsRemaining) / (selectedMinutes * 60)) * 100)));

  return (
    <div className={embedded ? "relative overflow-hidden border-t border-(--color-border) p-5 sm:p-6 lg:border-t-0 lg:border-l lg:pl-6" : "relative overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface-1) p-5 sm:p-6 transition-all"}>
      <div className={`flex flex-wrap items-center justify-between gap-3 pb-3 ${embedded ? "" : "border-b border-(--border-subtle)"}`}>
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-lg bg-(--accent-lime)/15 text-(--accent-lime)">
            <Timer size={15} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-(--accent-lime)">Pomodoro Engine</p>
            <h4 className="text-sm font-bold text-(--text-primary)">Quick Focus Session</h4>
          </div>
        </div>

        {/* Preset selector */}
        <div className="flex items-center gap-1 rounded-lg border border-(--border-subtle) bg-(--bg-surface-raised) p-1">
          {[15, 25, 45].map((m) => (
            <button
              key={m}
              type="button"
              disabled={isActive}
              onClick={() => handleSelectPreset(m)}
              className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                selectedMinutes === m
                  ? "border border-(--accent-lime)/50 bg-(--accent-lime)/15 text-(--accent-lime)"
                  : "text-(--text-muted) hover:text-(--text-primary)"
              }`}
            >
              {m}m
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center justify-center text-center">
        <p className="max-w-xs truncate text-xs font-medium text-(--text-secondary)">
          {targetTitle}
        </p>

        {/* Big Countdown Display */}
        <div className="relative my-3 flex items-center justify-center">
          <span className="font-mono text-4xl sm:text-5xl font-extrabold tracking-tight tabular-nums text-(--text-primary)">
            {timeFormatted}
          </span>
        </div>

        {/* Subtle Progress Bar */}
        <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-(--bg-surface-raised)">
          <div
            className="h-full bg-(--accent-lime) transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Controls */}
        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsActive((prev) => !prev)}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-5 text-xs font-bold transition shadow-sm ${
              isActive
                ? "border border-amber-500/40 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                : "bg-(--accent-lime) text-black font-semibold hover:bg-(--accent-lime)/90"
            }`}
          >
            {isActive ? <><Pause size={14} fill="currentColor" /> Pause</> : <><Play size={14} fill="currentColor" /> Start Focus</>}
          </button>

          <button
            type="button"
            onClick={handleReset}
            title="Reset timer"
            className="grid size-10 place-items-center rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) text-(--text-muted) hover:text-(--text-primary)"
          >
            <RotateCcw size={15} />
          </button>

          <button
            type="button"
            onClick={toggleAmbientSound}
            title={isAmbientPlaying ? "Mute 432Hz ambient sound" : "Play 432Hz ambient focus sound"}
            className={`grid size-10 place-items-center rounded-xl border transition ${
              isAmbientPlaying
                ? "border-(--accent-lime)/50 bg-(--accent-lime)/15 text-(--accent-lime)"
                : "border-(--border-subtle) bg-(--bg-surface-raised) text-(--text-muted) hover:text-(--text-primary)"
            }`}
          >
            {isAmbientPlaying ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          {secondsRemaining < selectedMinutes * 60 - 30 && (
            <button
              type="button"
              onClick={handleFinishSession}
              disabled={isSubmitting}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
            >
              <CheckCircle size={14} />
              <span>Log</span>
            </button>
          )}
        </div>

        {isCompleted && (
          <p className="mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            Session logged! +{Math.round(selectedMinutes * 2)} XP awarded. Keep the momentum going!
          </p>
        )}
      </div>
    </div>
  );
}
