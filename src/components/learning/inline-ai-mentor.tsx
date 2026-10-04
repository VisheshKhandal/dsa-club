"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Brain,
  Sparkles,
  Send,
  ChevronDown,
  ChevronUp,
  Bot,
  User,
  Loader2,
  ArrowRight,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface InlineAIMentorProps {
  missionId?: string;
  missionTitle?: string;
  problemId?: string;
  problemTitle?: string;
  patternName?: string;
  difficulty?: string;
  topicName?: string;
  stageTitle?: string;
  stageKind?: string;
  className?: string;
  buttonLabel?: string;
}

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function InlineAIMentor({
  missionId,
  missionTitle,
  problemId,
  problemTitle,
  patternName,
  difficulty,
  topicName,
  stageTitle,
  stageKind,
  className,
  buttonLabel,
}: InlineAIMentorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorState, setErrorState] = useState<{ message: string; prompt: string } | null>(null);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: "nearest" });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isLoading, isStreaming, errorState, isOpen, scrollToBottom]);

  const contextualPrompts = problemTitle
    ? [
        "Give me a hint without spoiling the solution",
        "What algorithmic invariant applies here?",
        "Help me dry run an edge case",
        "Explain the time and space trade-off",
      ]
    : [
        `Explain ${stageTitle || "this concept"} simply`,
        "What are common mistakes to watch for?",
        "Give me an intuitive mental model or analogy",
        "Walk me through a step-by-step example",
      ];

  const handleSend = async (questionText: string) => {
    const text = questionText.trim();
    if (!text || isLoading) return;

    // 1. Immediately show user's message in the chat
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
            problemId,
            problem: problemTitle,
            pattern: patternName,
            difficulty,
            topic: topicName,
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

  const handleRetry = () => {
    if (errorState?.prompt && !isLoading) {
      const promptToRetry = errorState.prompt;
      setErrorState(null);
      handleSend(promptToRetry);
    }
  };

  return (
    <div className={cn("mt-6 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]", className)}>
      {/* Collapsed Trigger Banner */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex w-full items-center justify-between px-4 py-3.5 text-left text-xs text-purple-200/80 transition duration-150 hover:bg-purple-400/[0.05] hover:text-white"
        >
          <div className="flex items-center gap-2.5">
            <span className="grid size-6 place-items-center rounded-lg bg-purple-400/15 text-purple-300 transition group-hover:scale-105">
              <Brain size={13} />
            </span>
            <span className="font-medium text-[13px]">
              {buttonLabel ? (
                buttonLabel
              ) : (
                <>
                  Confused? <span className="text-purple-300 font-semibold">Ask DSA Club Intelligence</span>
                </>
              )}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 font-semibold text-purple-300 transition-transform group-hover:translate-x-0.5">
            {buttonLabel ? <ChevronDown size={14} /> : <>Explore guidance <ArrowRight size={13} /></>}
          </span>
        </button>
      )}

      {/* Expanded Inline Assistant Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-purple-400/20 bg-gradient-to-b from-[#0e071c] to-[#070311]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.07] bg-white/[0.02] px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="relative grid size-7 place-items-center rounded-lg bg-purple-400/15 text-purple-300">
                  <Brain size={15} />
                  {isLoading && (
                    <motion.span
                      className="absolute -inset-0.5 rounded-lg bg-purple-400/20 blur-[2px]"
                      animate={shouldReduceMotion ? {} : { opacity: [0.3, 0.8, 0.3] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    DSA Club Intelligence
                    <span className="rounded-full bg-cyan-400/10 border border-cyan-400/25 px-1.5 py-0.2 text-[9px] font-medium text-cyan-300">
                      {problemTitle ? "Problem Mentor" : "Inline Stage Guide"}
                    </span>
                  </h4>
                  <p className="text-[10px] text-purple-100/40">
                    Focused on {problemTitle || stageTitle || stageKind || "this lesson"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-purple-100/40 hover:bg-white/[0.05] hover:text-white transition"
                title="Collapse AI assistant"
              >
                <ChevronUp size={16} />
              </button>
            </div>

            {/* Content / Messages */}
            <div className="p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="space-y-3 py-2">
                  <p className="text-xs text-purple-100/60 leading-relaxed">
                    Have questions about {problemTitle ? "this problem" : "this stage"}? Choose a quick question below or ask your own:
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {contextualPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handleSend(prompt)}
                        disabled={isLoading}
                        className="rounded-lg border border-purple-400/20 bg-purple-400/[0.04] p-2.5 text-left text-xs font-medium text-purple-200 transition hover:border-purple-400/40 hover:bg-purple-400/[0.08] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Sparkles size={12} className="inline mr-1.5 text-cyan-300" />
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  ref={scrollContainerRef}
                  className="max-h-80 space-y-3 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10"
                >
                  {messages.map((msg, idx) => {
                    const isUser = msg.role === "user";
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "flex gap-2.5 text-xs leading-relaxed",
                          isUser ? "flex-row-reverse" : "flex-row"
                        )}
                      >
                        <div
                          className={cn(
                            "grid size-6 shrink-0 place-items-center rounded-full text-[10px]",
                            isUser
                              ? "bg-purple-500/20 text-purple-300"
                              : "bg-cyan-500/20 text-cyan-300"
                          )}
                        >
                          {isUser ? <User size={11} /> : <Bot size={11} />}
                        </div>
                        <div
                          className={cn(
                            "max-w-[85%] rounded-xl px-3.5 py-2.5",
                            isUser
                              ? "bg-purple-500/15 text-purple-100 border border-purple-400/20"
                              : "bg-white/[0.04] text-purple-100/85 border border-white/[0.06] whitespace-pre-wrap"
                          )}
                        >
                          {msg.content}
                        </div>
                      </div>
                    );
                  })}

                  {/* Clear AI thinking / generating state */}
                  <AnimatePresence>
                    {isLoading && !isStreaming && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                        transition={{
                          duration: shouldReduceMotion ? 0.1 : 0.25,
                          ease: "easeOut",
                        }}
                        className="flex gap-2.5 text-xs leading-relaxed"
                        aria-live="polite"
                        aria-label="DSA Club Intelligence is thinking"
                      >
                        {/* Glowing/breathing AI avatar */}
                        <div className="relative grid size-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-purple-500/25 via-cyan-500/25 to-purple-600/30 text-cyan-300 border border-cyan-400/30 shadow-[0_0_12px_rgba(34,211,238,0.2)]">
                          <motion.span
                            className="absolute -inset-0.5 rounded-full bg-cyan-400/25 blur-[2px]"
                            animate={
                              shouldReduceMotion
                                ? {}
                                : {
                                    opacity: [0.35, 0.8, 0.35],
                                    scale: [0.95, 1.15, 0.95],
                                  }
                            }
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                          />
                          <Bot size={11} className="relative z-10" />
                        </div>

                        {/* Thinking container with continuous staggered pulse */}
                        <div className="max-w-[85%] rounded-xl px-3.5 py-2.5 bg-white/[0.04] text-purple-100 border border-purple-400/25 shadow-[0_2px_12px_rgba(168,85,247,0.06)] backdrop-blur-sm space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold tracking-wide text-purple-200/90 flex items-center gap-1.5">
                              DSA Club Intelligence is thinking
                            </span>

                            {/* Staggered pulsing dots */}
                            <div className="flex items-center gap-1 pl-0.5">
                              {[0, 1, 2].map((i) => (
                                <motion.span
                                  key={i}
                                  className="size-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-purple-400 shadow-[0_0_6px_rgba(34,211,238,0.5)]"
                                  animate={
                                    shouldReduceMotion
                                      ? { opacity: 0.75 }
                                      : {
                                          y: [0, -3, 0],
                                          opacity: [0.35, 1, 0.35],
                                          scale: [0.85, 1.2, 0.85],
                                        }
                                  }
                                  transition={{
                                    duration: 0.9,
                                    repeat: Infinity,
                                    delay: i * 0.18,
                                    ease: "easeInOut",
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-[10px] text-purple-200/40 leading-tight">
                            Analyzing lesson context and generating explanation...
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Error / Retry State */}
                  <AnimatePresence>
                    {errorState && !isLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.2 }}
                        className="rounded-xl border border-rose-500/25 bg-rose-500/[0.07] px-3.5 py-2.5 text-xs text-rose-200 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-medium text-rose-200">
                            <AlertCircle size={13} className="text-rose-400 shrink-0" />
                            <span>DSA Club Intelligence could not respond</span>
                          </div>
                          {errorState.prompt && (
                            <button
                              type="button"
                              onClick={handleRetry}
                              className="focus-ring inline-flex items-center gap-1 rounded-md bg-rose-400/20 hover:bg-rose-400/30 px-2 py-1 text-[10px] font-semibold text-rose-100 transition"
                            >
                              <RotateCcw size={10} />
                              Retry
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-rose-200/70">
                          {errorState.message}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* Input row */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isLoading || !input.trim()) return;
                  handleSend(input);
                }}
                className="flex items-center gap-2 pt-1 border-t border-white/[0.05]"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    isLoading
                      ? "DSA Club Intelligence is working on the response..."
                      : problemTitle
                      ? "Ask a question about this problem or hint..."
                      : `Ask a question about ${stageTitle || "this stage"}...`
                  }
                  disabled={isLoading}
                  className={cn(
                    "flex-1 rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-xs text-white placeholder:text-purple-100/30 outline-none transition focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/10",
                    isLoading && "opacity-60 cursor-not-allowed placeholder:text-purple-300/40"
                  )}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  aria-label={isLoading ? "DSA Club Intelligence is thinking..." : "Send question"}
                  title={isLoading ? "DSA Club Intelligence is thinking..." : "Send question"}
                  className="focus-ring grid size-8 place-items-center rounded-lg bg-gradient-to-r from-purple-500 to-violet-500 text-white transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 size={13} className="animate-spin text-purple-200" />
                  ) : (
                    <Send size={13} />
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

