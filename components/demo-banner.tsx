"use client";
import { useDemo } from "@/lib/demo-context";

export function DemoBanner() {
  const { demo, setDemo } = useDemo();
  if (!demo) return null;

  function exitDemo() {
    setDemo(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("demo");
      window.history.replaceState({}, "", url.toString());
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500/90 h-8 flex items-center justify-center font-mono text-xs text-black gap-4">
      <span>DEMO MODE — This is sample data. Your real data will appear after onboarding.</span>
      <button
        onClick={exitDemo}
        className="underline font-bold hover:opacity-70"
      >
        Exit Demo
      </button>
    </div>
  );
}
