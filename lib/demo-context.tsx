"use client";
import { createContext, useContext, useState, useEffect } from "react";

const DemoCtx = createContext({ demo: false, setDemo: (v: boolean) => {} });
export const useDemo = () => useContext(DemoCtx);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("demo") === "true") setDemo(true);
    }
  }, []);
  return <DemoCtx.Provider value={{ demo, setDemo }}>{children}</DemoCtx.Provider>;
}
