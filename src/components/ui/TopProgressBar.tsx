"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout[]>([]);
  const isNavigatingRef = useRef(false);

  const clearTimers = () => {
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
  };

  const start = () => {
    clearTimers();
    isNavigatingRef.current = true;
    setVisible(true);
    setProgress(25);

    // Progressive trickling while waiting for server response
    const t1 = setTimeout(() => {
      if (isNavigatingRef.current) setProgress(55);
    }, 250);

    const t2 = setTimeout(() => {
      if (isNavigatingRef.current) setProgress(75);
    }, 750);

    const t3 = setTimeout(() => {
      if (isNavigatingRef.current) setProgress(88);
    }, 1800);

    // Failsafe auto-complete if navigation takes abnormally long
    const t4 = setTimeout(() => {
      if (isNavigatingRef.current) {
        setProgress(95);
      }
    }, 5000);

    timerRef.current = [t1, t2, t3, t4];
  };

  const finish = () => {
    clearTimers();
    if (!isNavigatingRef.current && !visible) return;
    
    isNavigatingRef.current = false;
    setProgress(100);

    const tClose = setTimeout(() => {
      setVisible(false);
      const tReset = setTimeout(() => {
        setProgress(0);
      }, 200);
      timerRef.current.push(tReset);
    }, 220);

    timerRef.current.push(tClose);
  };

  // Complete progress bar whenever route completes transition
  useEffect(() => {
    finish();
  }, [pathname, searchParams]);

  // Intercept global clicks on internal links to trigger instantly at 0ms
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Ignore right click or modifier keys (new tab, new window)
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) {
        return;
      }

      const anchor = (e.target as HTMLElement)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      const target = anchor.getAttribute("target");

      // Ignore empty, anchor-only, external, or new-tab links
      if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:") || target === "_blank") {
        return;
      }

      try {
        const url = new URL(href, window.location.origin);
        // Ignore external domains
        if (url.origin !== window.location.origin) return;

        // Ignore same URL navigation
        if (url.pathname === window.location.pathname && url.search === window.location.search) {
          return;
        }

        // Start instant 0ms top progress bar
        start();
      } catch {
        // Ignore invalid URLs
      }
    };

    document.addEventListener("click", handleDocumentClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
      clearTimers();
    };
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[999999] pointer-events-none h-[3px] overflow-hidden"
    >
      <div
        className="h-full bg-gradient-to-r from-(--accent-lime) to-(--accent-lime-dark) transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
          boxShadow: "0 0 10px rgba(183, 243, 107, 0.8), 0 0 5px rgba(183, 243, 107, 0.9)",
          transitionProperty: "width, opacity",
          transitionDuration: progress === 100 ? "150ms" : "250ms",
        }}
      />
    </div>
  );
}
