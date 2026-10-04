"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { popoverEnter } from "@/components/motion";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let globalShowToast: ((type: ToastType, message: string) => void) | null = null;

export const toast = {
  success: (message: string) => globalShowToast?.("success", message),
  error: (message: string) => globalShowToast?.("error", message),
  info: (message: string) => globalShowToast?.("info", message),
  warning: (message: string) => globalShowToast?.("warning", message),
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => {
      // Max 3 toasts: drop oldest if exceeding
      const updated = [...prev, { id, type, message }];
      if (updated.length > 3) {
        return updated.slice(updated.length - 3);
      }
      return updated;
    });

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  useEffect(() => {
    globalShowToast = showToast;
    return () => {
      if (globalShowToast === showToast) {
        globalShowToast = null;
      }
    };
  }, [showToast]);

  const value: ToastContextValue = {
    showToast,
    success: (msg) => showToast("success", msg),
    error: (msg) => showToast("error", msg),
    info: (msg) => showToast("info", msg),
    warning: (msg) => showToast("warning", msg),
    removeToast,
  };

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="size-4 text-(--color-green) shrink-0" />,
    error: <AlertCircle className="size-4 text-(--color-red) shrink-0" />,
    info: <Info className="size-4 text-(--color-purple) shrink-0" />,
    warning: <AlertTriangle className="size-4 text-(--color-orange) shrink-0" />,
  };

  const borderStyles: Record<ToastType, string> = {
    success: "border-(--color-green)/60 bg-(--color-surface-1)/95 text-(--color-text-primary)",
    error: "border-(--color-red)/60 bg-(--color-surface-1)/95 text-(--color-text-primary)",
    info: "border-(--color-purple)/60 bg-(--color-surface-1)/95 text-(--color-text-primary)",
    warning: "border-(--color-orange)/60 bg-(--color-surface-1)/95 text-(--color-text-primary)",
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container fixed bottom-right */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2.5 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((item) => (
            <motion.div
              key={item.id}
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={popoverEnter}
              onClick={() => removeToast(item.id)}
              className={cn(
                "pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-(--radius-card) border shadow-xl backdrop-blur-md cursor-pointer transition-[transform,border-color,background-color] duration-150 hover:-translate-y-px",
                borderStyles[item.type]
              )}
              role="status"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {icons[item.type]}
                <p className="text-sm font-medium text-(--color-text-primary) break-words">
                  {item.message}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeToast(item.id);
                }}
                className="text-(--color-text-muted) hover:text-(--color-text-primary) transition-colors p-1"
                aria-label="Close notification"
              >
                <X className="size-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: (type: ToastType, message: string) => globalShowToast?.(type, message),
      success: (msg: string) => globalShowToast?.("success", msg),
      error: (msg: string) => globalShowToast?.("error", msg),
      info: (msg: string) => globalShowToast?.("info", msg),
      warning: (msg: string) => globalShowToast?.("warning", msg),
      removeToast: () => {},
    };
  }
  return context;
}
