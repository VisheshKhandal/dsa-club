"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Brain,
  ChevronRight,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface AILearningDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  missionId?: string;
  missionTitle?: string;
  stageTitle?: string;
  stageKind?: string;
  topicName?: string;
}

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function AILearningDrawer({
  isOpen,
  onClose,
  missionId,
  missionTitle,
  stageTitle,
  stageKind,
  topicName,
}: AILearningDrawerProps) {
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
      // Autofocus input when drawer opens
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

  const contextualPrompts = [
    `Explain ${stageTitle || "this concept"} simply`,
    "What are common pitfalls or edge cases?",
    "Give me an intuitive mental model or analogy",
    "Walk me through a step-by-step example",
  ];

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
            missionId,
            mission: missionTitle,
            topic: topicName,
            stageTitle,
            stageKind,
          },
          history: messages,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to contact learning mentor");
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("No readable stream received from assistant");
      }

      setIsLoading(false);
      setIsStreaming(true);

      const decoder = new TextDecoder();
      let streamedAnswer = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        streamedAnswer += chunk;

        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: streamedAnswer };
          return next;
        });
      }

      setIsStreaming(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setErrorState({ message: msg, prompt: text });
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Slide-over Drawer Panel */}
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-drawer-title"
            initial={shouldReduceMotion ? undefined : { x: "100%" }}
            animate={{ x: 0 }}
            exit={shouldReduceMotion ? undefined : { x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-(--color-border) bg-(--color-bg) shadow-2xl"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-(--color-border) px-5 py-4 bg-(--color-surface-1)">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-(--color-purple-subtle) text-(--color-purple)">
                  <Brain size={16} />
                </div>
                <div>
                  <h2 id="ai-drawer-title" className="text-sm font-bold text-(--color-text-primary)">
                    DSA Club Intelligence
                  </h2>
                  <p className="text-[11px] text-(--color-text-muted) truncate max-w-[240px]">
                    {stageTitle || missionTitle || "Learning Mentor"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close intelligence drawer"
                className="focus-ring rounded-lg p-1.5 text-(--color-text-muted) hover:bg-(--color-surface-2) hover:text-(--color-text-primary) transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Chat Body / Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
              {messages.length === 0 ? (
                <div className="space-y-6 pt-4">
                  <div className="text-center space-y-2">
                    <Sparkles size={24} className="mx-auto text-(--color-purple)" />
                    <h3 className="text-sm font-semibold text-(--color-text-primary)">
                      How can I help you understand this stage?
                    </h3>
                    <p className="text-xs text-(--color-text-muted) max-w-xs mx-auto leading-relaxed">
                      Ask about intuitions, invariants, proof strategies, or edge cases. Your reading position remains saved.
                    </p>
                  </div>

                  {/* Contextual starter prompts */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-(--color-text-muted) px-1">
                      Suggested Questions
                    </p>
                    <div className="space-y-1.5">
                      {contextualPrompts.map((prompt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSend(prompt)}
                          className="group flex w-full items-center justify-between rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-1) px-3 py-2 text-left text-xs font-medium text-(--color-text-secondary) hover:border-(--color-purple)/40 hover:bg-(--color-surface-2) hover:text-(--color-text-primary) transition-all"
                        >
                          <span className="truncate pr-2">{prompt}</span>
                          <ChevronRight size={12} className="text-(--color-text-muted) group-hover:text-(--color-purple) shrink-0 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex gap-3 text-xs sm:text-[13px] leading-relaxed",
                      m.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {m.role === "assistant" && (
                      <div className="flex size-6 shrink-0 select-none items-center justify-center rounded-full bg-(--color-purple-subtle) text-(--color-purple) mt-0.5">
                        <Bot size={13} />
                      </div>
                    )}

                    <div
                      className={cn(
                        "rounded-xl px-3.5 py-2.5 max-w-[85%]",
                        m.role === "user"
                          ? "bg-(--color-purple) text-white font-medium shadow-xs"
                          : "bg-(--color-surface-1) border border-(--color-border) text-(--color-text-primary) whitespace-pre-wrap leading-[1.6]"
                      )}
                    >
                      {m.content}
                    </div>

                    {m.role === "user" && (
                      <div className="flex size-6 shrink-0 select-none items-center justify-center rounded-full bg-(--color-surface-2) text-(--color-text-muted) mt-0.5">
                        <User size={13} />
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* Thinking / Streaming Indicator */}
              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-(--color-text-muted) pt-1">
                  <div className="flex size-6 items-center justify-center rounded-full bg-(--color-purple-subtle) text-(--color-purple)">
                    <Loader2 size={13} className="animate-spin" />
                  </div>
                  <span>Thinking...</span>
                </div>
              )}

              {/* Error state */}
              {errorState && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.06] p-3 text-xs text-red-300">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1.5">
                    <p>{errorState.message}</p>
                    <button
                      type="button"
                      onClick={() => handleSend(errorState.prompt)}
                      className="inline-flex items-center gap-1 font-semibold text-red-200 hover:underline"
                    >
                      <RotateCcw size={11} />
                      <span>Retry</span>
                    </button>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="border-t border-(--color-border) bg-(--color-surface-1) p-3 flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about this stage..."
                disabled={isLoading || isStreaming}
                className="flex-1 rounded-(--radius-btn) border border-(--color-border) bg-(--color-surface-2) px-3 py-2 text-xs text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:border-(--color-purple) focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading || isStreaming}
                aria-label="Send message"
                className="flex size-8 items-center justify-center rounded-(--radius-btn) bg-(--color-purple) text-white hover:bg-(--color-purple)/90 transition-colors disabled:opacity-40 disabled:pointer-events-none shrink-0"
              >
                <Send size={13} />
              </button>
            </form>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
