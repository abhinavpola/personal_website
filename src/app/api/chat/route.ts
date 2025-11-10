import { OpenRouter } from "@openrouter/sdk";
import type { EventStream } from "@openrouter/sdk/lib/event-streams.js";
import type { ChatStreamingResponseChunkData } from "@openrouter/sdk/models/chatstreamingresponsechunk.js";
import type { Result } from "@openrouter/sdk/types";
import { ERR, OK } from "@openrouter/sdk/types/fp.js";
import { z } from "zod";


const client = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const MODELS = [
  "google/gemini-3-flash-preview",
  "z-ai/glm-4.5-air:free",
  "mistralai/devstral-2512:free",
];

const SYSTEM_PROMPT = `You are a helpful, friendly assistant created by Abhinav Pola. Abhinav Pola is a software engineer with experience at OpenRouter.ai and Google. He holds a B.S. in Computer Science and Astronomy from the University of Illinois at Urbana-Champaign (2018-2021).
At OpenRouter.ai, he worked on optimizing Cloudflare Workers APIs, building real-time evaluation pipelines, developing automation for provider onboarding, and improving user-facing features such as embeddings APIs and enterprise BYOK integrations. He also built CI and E2E testing systems from the ground up.
At Google, he built APIs and distributed data pipelines in C++, Go, and Java for YouTube, Nest, and Google Assistant, focusing on observability, debugging, and experiment analysis.
He has research experience in AI alignment (SPAR) and IoT systems (UIUC IoT Lab), with work spanning model evaluation, reinforcement learning, and robotics.
Provide concise and accurate responses.`;

function eventStreamToReadableStream(
  eventStream: EventStream<ChatStreamingResponseChunkData>,
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of eventStream) {
          const data = typeof chunk === "string" ? chunk : JSON.stringify(chunk);
          controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

function formatError(error: unknown) {
  if (!error) return "Unexpected error";
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

const chatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).default([]),
  token: z.string(),
});

const turnstileResponseSchema = z.object({
  success: z.boolean(),
});

const moderationResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z
          .object({
            content: z.string().optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

async function checkMessageModeration(userMessage: string): Promise<boolean> {
  try {
    const payload = {
      model: "meta-llama/Llama-Guard-4-12B",
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
    };

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return true;
    }

    const moderationJson = await response.json();
    const parsed = moderationResponseSchema.safeParse(moderationJson);
    if (!parsed.success) {
      return true;
    }
    const content = parsed.data.choices?.[0]?.message?.content ?? "";
    const firstWord = content.trim().split(/\s+/)[0]?.toLowerCase();
    return firstWord === "safe";
  } catch (error) {
    console.error("Moderation check failed", error);
    return true;
  }
}

async function handleChatRequest(
  request: Request,
): Promise<Result<EventStream<ChatStreamingResponseChunkData>, string>> {
  try {
    const requestJson = await request.json();
    const parsedRequest = chatRequestSchema.safeParse(requestJson);
    if (!parsedRequest.success) {
      return ERR("Invalid request payload");
    }
    const { messages, token } = parsedRequest.data;

    if (!token) {
      return ERR("Missing Turnstile token");
    }

    const tokenValidation = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: token,
        }),
      },
    );

    const validationJson = await tokenValidation.json();
    const validationResult = turnstileResponseSchema.safeParse(validationJson);
    if (!validationResult.success) {
      return ERR("Verification failed");
    }

    if (!validationResult.data.success) {
      return ERR("Verification failed");
    }

    const lastUserMessage = messages.filter((msg) => msg.role === "user").pop();
    if (lastUserMessage) {
      const isSafe = await checkMessageModeration(lastUserMessage.content);
      if (!isSafe) {
        return ERR(
          "Your message violates our content policy. Please try again with different content.",
        );
      }
    }

    if (!messages.some((msg) => msg.role === "system")) {
      messages.unshift({ role: "system", content: SYSTEM_PROMPT });
    }

    const stream = await client.chat.send({
      models: MODELS,
      messages,
      stream: true,
    });

    return OK(stream);
  } catch (error) {
    return ERR(formatError(error));
  }
}

export async function POST(request: Request) {
  const result = await handleChatRequest(request);

  if (result.ok) {
    return new Response(eventStreamToReadableStream(result.value), {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  return new Response(JSON.stringify({ error: result.error }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}
