"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, MessageSquare } from "lucide-react";
import { api } from "@/lib/api";

interface ChatMessage {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  author_name?: string;
  created_at?: string;
}

interface ChatPanelProps {
  entityType: string;
  entityId: string;
  orgId: string;
  onClose: () => void;
  open: boolean;
}

function formatTimestamp(ts?: string) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return ts;
  }
}

export function ChatPanel({ entityType, entityId, orgId, onClose, open }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    api.efCall("crm-chat", {
      action: "list_messages",
      entity_type: entityType,
      entity_id: entityId,
      org_id: orgId,
    })
      .then((data: unknown) => {
        if (cancelled) return;
        const arr = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.messages)
          ? (data as any).messages
          : [];
        setMessages(arr as ChatMessage[]);
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      });
    return () => { cancelled = true; };
  }, [open, entityType, entityId, orgId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);

    const optimistic: ChatMessage = {
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");

    try {
      const result = await api.efCall("crm-chat", {
        action: "send_message",
        entity_type: entityType,
        entity_id: entityId,
        org_id: orgId,
        content: text,
        role: "user",
      });
      // If EF returns updated message list, use it; otherwise keep optimistic
      const arr = Array.isArray(result)
        ? result
        : Array.isArray((result as any)?.messages)
        ? (result as any).messages
        : null;
      if (arr) setMessages(arr as ChatMessage[]);
    } catch {
      // Fall back to /api/chat
      try {
        const res = await fetch(`/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: text }],
            entityType,
            entityId,
          }),
        });
        if (res.ok) {
          const aiReply = await res.text();
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: aiReply,
              created_at: new Date().toISOString(),
            },
          ]);
        }
      } catch {
        // leave optimistic message, user can retry
      }
    } finally {
      setSending(false);
    }
  }, [input, sending, entityType, entityId, orgId]);

  return (
    <>
      {/* Backdrop (mobile) */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full w-[380px] z-40 flex flex-col bg-[#0F1E2B] border-l border-white/10 shadow-2xl"
        style={{
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 200ms ease",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 h-12 px-4 border-b border-white/10 shrink-0">
          <MessageSquare size={14} className="text-[#89CFF0]" />
          <span className="flex-1 text-[13px] font-medium text-white/85">Chat</span>
          <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/35 pr-2">
            {entityType} · {(entityId ?? "").slice(0, 8)}
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md hover:bg-white/8 text-white/45 hover:text-white flex items-center justify-center transition"
            aria-label="Close chat"
          >
            <X size={14} />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
        >
          {messages.length === 0 && (
            <p className="text-[12px] text-white/35 text-center py-6">
              No messages yet. Start the conversation.
            </p>
          )}
          {messages.map((msg, i) => {
            const isUser = msg.role === "user";
            const isSystem = msg.role === "system";

            if (isSystem) {
              return (
                <div key={msg.id ?? i} className="flex justify-center">
                  <div className="max-w-[85%] text-center">
                    <p className="text-[11.5px] text-white/40 italic leading-snug">{msg.content}</p>
                    {msg.created_at && (
                      <span className="font-mono text-[9.5px] text-white/25 block mt-0.5">
                        {formatTimestamp(msg.created_at)}
                      </span>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id ?? i}
                className={`flex flex-col gap-0.5 ${isUser ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-1.5 px-0.5">
                  {!isUser && (
                    <span className="text-[11px] text-white/50 font-medium">
                      {msg.author_name ?? "Agent"}
                    </span>
                  )}
                  {msg.created_at && (
                    <span className="font-mono text-[9.5px] text-white/30">
                      {formatTimestamp(msg.created_at)}
                    </span>
                  )}
                  {isUser && (
                    <span className="text-[11px] text-white/50 font-medium">
                      {msg.author_name ?? "You"}
                    </span>
                  )}
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-snug ${
                    isUser
                      ? "bg-[#EF4E4B]/80 text-white rounded-tr-sm"
                      : "bg-[#1B3A57] text-white/90 rounded-tl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })}
        </div>

        {/* Input bar */}
        <div className="border-t border-white/10 px-3 py-3 shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message…"
              rows={2}
              disabled={sending}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[13px] text-white placeholder:text-white/35 focus:outline-none focus:border-white/20 resize-none disabled:opacity-50"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#89CFF0]/15 hover:bg-[#89CFF0]/25 text-[#89CFF0] text-[12px] font-medium transition disabled:opacity-40 shrink-0"
              aria-label="Send message"
            >
              <Send size={12} />
              {sending ? "…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
