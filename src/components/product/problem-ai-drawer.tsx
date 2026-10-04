"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Brain,
  ChevronRight,
  Compass,
  Lightbulb,
  Loader2,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  User,
  X,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ProblemAIDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  problemId: string;
  problemTitle: string;
  summary?: string;
  patternName?: string;
  difficulty?: string;
  topicName?: string;
  activePhase?: number;
  thinkingDirection?: string;
  hintsRevealed?: number;
  userPrediction?: string;
  userReasoning?: string;
}

type Message = {
  role: "user" | "assistant";
  content: string;
};

interface HintLevel {
  level: number;
  label: string;
  prompt: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: string;
}

const HINT_LADDER: HintLevel[] = [
  {
    level: 1,
    label: "Reflection Question",
    prompt: "Ask me a leading question about the core invariant or constraint of this problem without giving any answers.",
    icon: Brain,
    tone: "text-cyan-300 border-cyan-400/30 bg-cyan-400/10 hover:bg-cyan-400/20",
  },
  {
    level: 2,
    label: "Conceptual Hint",
    prompt: "Give me a high-level conceptual hint. What pattern or relationship should I be thinking about?",
    icon: Lightbulb,
    tone: "text-amber-300 border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20",
  },
  {
    level: 3,
    label: "Small Direction",
    prompt: "Suggest one small directional step. Which element, pointer, or state should I consider tracking?",
    icon: Compass,
    tone: "text-[var(--accent-lime,#B7F36B)] border-[var(--accent-lime,#B7F36B)]/30 bg-[var(--accent-lime,#B7F36B)]/10 hover:bg-[var(--accent-lime,#B7F36B)]/20",
  },
  {
    level: 4,
    label: "Mini Example",
    prompt: "Provide a tiny 3-element example and ask me what the next valid state should look like.",
    icon: Zap,
    tone: "text-emerald-300 border-emerald-400/30 bg-emerald-400/10 hover:bg-emerald-400/20",
  },
  {
    level: 5,
    label: "Dry Run Challenge",
    prompt: "Walk through a potential edge case (e.g. empty, duplicate, or single element) and challenge my assumptions.",
    icon: Play,
    tone: "text-fuchsia-300 border-fuchsia-400/30 bg-fuchsia-400/10 hover:bg-fuchsia-400/20",
  },
  {
    level: 6,
    label: "Algorithm Outline",
    prompt: "Outline the high-level algorithmic steps in plain English without writing the actual code.",
    icon: Sparkles,
    tone: "text-indigo-300 border-indigo-400/30 bg-indigo-400/10 hover:bg-indigo-400/20",
  },
];

