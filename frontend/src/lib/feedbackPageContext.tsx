"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type FeedbackPageLocation = {
  /** Main screen, e.g. "Dashboard", "Manage schedule" */
  screen?: string;
  /** Tab within a screen, e.g. "Counseling", "Platform" */
  tab?: string;
  /** Sub-section, e.g. "Upcoming sessions", "Session notes" */
  section?: string;
};

type FeedbackPageContextValue = {
  location: FeedbackPageLocation | null;
  setLocation: (location: FeedbackPageLocation | null) => void;
};

const FeedbackPageContext = createContext<FeedbackPageContextValue | null>(null);

export function FeedbackPageProvider({ children }: { children: ReactNode }) {
  const [location, setLocationState] = useState<FeedbackPageLocation | null>(null);

  const setLocation = useCallback((next: FeedbackPageLocation | null) => {
    setLocationState(next);
  }, []);

  const value = useMemo(() => ({ location, setLocation }), [location, setLocation]);

  return <FeedbackPageContext.Provider value={value}>{children}</FeedbackPageContext.Provider>;
}

export function useFeedbackPageLocation(parts: FeedbackPageLocation | null) {
  const ctx = useContext(FeedbackPageContext);
  const screen = parts?.screen ?? "";
  const tab = parts?.tab ?? "";
  const section = parts?.section ?? "";

  useEffect(() => {
    if (!ctx) return;
    if (!parts || (!screen && !tab && !section)) {
      ctx.setLocation(null);
      return;
    }
    ctx.setLocation(parts);
    return () => ctx.setLocation(null);
  }, [ctx, screen, tab, section, parts]);
}

export function useFeedbackPageLocationSnapshot(): FeedbackPageLocation | null {
  const ctx = useContext(FeedbackPageContext);
  return ctx?.location ?? null;
}
