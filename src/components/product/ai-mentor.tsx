"use client";

import { useState, useRef, useEffect } from "react";
import { Brain, Sparkles, Loader2, ChevronDown, ChevronUp, Bot, User, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type AIMentorContext = {
  problemId?: string;
  problem?: string;
  missionId?: string;
  mission?: string;
  topicId?: string;
  topicSlug?: string;
  topic?: string;
  pattern?: string;
  difficulty?: string;
  description?: string;
  learningGoal?: string;
  reflection?: string;
  sourceUrl?: string;
};

type Message = {
  role: "user" | "assistant";
  content: string;
};

const SUGGESTED_ACTIONS = [
  "Give me a hint",
  "Explain again simply",
  "Explain complexity",
  "Guide me through a dry run",
  "What are common mistakes?",
  "Give a stronger hint",
];

export function AIMentorPanel({ context }: { context: AIMentorContext }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleAction = async (actionText: string) => {
    if (!actionText.trim() || isLoading) return;
    
    const newMessages = [...messages, { role: "user" as const, content: actionText }];
    setMessages([...newMessages, { role: "assistant", content: "" }]);
    setIsLoading(true);
    setCustomInput("");

    try {
      const res = await fetch("/api/ai/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionText, context, history: messages }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned ${res.status}`);
      }
      
      if (!res.body) throw new Error("No response body received");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          assistantMsg += chunk;
          setMessages([...newMessages, { role: "assistant", content: assistantMsg }]);
        }
      }
      
      if (!assistantMsg.trim()) {
        throw new Error("Received an empty response from the AI provider. Please try again.");
      }
    } catch (err: any) {
      console.error("AI Mentor fetch error:", err);
      setMessages([...newMessages, { role: "assistant", content: `Error: ${err.message || "I'm having trouble connecting right now."}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  const content = (
    <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:bottom-6 right-3 sm:right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95, pointerEvents: "none" }}
            className="mb-3 flex w-[380px] max-w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-7.5rem)] flex-col overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface-1)/95 shadow-[0_8px_32px_rgba(124,58,237,0.15)] backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-(--color-border) bg-(--color-surface-1) p-4">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 text-fuchsia-400">
                  <Brain size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-(--color-text-primary)">DSA Club Intelligence</h3>
                  <p className="text-[10px] text-(--color-text-muted)">Contextual learning assistant</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="rounded-md p-1 text-(--color-text-muted) hover:bg-(--color-surface-2) hover:text-(--color-text-primary)">
                <ChevronDown size={18} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex h-[360px] max-h-[45vh] flex-col gap-4 overflow-y-auto p-4 scrollbar-thin">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center opacity-70">
                  <Sparkles size={32} className="mb-3 text-fuchsia-400/50" />
                  <p className="text-sm text-(--color-text-secondary)">How can I help you master {context.problem || context.mission || "this concept"}?</p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`flex size-6 shrink-0 items-center justify-center rounded-full ${msg.role === "user" ? "bg-purple-500/20 text-purple-400" : "bg-cyan-500/20 text-cyan-400"}`}>
                      {msg.role === "user" ? <User size={12} /> : <Bot size={12} />}
                    </div>
                    <div className={`rounded-xl px-3.5 py-2 text-xs leading-relaxed ${msg.role === "user" ? "bg-(--color-purple) text-white" : "bg-(--color-surface-2) border border-(--color-border) text-(--color-text-primary)"}`}>
                      {msg.content === "" && isLoading ? (
                        <div className="flex items-center gap-1.5 py-1">
                          <Loader2 size={12} className="animate-spin text-fuchsia-400" />
                          <span className="text-[10px] text-(--color-text-muted)">Analyzing context...</span>
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-(--color-border) bg-(--color-surface-1) p-3">
              {messages.length === 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {SUGGESTED_ACTIONS.map(action => (
                    <button
                      key={action}
                      onClick={() => handleAction(action)}
                      disabled={isLoading}
                      className="rounded-full border border-(--color-purple)/30 bg-(--color-purple-subtle) px-3 py-1 text-xs text-(--color-purple) transition hover:bg-(--color-purple)/20 disabled:opacity-50"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              )}
              <form 
                onSubmit={(e) => { e.preventDefault(); handleAction(customInput); }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={customInput}
                  onChange={e => setCustomInput(e.target.value)}
                  placeholder="Ask a question..."
                  className="flex-1 rounded-lg border border-(--color-border) bg-(--color-surface-2) px-3 py-2 text-sm text-(--color-text-primary) placeholder:text-(--color-text-muted) outline-none focus:border-(--color-purple)"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!customInput.trim() || isLoading}
                  className="flex size-9 items-center justify-center rounded-lg bg-fuchsia-500 text-white shadow-lg transition hover:bg-fuchsia-400 disabled:opacity-50"
                >
                  <Send size={14} className={customInput.trim() && !isLoading ? "translate-x-0.5" : ""} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isOpen && (
        <div className="group relative flex items-center justify-center">
          <div className="pointer-events-none absolute right-full mr-4 flex -translate-x-2 flex-col whitespace-nowrap rounded-xl border border-(--color-border) bg-(--color-surface-1)/95 px-4 py-2 opacity-0 shadow-xl backdrop-blur-xl transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100">
            <span className="text-sm font-semibold text-(--color-text-primary)">DSA Club Intelligence</span>
            <span className="text-xs text-(--color-text-muted)">Your DSA learning assistant</span>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Open DSA Club Intelligence"
            className="group/btn relative flex size-14 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-[0_8px_24px_rgba(168,85,247,0.4)] transition hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(168,85,247,0.5)] outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-bg)"
          >
            <div className="absolute inset-0 rounded-full bg-white opacity-0 transition group-hover/btn:opacity-20" />
            <Brain size={24} className="relative z-10" />
            <div className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-cyan-400 text-black">
              <Sparkles size={10} />
            </div>
          </button>
        </div>
      )}
    </div>
  );

  return typeof document !== "undefined" ? require("react-dom").createPortal(content, document.body) : null;
}