export function ProblemAIDrawer({
  isOpen,
  onClose,
  problemId,
  problemTitle,
  summary,
  patternName,
  difficulty,
  topicName,
  activePhase = 1,
  thinkingDirection,
  hintsRevealed = 0,
  userPrediction,
  userReasoning,
}: ProblemAIDrawerProps) {
  const shouldReduceMotion = useReducedMotion();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorState, setErrorState] = useState<{ message: string; prompt: string } | null>(null);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: "nearest" });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [messages, isLoading, isStreaming, errorState, isOpen, scrollToBottom]);

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSend = async (questionText: string) => {
    const text = questionText.trim();
    if (!text || isLoading) return;

    const updatedMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(updatedMessages);
    setIsLoading(true);
    setIsStreaming(false);
    setErrorState(null);
    setInput("");

    try {
      const res = await fetch("/api/ai/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: text,
          context: {
            problemId,
            problem: problemTitle,
            pattern: patternName,
            difficulty,
            topic: topicName,
            description: summary,
            learningGoal: thinkingDirection,
            phase: activePhase,
            hintsRevealed,
            userPrediction,
            userReasoning,
          },
          history: messages,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${res.status}`);
      }

      if (!res.body) {
        throw new Error("No response received from DSA Club Intelligence");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantResponse = "";
      let hasStartedStreaming = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          assistantResponse += chunk;
          if (!hasStartedStreaming) {
            hasStartedStreaming = true;
            setIsStreaming(true);
          }
          setMessages([...updatedMessages, { role: "assistant", content: assistantResponse }]);
        }
      }

      if (!assistantResponse.trim()) {
        throw new Error("Received an empty response from DSA Club Intelligence. Please try again.");
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Connection lost. Please try again.";
      setErrorState({
        message: errorMsg,
        prompt: text,
      });
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            aria-hidden="true"
          />

          {/* Slide-over Drawer */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { x: "100%" }}
            animate={shouldReduceMotion ? { opacity: 1 } : { x: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative w-full max-w-lg bg-[#0B0F14] border-l border-white/[0.1] shadow-2xl flex flex-col h-full z-10"
          >
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between bg-gradient-to-b from-white/[0.03] to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 place-items-center rounded-xl bg-[var(--accent-lime,#B7F36B)]/15 border border-[var(--accent-lime,#B7F36B)]/30 text-[var(--accent-lime,#B7F36B)] shadow-sm">
                  <Bot size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      DSA Club Intelligence
                    </h3>
                    <span className="rounded-full bg-[var(--accent-lime,#B7F36B)]/15 border border-[var(--accent-lime,#B7F36B)]/30 px-2 py-0.5 text-[9px] font-bold text-[var(--accent-lime,#B7F36B)] uppercase tracking-wide">
                      Guided Learning
                    </span>
                  </div>
                  <p className="text-[11px] text-(--color-text-muted) truncate max-w-[260px] sm:max-w-[320px]">
                    {problemTitle} · Phase {activePhase}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setMessages([]);
                      setErrorState(null);
                    }}
                    title="Reset conversation"
                    className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition"
                  >
                    <RotateCcw size={15} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition"
                  aria-label="Close mentor drawer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 scrollbar-thin">
              {messages.length === 0 ? (
                /* Empty / Welcome State with Socratic Hint Ladder */
                <div className="space-y-5 pt-2">
                  <div className="rounded-2xl border border-[var(--accent-lime,#B7F36B)]/25 bg-[var(--accent-lime,#B7F36B)]/[0.03] p-4 text-center space-y-2">
                    <div className="inline-grid size-10 place-items-center rounded-xl bg-[var(--accent-lime,#B7F36B)]/15 border border-[var(--accent-lime,#B7F36B)]/30 text-[var(--accent-lime,#B7F36B)] mx-auto">
                      <Sparkles size={20} />
                    </div>
                    <h4 className="text-sm font-bold text-white">How can I guide your reasoning?</h4>
                    <p className="text-xs text-(--color-text-muted) leading-relaxed max-w-sm mx-auto">
                      I will guide you step-by-step to the solution through leading questions, counterexamples, and invariants — never dumping the final code prematurely.
                    </p>
                  </div>

                  {/* Socratic Hint Ladder Chips */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-[var(--accent-lime,#B7F36B)] uppercase tracking-wider block px-1">
                      Progressive Hint Ladder
                    </span>
                    <div className="grid gap-2">
                      {HINT_LADDER.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.level}
                            type="button"
                            onClick={() => handleSend(item.prompt)}
                            disabled={isLoading}
                            className={cn(
                              "flex items-center justify-between gap-3 p-2.5 rounded-xl border text-left transition group",
                              item.tone
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="font-mono text-[10px] font-bold rounded-md bg-white/10 px-1.5 py-0.5 shrink-0">
                                L{item.level}
                              </span>
                              <Icon size={14} className="shrink-0" />
                              <span className="text-xs font-semibold truncate">{item.label}</span>
                            </div>
                            <ArrowRight size={12} className="shrink-0 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* Conversation Message Stream */
                <div className="space-y-4">
                  {messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex gap-2.5 text-xs leading-relaxed",
                        m.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      {m.role === "assistant" && (
                        <div className="grid size-6 shrink-0 place-items-center rounded-lg bg-[var(--accent-lime,#B7F36B)]/15 border border-[var(--accent-lime,#B7F36B)]/30 text-[var(--accent-lime,#B7F36B)] mt-0.5">
                          <Bot size={13} />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl p-3.5 shadow-sm",
                          m.role === "user"
                            ? "bg-[var(--accent-lime,#B7F36B)] text-[#0B0F14] font-medium rounded-tr-xs"
                            : "bg-white/[0.04] border border-white/[0.08] text-white/90 rounded-tl-xs whitespace-pre-wrap"
                        )}
                      >
                        {m.content}
                      </div>
                      {m.role === "user" && (
                        <div className="grid size-6 shrink-0 place-items-center rounded-lg bg-white/10 text-white mt-0.5">
                          <User size={12} />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Loading / Streaming State */}
                  {isLoading && !isStreaming && (
                    <div className="flex items-center gap-2 text-xs text-white/60 p-2">
                      <Loader2 size={14} className="animate-spin text-[var(--accent-lime,#B7F36B)]" />
                      <span>Formulating guided response...</span>
                    </div>
                  )}

                  {/* Error State */}
                  {errorState && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start gap-2">
                      <AlertCircle size={15} className="shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p>{errorState.message}</p>
                        <button
                          type="button"
                          onClick={() => handleSend(errorState.prompt)}
                          className="mt-2 inline-flex items-center gap-1 font-semibold text-rose-200 underline hover:no-underline"
                        >
                          Retry this question
                        </button>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Hint Ladder Quick Bar (When in active chat) */}
            {messages.length > 0 && (
              <div className="px-4 py-2 border-t border-white/[0.06] bg-white/[0.01] flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <span className="text-[10px] text-white/40 uppercase font-semibold shrink-0 mr-1">
                  Next Hint:
                </span>
                {HINT_LADDER.slice(0, 4).map((item) => (
                  <button
                    key={item.level}
                    type="button"
                    onClick={() => handleSend(item.prompt)}
                    disabled={isLoading}
                    className="shrink-0 text-[10px] font-semibold px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.1] text-white/80 hover:bg-white/[0.08] transition disabled:opacity-40"
                  >
                    L{item.level}: {item.label}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <div className="p-3 sm:p-4 border-t border-white/[0.08] bg-black/40">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend(input);
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question or explain what you noticed..."
                  disabled={isLoading}
                  className="flex-1 rounded-xl border border-white/[0.1] bg-white/[0.03] px-3.5 py-2.5 text-xs text-white placeholder:text-white/30 outline-none transition focus:border-[var(--accent-lime,#B7F36B)] focus:ring-2 focus:ring-[var(--accent-lime,#B7F36B)]/20 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="grid size-10 place-items-center rounded-xl bg-[var(--accent-lime,#B7F36B)] text-[#0B0F14] shadow-md hover:bg-[var(--accent-lime,#B7F36B)]/90 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0 font-bold"
                  aria-label="Send message"
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
