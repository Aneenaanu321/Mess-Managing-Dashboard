"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { useAiChat } from "@/lib/ai";
import { Button, Card, Input } from "@/components/ui";
import { getPageLabel } from "@/lib/nav-labels";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Any unassigned leads?",
  "How's the pipeline looking?",
  "Any service contracts expiring soon?",
  "Do we have overdue invoices?",
  "Any open support tickets?",
];

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    `Hi! I'm your ${getPageLabel("/sales-assistant")}. Ask me about ${getPageLabel("/new-inquiries").toLowerCase()}, the ${getPageLabel("/deal-board").toLowerCase()}, ${getPageLabel("/service-contracts").toLowerCase()}, ${getPageLabel("/invoices-payments").toLowerCase()}, or ${getPageLabel("/customer-support").toLowerCase()} and I'll pull live numbers and give you a tip. I'm read-only — I never change any data.`,
};

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const chat = useAiChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(message: string) {
    const trimmed = message.trim();
    if (!trimmed || chat.isPending) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const result = await chat.mutateAsync(trimmed);
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: result.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: err instanceof Error ? `Sorry, something went wrong: ${err.message}` : "Sorry, something went wrong.",
        },
      ]);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Sparkles size={18} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-primary">{getPageLabel("/sales-assistant")}</h1>
          <p className="text-sm text-slate-500">Advisory only — reads live data, never changes it.</p>
        </div>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] whitespace-pre-line rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user" ? "bg-brand-600 text-white" : "bg-slate-100 text-primary"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {chat.isPending && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-500">Thinking…</div>
            </div>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2 border-t border-slate-100 dark:border-slate-700 px-4 py-3">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1 text-xs text-slate-600 hover:border-brand-300 hover:text-brand-700"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <form
          className="flex items-center gap-2 border-t border-slate-200 dark:border-slate-700 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <Input
            placeholder="Ask about leads, pipeline, AMC, invoices, tickets…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={chat.isPending}
          />
          <Button type="submit" disabled={chat.isPending || !input.trim()}>
            <Send size={16} />
          </Button>
        </form>
      </Card>
    </div>
  );
}
