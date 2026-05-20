import { useEffect } from "react";

export function useScrollToTop(dep?: unknown) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [dep]);
}
