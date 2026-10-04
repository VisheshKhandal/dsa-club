"use client";

import React, { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

export function ClickRipple() {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const clickable = target.closest("button, a, [role='button']");
      if (!clickable) return;

      const rect = clickable.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.5;
      const x = e.clientX;
      const y = e.clientY;

      const newRipple: Ripple = {
        id: Date.now() + Math.random(),
        x,
        y,
        size,
      };

      setRipples((prev) => [...prev, newRipple]);

      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 450);
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [reduced]);

  if (reduced || ripples.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[99990] overflow-hidden" aria-hidden="true">
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="fixed rounded-full pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
            marginLeft: -ripple.size / 2,
            marginTop: -ripple.size / 2,
            backgroundColor: "rgba(183, 243, 107, 0.22)",
            transform: "scale(0)",
            animation: "landing-ripple 400ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
          }}
        />
      ))}
      <style jsx global>{`
        @keyframes landing-ripple {
          0% {
            transform: scale(0);
            opacity: 0.5;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
