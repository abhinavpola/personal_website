"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";
import { makeMarkdownText, Thread } from "@assistant-ui/react-ui";
import { z } from "zod";

declare global {
  interface Window {
    turnstile?: {
      getResponse: (widgetId?: string) => string;
      reset: (widgetId?: string) => void;
      execute: (widgetId?: string) => void;
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          size: "invisible";
          theme?: "light" | "dark";
          callback: (token: string) => void;
        },
      ) => string;
    };
  }
}

const TURNSTILE_SITEKEY = "0x4AAAAAACADElPHjunPT9JB";
const isLocal = process.env.NODE_ENV === "development";

function getTurnstile() {
  if (typeof window === "undefined") {
    return undefined;
  }
  return window.turnstile;
}

const MarkdownText = makeMarkdownText();

const sseChunkSchema = z.object({
  choices: z
    .array(z.object({ delta: z.object({ content: z.string().nullable().optional() }) }))
    .optional(),
});

const WELCOME_MESSAGE =
  "Hello! I'm an assistant created by Abhinav Pola. How can I help you today?";

const SUGGESTIONS = [
  { prompt: "Who is Abhinav Pola?" },
  { prompt: "What is Abhinav currently working on?" },
  { prompt: "Cool things Abhinav has built?" },
];

export function ChatProvider() {
  const turnstileRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const pendingTokenRef = useRef<((token: string) => void) | null>(null);

  useEffect(() => {
    if (isLocal) {
      return;
    }
    let cancelled = false;
    let timeoutId: number | undefined;

    const tryRender = () => {
      if (cancelled || widgetIdRef.current) {
        return;
      }
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
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  const getTurnstileToken = () =>
    new Promise<string>((resolve) => {
      if (isLocal) {
        resolve("local");
        return;
      }
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

  const getTurnstileTokenRef = useRef(getTurnstileToken);
  useEffect(() => {
    getTurnstileTokenRef.current = getTurnstileToken;
  });

  const adapter = useMemo<ChatModelAdapter>(
    () => ({
      async *run({ messages }) {
        const apiMessages = messages.map((m) => ({
          role: m.role,
          content: m.content
            .filter((c): c is { type: "text"; text: string } => c.type === "text")
            .map((c) => c.text)
            .join(""),
        }));

        const token = await getTurnstileTokenRef.current();

        try {
          const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: apiMessages, token }),
          });

          if (!response.ok) {
            let errorMessage = "Failed to get response";
            try {
              const parsed = z
                .object({ error: z.string().optional() })
                .safeParse(await response.json());
              if (parsed.success && parsed.data.error) {
                errorMessage = parsed.data.error;
              }
            } catch {
              // ignore parse errors
            }
            throw new Error(errorMessage);
          }

          if (!response.body) {
            throw new Error("Response body is null");
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let accumulatedText = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const chunks = buffer.split("\n\n");
            buffer = chunks.pop() ?? "";

            for (const chunk of chunks) {
              const line = chunk.trim();
              if (!line.startsWith("data:")) {
                continue;
              }

              const data = line.replace(/^data:\s*/, "");
              if (!data || data === "[DONE]") {
                continue;
              }

              try {
                const result = sseChunkSchema.safeParse(JSON.parse(data));
                const delta = result.success ? result.data.choices?.[0]?.delta.content : undefined;
                if (typeof delta === "string") {
                  accumulatedText += delta;
                  yield { content: [{ type: "text" as const, text: accumulatedText }] };
                }
              } catch {
                // ignore malformed SSE chunks
              }
            }
          }
        } finally {
          if (!isLocal) {
            const turnstile = getTurnstile();
            if (turnstile && widgetIdRef.current) {
              turnstile.reset(widgetIdRef.current);
            }
          }
        }
      },
    }),
    [],
  );

  const runtime = useLocalRuntime(adapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div ref={turnstileRef} className="pointer-events-none invisible h-0 w-0" />
      <div className="h-full">
        <Thread
          assistantMessage={{ components: { Text: MarkdownText } }}
          welcome={{ message: WELCOME_MESSAGE, suggestions: SUGGESTIONS }}
        />
      </div>
    </AssistantRuntimeProvider>
  );
}
