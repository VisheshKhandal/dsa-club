"use client";

import React, { createContext, useContext, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface LearnerSyncSignal {
  type: "LEARNER_MUTATION_COMMITTED" | "RESET_EPOCH" | "LEARNER_REFRESH_REQUESTED";
  commandId?: string;
  entityType?: string;
  entityId?: string;
  learningEpoch?: number;
  timestamp: number;
}

interface LearnerSyncContextValue {
  broadcastUpdate: (signal: Omit<LearnerSyncSignal, "timestamp">) => void;
  lastSignal: LearnerSyncSignal | null;
}

const LearnerSyncContext = createContext<LearnerSyncContextValue>({
  broadcastUpdate: () => {},
  lastSignal: null,
});

const CHANNEL_NAME = "dsa_learner_sync_v2";
const STORAGE_KEY = "dsa_learner_sync_ping";

export function LearnerSyncProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [lastSignal, setLastSignal] = React.useState<LearnerSyncSignal | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshTimestampRef = useRef<number>(Date.now());

  // Coalesced debounce refresh
  const triggerFreshData = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      lastRefreshTimestampRef.current = Date.now();
      try {
        router.refresh();
      } catch {
        // Safe fallback in test or non-browser environments
      }
    }, 250);
  }, [router]);

  // Handle incoming cross-tab message
  const handleIncomingSignal = useCallback(
    (signal: LearnerSyncSignal) => {
      // Reject stale or self-originated loops if timestamp is too old
      if (!signal || typeof signal.timestamp !== "number") return;
      if (Date.now() - signal.timestamp > 10000) return;

      setLastSignal(signal);
      triggerFreshData();
    },
    [triggerFreshData]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Initialize BroadcastChannel if supported
    if ("BroadcastChannel" in window) {
      try {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channel.onmessage = (event) => {
          if (event.data) {
            handleIncomingSignal(event.data);
          }
        };
        channelRef.current = channel;
      } catch {
        // Fallback to storage events if BroadcastChannel creation fails
      }
    }

    // 2. Storage event fallback for older browsers or if BroadcastChannel is restricted
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue) as LearnerSyncSignal;
          handleIncomingSignal(parsed);
        } catch {
          // Ignore malformed storage payloads
        }
      }
    };
    window.addEventListener("storage", handleStorageEvent);

    // 3. Handle window focus & online events with bounded throttle (30s)
    const handleWindowFocus = () => {
      const now = Date.now();
      if (now - lastRefreshTimestampRef.current > 30000) {
        triggerFreshData();
      }
    };
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("online", handleWindowFocus);

    return () => {
      if (channelRef.current) {
        channelRef.current.close();
        channelRef.current = null;
      }
      window.removeEventListener("storage", handleStorageEvent);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("online", handleWindowFocus);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [handleIncomingSignal, triggerFreshData]);

  // Outbound broadcast
  const broadcastUpdate = useCallback((signal: Omit<LearnerSyncSignal, "timestamp">) => {
    if (typeof window === "undefined") return;
    const fullSignal: LearnerSyncSignal = {
      ...signal,
      timestamp: Date.now(),
    };

    setLastSignal(fullSignal);

    // Send via BroadcastChannel
    if (channelRef.current) {
      try {
        channelRef.current.postMessage(fullSignal);
      } catch {
        // Ignore channel errors
      }
    }

    // Send via storage event fallback
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fullSignal));
    } catch {
      // Ignore localStorage errors (private browsing or quota)
    }
  }, []);

  return (
    <LearnerSyncContext.Provider value={{ broadcastUpdate, lastSignal }}>
      {children}
    </LearnerSyncContext.Provider>
  );
}

export function useLearnerSync() {
  return useContext(LearnerSyncContext);
}
