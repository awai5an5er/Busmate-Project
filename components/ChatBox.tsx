"use client";

import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "admin" | "driver";
  driverId?: string | null;
  target: "admin" | "all" | "driver";
  targetDriverId?: string | null;
  message: string;
  createdAt: string;
};

export function ChatBox({ title }: { title: string }) {
  const { user, loading: loadingUser } = useCurrentUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [drivers, setDrivers] = useState<Array<{ id: string; name: string }>>([]);
  const [targetMode, setTargetMode] = useState<"all" | "driver">("all");
  const [targetDriverId, setTargetDriverId] = useState<string>("");
  const [clearing, setClearing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get<{ messages: ChatMessage[] }>(
        "/api/chat",
      );
      setMessages(data.messages ?? []);
      setError(null);
    } catch {
      setError("Could not load chat messages.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "admin" && drivers.length === 0) {
      void axios
        .get<{ drivers: Array<{ id: string; name: string }> }>(
          "/api/admin/drivers",
        )
        .then((response) => {
          setDrivers(response.data.drivers ?? []);
          if (!targetDriverId && response.data.drivers?.[0]) {
            setTargetDriverId(response.data.drivers[0].id);
          }
        })
        .catch(() => {
          setDrivers([]);
        });
    }
  }, [user?.role, drivers.length, targetDriverId]);

  useEffect(() => {
    void loadMessages();
    const timer = setInterval(() => {
      void loadMessages();
    }, 4000);
    return () => clearInterval(timer);
  }, [loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    const text = draft.trim();
    if (text.length === 0 || !user) return;
    setSending(true);

    const payload: Record<string, unknown> = { message: text };
    if (user.role === "admin") {
      payload.target = targetMode;
      if (targetMode === "driver") {
        if (!targetDriverId) {
          setError("Select a driver before sending a private message.");
          setSending(false);
          return;
        }
        payload.targetDriverId = targetDriverId;
      }
    } else {
      payload.target = "admin";
    }

    try {
      const { data } = await axios.post<{ message: ChatMessage }>(
        "/api/chat",
        payload,
      );
      setDraft("");
      setMessages((prev) => [...prev, data.message]);
      setError(null);
    } catch {
      setError("Could not send message.");
    } finally {
      setSending(false);
    }
  };

  const formattedMessages = useMemo(
    () =>
      messages.map((item) => {
        const isOwn = user?.id === item.senderId;
        const senderLabel = isOwn
          ? "You"
          : item.senderRole === "admin"
          ? "Admin"
          : item.senderName || "Driver";
        const targetLabel =
          item.senderRole === "admin"
            ? item.target === "all"
              ? "To: All Drivers"
              : item.target === "driver"
              ? `To: ${
                  drivers.find((driver) => driver.id === item.targetDriverId)
                    ?.name ?? "Driver"
                }`
              : "To: Admin"
            : "To: Admin";

        return {
          ...item,
          displayName: senderLabel,
          recipientLabel: targetLabel,
          timestamp: new Date(item.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          isOwn,
        };
      }),
    [messages, user?.id, drivers],
  );

  return (
    <div className="rounded-3xl border border-amber-400/20 bg-white/5 p-4 shadow-lg backdrop-blur">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-xs text-amber-200/70">
            Real-time chat between admin and drivers.
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            if (user?.role !== "admin" && user?.role !== "driver") return;
            setClearing(true);
            try {
              await axios.delete("/api/chat");
              setMessages([]);
              setError(null);
            } catch {
              setError("Could not clear chat for your account.");
            } finally {
              setClearing(false);
            }
          }}
          className="inline-flex items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={clearing || (user?.role !== "admin" && user?.role !== "driver")}
        >
          {clearing ? "Clearing..." : "Clear Chat"}
        </button>
      </div>
      {user?.role === "admin" && (
        <div className="mb-3 flex flex-col gap-3 rounded-3xl border border-amber-400/20 bg-slate-950/80 p-3 text-sm text-slate-100">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="text-xs uppercase tracking-[0.18em] text-amber-200/70">
              Send message to
            </label>
            <select
              value={targetMode}
              onChange={(event) =>
                setTargetMode(event.target.value as "all" | "driver")
              }
              className="w-full rounded-xl border border-slate-700/70 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-500 sm:w-auto"
            >
              <option value="all">All drivers</option>
              <option value="driver">Specific driver</option>
            </select>
          </div>
          {targetMode === "driver" && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="text-xs uppercase tracking-[0.18em] text-amber-200/70">
                Driver
              </label>
              <select
                value={targetDriverId}
                onChange={(event) => setTargetDriverId(event.target.value)}
                className="w-full rounded-xl border border-slate-700/70 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-500 sm:w-auto"
              >
                {drivers.length === 0 ? (
                  <option value="">Loading drivers...</option>
                ) : (
                  drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}
        </div>
      )}
      <div className="mb-3 min-h-[16rem] max-h-[26rem] overflow-y-auto rounded-3xl bg-slate-950/80 p-3 text-sm text-slate-100 shadow-inner">
        {loading && messages.length === 0 ? (
          <div className="space-y-2">
            <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-700" />
            <div className="h-4 w-1/2 animate-pulse rounded-full bg-slate-700" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-amber-200/70">
            No messages yet. Start the conversation.
          </p>
        ) : (
          <div className="space-y-3">
            {formattedMessages.map((message) => (
              <div
                key={message.id}
                className={`rounded-2xl p-3 ${message.isOwn ? "bg-amber-500/15 self-end" : "bg-white/5"}`}
              >
                <div className="mb-2 flex flex-col gap-1 text-[11px] uppercase tracking-[0.18em] text-amber-200/70 sm:flex-row sm:items-center sm:justify-between">
                  <span>{message.displayName}</span>
                  <span>{message.recipientLabel}</span>
                  <span>{message.timestamp}</span>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-100">
                  {message.message}
                </p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <div className="space-y-2">
        <textarea
          rows={3}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={loadingUser ? "Loading user..." : "Type a message..."}
          className="w-full resize-none rounded-2xl border border-slate-700/70 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
          disabled={loadingUser}
        />
        {error && (
          <p className="text-xs text-red-300">{error}</p>
        )}
        <button
          type="button"
          disabled={sending || loadingUser || draft.trim().length === 0}
          onClick={() => void handleSendMessage()}
          className="inline-flex items-center justify-center rounded-2xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? "Sending..." : "Send Message"}
        </button>
      </div>
    </div>
  );
}
