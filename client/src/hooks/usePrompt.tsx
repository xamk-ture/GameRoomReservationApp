import { useEffect, useRef } from "react";
import { useBlocker } from "react-router-dom";

export function usePrompt(message: string, when: boolean = true) {
  // Use ref to track if we should actually block
  // This prevents creating multiple blockers when 'when' changes rapidly
  const whenRef = useRef<boolean>(when);
  whenRef.current = when;

  // Create blocker - React Router handles cleanup automatically
  // But we need to ensure we don't create multiple active blockers
  const blocker = useBlocker(whenRef.current);

  useEffect(() => {
    if (blocker.state === "blocked") {
      // Only show prompt if we're still supposed to block
      if (whenRef.current) {
        const proceed = window.confirm(message);
        if (proceed) {
          blocker.proceed();
        } else {
          blocker.reset();
        }
      } else {
        // If 'when' changed to false while blocked, just proceed
        blocker.proceed();
      }
    }
  }, [blocker, message]);

  // Add a beforeunload listener for page reloads or closing the tab/window
  useEffect(() => {
    if (!when) return; // Don't add listener if not blocking
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      return message;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [when, message]);
}
