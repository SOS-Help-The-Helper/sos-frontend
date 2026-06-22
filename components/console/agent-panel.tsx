/**
 * AgentPanel composite — the right-docked SOS Agent.
 * Header (status) + message list (quote style) + suggested-action chips + input.
 * Presentational: parent owns messages/handlers so it works in demo + live.
 * Redesign 2026-06.
 */
"use client";

import { useState, type ReactNode } from "react";
import { Send } from "lucide-react";
import { StatusDot } from "./primitives";
import type { StatusTone } from "./types";

export interface AgentMessage {
  id: string;
  role: "agent" | "user" | "system";
  text: ReactNode;
}
export interface AgentSuggestion {
  id: string;
  label: string;
  tone?: StatusTone;
  onSelect?: () => void;
}

export function AgentPanel({
  status = "Online",
  statusTone = "active",
  messages,
  suggestions,
  onSend,
  placeholder = "Tell the agent what to do…",
}: {
  status?: string;
  statusTone?: StatusTone;
  messages: AgentMessage[];
  suggestions?: AgentSuggestion[];
  onSend?: (text: string) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  function submit() {
    const t = draft.trim();
    if (!t) return;
    onSend?.(t);
    setDraft("");
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--cn-border)", display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            background: "color-mix(in srgb, var(--cn-coral) 88%, #000)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <StatusDot tone="new" size={8} pulse />
        </span>
        <div style={{ lineHeight: 1.25 }}>
          <div style={{ fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: 14, color: "var(--cn-text)" }}>SOS Agent</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--cn-text-3)" }}>
            <StatusDot tone={statusTone} size={6} />
            {status}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} style={{ alignSelf: "flex-end", maxWidth: "85%" }}>
              <div
                style={{
                  background: "var(--cn-surface-3)",
                  border: "1px solid var(--cn-border)",
                  borderRadius: "12px 12px 4px 12px",
                  padding: "8px 11px",
                  fontSize: 13,
                  color: "var(--cn-text-2)",
                }}
              >
                {m.text}
              </div>
            </div>
          ) : (
            <div
              key={m.id}
              style={{
                borderLeft: `2px solid ${m.role === "system" ? "var(--cn-blue)" : "var(--cn-coral)"}`,
                paddingLeft: 11,
                fontSize: 13,
                lineHeight: 1.55,
                color: m.role === "system" ? "var(--cn-text-3)" : "var(--cn-text-2)",
              }}
            >
              {m.text}
            </div>
          ),
        )}
      </div>

      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 14px 10px" }}>
          {suggestions.map((s) => (
            <button
              key={s.id}
              onClick={s.onSelect}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "var(--cn-surface-2)",
                border: "1px solid var(--cn-border-strong)",
                borderRadius: 999,
                padding: "5px 11px",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--cn-text-2)",
              }}
            >
              {s.tone && <StatusDot tone={s.tone} size={6} />}
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: 12, borderTop: "1px solid var(--cn-border)", display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder={placeholder}
          aria-label="Message the SOS Agent"
          style={{
            flex: 1,
            height: 38,
            background: "var(--cn-sunken)",
            border: "1px solid var(--cn-border)",
            borderRadius: 10,
            padding: "0 12px",
            color: "var(--cn-text)",
            fontFamily: "var(--font-sans)",
            fontSize: 13.5,
            outline: "none",
          }}
        />
        <button
          onClick={submit}
          aria-label="Send"
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: "var(--cn-coral)",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
