"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ui/conversation";
import { Response } from "@/components/ui/response";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ShimmeringText } from "@/components/ui/shimmering-text";
import type { ChatMessage, ChatMessageWithId } from "@/types/chat";

const INTRO_MESSAGE = "Hello! I'm an assistant created by Abhinav Pola. How can I help you today?";
const TURNSTILE_SITEKEY = "0x4AAAAAACADElPHjunPT9JB";

const errorResponseSchema = z.object({
  error: z.string().optional(),
});

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `msg_${Math.random().toString(16).slice(2)}`;
}

function getTurnstile() {
  if (typeof window === "undefined") return undefined;
  return (
    window as typeof window & {
      turnstile?: {
        getResponse: (widgetId?: string) => string;
        reset: (widgetId?: string) => void;
        execute: (widgetId?: string) => void;
        render: (
          container: HTMLElement,
          options: { sitekey: string; size: "invisible"; theme?: "light" | "dark"; callback: (token: string) => void },
        ) => string;
      };
    }
  ).turnstile;
}

function safeJsonParse<T>(value: string, schema: z.ZodSchema<T>) {
  try {
    const parsed = JSON.parse(value);
    return schema.safeParse(parsed);
  } catch {
    return schema.safeParse(undefined);
  }
}

export function ChatApp() {
  const [messages, setMessages] = useState<ChatMessageWithId[]>([
    { id: createId(), role: "assistant", content: INTRO_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const turnstileRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const pendingTokenRef = useRef<((token: string) => void) | null>(null);

  const payloadHistory = useMemo(() => {
    return messages.map(({ role, content }) => ({ role, content }));
  }, [messages]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;

    const tryRender = () => {
      if (cancelled || widgetIdRef.current) return;
      const turnstile = getTurnstile();
      if (turnstile && turnstileRef.current) {
        widgetIdRef.current = turnstile.render(turnstileRef.current, {
          sitekey: TURNSTILE_SITEKEY,
          size: "invisible",
          theme: "light",
          callback: (token) => {
            pendingTokenRef.current?.(token);
            pendingTokenRef.current = null;
          },
        });
        return;
      }
      timeoutId = window.setTimeout(tryRender, 300);
    };

    tryRender();

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  const getTurnstileToken = () =>
    new Promise<string>((resolve) => {
      const turnstile = getTurnstile();
      const widgetId = widgetIdRef.current ?? undefined;
      if (!turnstile || !widgetId) {
        resolve("");
        return;
      }
      const existing = turnstile.getResponse(widgetId);
      if (existing) {
        resolve(existing);
        return;
      }
      pendingTokenRef.current = resolve;
      turnstile.execute(widgetId);
      window.setTimeout(() => {
        if (pendingTokenRef.current === resolve) {
          pendingTokenRef.current = null;
          resolve("");
        }
      }, 8000);
    });

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || isProcessing || isVerifying) return;

    setIsVerifying(true);
    const token = await getTurnstileToken();
    setIsVerifying(false);
    if (!token) {
      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: "assistant",
          content: "Please complete the verification challenge first.",
        },
      ]);
      return;
    }

    setIsProcessing(true);
    setIsTyping(true);
    setInput("");

    const userMessage: ChatMessageWithId = {
      id: createId(),
      role: "user",
      content,
    };
    const assistantMessage: ChatMessageWithId = {
      id: createId(),
      role: "assistant",
      content: "",
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);

    const requestMessages: ChatMessage[] = [
      ...payloadHistory,
      { role: userMessage.role, content: userMessage.content },
    ];

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: requestMessages,
          token,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to get response";
        try {
          const errorJson = await response.json();
          const parsedError = errorResponseSchema.safeParse(errorJson);
          if (parsedError.success && parsedError.data.error) {
            errorMessage = parsedError.data.error;
          }
        } catch (error) {
          console.error("Failed to parse error response", error);
        }
        throw new Error(errorMessage);
      }

      if (!response.body) {
        throw new Error("Response body is null");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let responseText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const line = chunk.trim();
          if (!line.startsWith("data:")) continue;

          const data = line.replace(/^data:\s*/, "");
          if (!data || data === "[DONE]") continue;

          const parsedChunk = safeJsonParse(
            data,
            z.object({
              choices: z
                .array(
                  z.object({
                    delta: z
                      .object({
                        content: z.string().optional(),
                      })
                      .optional(),
                  }),
                )
                .optional(),
            }),
          );
          if (parsedChunk.success) {
            const delta = parsedChunk.data.choices?.[0]?.delta?.content;
            if (typeof delta === "string") {
              responseText += delta;
              setMessages((prev) =>
                prev.map((message) =>
                  message.id === assistantMessage.id
                    ? { ...message, content: responseText }
                    : message,
                ),
              );
            }
          }
        }
      }

      setIsTyping(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Sorry, there was an error processing your request.";
      setMessages((prev) =>
        prev
          .filter((message) => message.id !== userMessage.id)
          .map((message) =>
            message.id === assistantMessage.id ? { ...message, content: errorMessage } : message,
          ),
      );
    } finally {
      const turnstile = getTurnstile();
      if (turnstile && widgetIdRef.current) {
        turnstile.reset(widgetIdRef.current);
      }
      setIsTyping(false);
      setIsProcessing(false);
    }
  };

  return (
    <Card className="flex h-full flex-col overflow-hidden border-border bg-card shadow-[0_18px_50px_-32px_rgba(15,23,42,0.35)]">
      <div ref={turnstileRef} className="pointer-events-none invisible h-0 w-0" />
      <CardContent className="flex flex-1 min-h-0 flex-col p-0">
        <Conversation className="min-h-0 bg-background">
          <ConversationContent className="space-y-4 px-6 py-6">
            {messages.map((message) => {
              const isUser = message.role === "user";
              return (
                <div
                  key={message.id}
                  className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                    isUser
                      ? "ml-auto bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-card-foreground shadow-sm"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <Response className="text-sm leading-6 [&_a]:underline [&_a]:underline-offset-4">
                      {message.content}
                    </Response>
                  ) : (
                    <p>{message.content}</p>
                  )}
                </div>
              );
            })}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </CardContent>

      {isTyping || isVerifying ? (
        <div className="border-t border-border bg-background px-6 py-2 text-xs">
          <ShimmeringText
            text={isVerifying ? "Verifying..." : "Thinking..."}
            className="text-xs font-semibold tracking-wide"
            startOnView={false}
            repeatDelay={0.2}
            duration={1.3}
            color="hsl(var(--muted-foreground))"
            shimmerColor="hsl(var(--foreground))"
          />
        </div>
      ) : null}

      <CardFooter className="border-t border-border bg-background px-6 py-4">
        <div className="flex w-full items-center overflow-hidden rounded-2xl border border-border bg-white shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
          <Textarea
            ref={textareaRef}
            id="user-input"
            placeholder="Type your message here..."
            rows={1}
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              event.currentTarget.style.height = "auto";
              event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            disabled={isProcessing || isVerifying}
            className="min-h-[52px] flex-1 resize-none px-4 py-3"
          />
          <Button
            disabled={isProcessing || isVerifying || input.trim().length === 0}
            onClick={() => void sendMessage()}
            type="button"
            className="h-[52px] shrink-0 rounded-none rounded-r-2xl px-6 text-sm font-semibold"
          >
            {isProcessing ? "Sending..." : "Send"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
