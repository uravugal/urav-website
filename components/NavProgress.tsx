"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  startNavProgress,
  doneNavProgress,
  subscribeNavProgress,
  getNavProgress,
  getServerNavProgress,
} from "@/lib/navProgress";

/**
 * Starts the bar on internal link clicks and back/forward, and finishes it
 * once the new route has rendered (pathname or query changed).
 * Mount once in the root layout, inside <Suspense> (uses useSearchParams).
 */
export function NavProgressTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    doneNavProgress();
  }, [pathname, searchParams]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as Element | null)?.closest?.("a");
      if (!anchor || !anchor.href) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;

      // Same page (or just a #hash jump) — no navigation to show.
      const current = window.location;
      if (url.pathname === current.pathname && url.search === current.search) return;

      startNavProgress();
    }

    function onPopState() {
      startNavProgress();
    }

    // Capture phase: Next's <Link> calls preventDefault on its own click.
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return null;
}

/**
 * The visible line. Position it with `className`
 * (e.g. on the bottom edge of the navbar, or fixed to the top).
 */
export function NavProgressBar({ className = "" }: { className?: string }) {
  const { value, visible } = useSyncExternalStore(
    subscribeNavProgress,
    getNavProgress,
    getServerNavProgress
  );

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none h-[3px] overflow-hidden transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      } ${className}`}
    >
      <div
        className="h-full origin-left bg-primary shadow-[0_0_8px_rgba(11,62,119,0.5)] transition-transform duration-200 ease-out motion-reduce:transition-none"
        style={{ transform: `scaleX(${value})` }}
      />
    </div>
  );
}
