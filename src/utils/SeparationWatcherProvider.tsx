import React, { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { useSeparationWatcher } from "./separationWatcher";

type SeparationWatcherContextValue = {
  watchJobId: string | null;
  setWatchJobId: (jobId: string | null) => void;
  watchStatus: string | null;
};

const SeparationWatcherContext = createContext<SeparationWatcherContextValue | undefined>(undefined);

export function SeparationWatcherProvider({ children }: { children: ReactNode }) {
  const [watchJobId, setWatchJobId] = useState<string | null>(null);
  const [watchStatus, setWatchStatus] = useState<string | null>(null);

  const handleStatusChange = useCallback((status: string | null) => {
    setWatchStatus(status);
  }, []);

  useSeparationWatcher(watchJobId, 3000, handleStatusChange);

  const value = useMemo(
    () => ({ watchJobId, setWatchJobId, watchStatus }),
    [watchJobId, watchStatus]
  );

  return (
    <SeparationWatcherContext.Provider value={value}>
      {children}
    </SeparationWatcherContext.Provider>
  );
}

export function useSeparationWatcherController() {
  const context = useContext(SeparationWatcherContext);

  if (!context) {
    throw new Error("useSeparationWatcherController must be used within SeparationWatcherProvider");
  }

  return context;
}
