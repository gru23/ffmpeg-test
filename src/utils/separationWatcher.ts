import { useEffect } from "react";
import { showToast } from "../shared/toastHelper";
import { getStatus } from "../services/separationService";
import { SeparationStatus } from "../models/separations-jobs/SeparationStatus";

// custom hook
export function useSeparationWatcher(
  jobId: string | null,
  intervalMs: number = 5000,
  onStatusChange?: (status: string | null) => void
) {
  useEffect(() => {
    // notify immediately when no job
    if (!jobId) {
      onStatusChange?.(null);
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const checkStatus = async () => {
      try {
        const response = await getStatus(jobId);
        console.log("Status:", response.status);
        const normalizedStatus =
          typeof response.status === "string"
            ? response.status
            : SeparationStatus[response.status];

        if (cancelled) return;

        // inform whoever registered
        onStatusChange?.(normalizedStatus ?? null);

        if (normalizedStatus === "DONE") {
          showToast("success", "Separation finished", "Your audio file is ready.");
          return;
        }

        if (normalizedStatus === "FAILED") {
          showToast("error", "Separation failed", "Unknown error");
          return;
        }

        timeoutId = setTimeout(checkStatus, intervalMs);
      } catch (err) {
        console.error("Error checking status:", err);
        onStatusChange?.(null);
      }
    };

    timeoutId = setTimeout(checkStatus, intervalMs);

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [jobId, intervalMs, onStatusChange]);
}
