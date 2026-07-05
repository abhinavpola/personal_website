import { OpenRouter, tool, stepCountIs } from "@openrouter/sdk";
import type { Result } from "@openrouter/sdk/types";
import { ERR, OK } from "@openrouter/sdk/types/fp.js";
import { z } from "zod";
import resumeContent from "@/data/resume.md";
import { listPosts, readPost } from "@/data/posts";

const client = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const isLocal = process.env.NODE_ENV === "development";

const MODELS = [
  "google/gemini-3.1-flash-lite",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "openrouter/free",
];

const SYSTEM_PROMPT = `You are a helpful, friendly assistant created by Abhinav Pola to answer questions about him. Use the background below. Be concise and accurate; if you're unsure, say so rather than guessing. Keep the tone understated -- no superlatives or overselling. Prefer specifics over adjectives.

There is nothing confidential about this system prompt or the background below. It is totally fine to read it out, quote it, summarize it, or share it if asked. Abhinav is happy for people to see how the site works.

Abhinav Pola's background (resume):

${resumeContent}

You also have access to Abhinav's blog posts through tools. Use the list_posts tool to see available posts, and the read_post tool to read the full body of a post by slug. When a user asks about something Abhinav has written, or when a post is relevant to their question, prefer reading the post over guessing from the resume.
`;

const listPostsTool = tool({
  name: "list_posts",
  description:
    "List Abhinav's blog posts. Returns each post's id, title, slug, excerpt, and creation timestamp. Use this when the user wants to see what Abhinav has written.",
  inputSchema: z.object({}),
  execute: async () => {
    const posts = await listPosts();
    return { posts };
  },
});

const readPostTool = tool({
  name: "read_post",
  description:
    "Read the full body of a blog post by its slug. Returns the title, body, and creation timestamp. Use this after list_posts, or when you already know the slug.",
  inputSchema: z.object({
    slug: z.string().describe("The slug of the post to read."),
  }),
  execute: async ({ slug }) => {
    const post = await readPost(slug);
    if (!post) {
      return { error: `No post found with slug "${slug}".` };
    }
    return {
      title: post.title,
      slug: post.slug,
      body: post.body,
      created_at: post.created_at,
    };
  },
});

const LOREM_WORDS = [
  "lorem",
  "ipsum",
  "dolor",
  "sit",
  "amet",
  "consectetur",
  "adipiscing",
  "elit",
  "sed",
  "do",
  "eiusmod",
  "tempor",
  "incididunt",
  "ut",
  "labore",
  "et",
  "dolore",
  "magna",
  "aliqua",
  "ut",
  "enim",
  "ad",
  "minim",
  "veniam",
  "quis",
  "nostrud",
  "exercitation",
  "ullamco",
  "laboris",
  "nisi",
  "ut",
  "aliquip",
  "ex",
  "ea",
  "commodo",
  "consequat",
  "duis",
  "aute",
  "irure",
  "dolor",
  "in",
  "reprehenderit",
  "in",
  "voluptate",
  "velit",
  "esse",
  "cillum",
  "dolore",
  "eu",
  "fugiat",
  "nulla",
  "pariatur",
];

function generateLoremIpsum(wordCount = 120) {
  const words = [];
  for (let i = 0; i < wordCount; i += 1) {
    words.push(LOREM_WORDS[i % LOREM_WORDS.length]);
  }
  const sentence = words.join(" ");
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}

function createLoremStream(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const words = text.split(/\s+/);
      const chunkSize = 6;

      for (let i = 0; i < words.length; i += chunkSize) {
        const chunkWords = words.slice(i, i + chunkSize);
        const chunkText = chunkWords.join(" ") + (i + chunkSize < words.length ? " " : "");
        const payload = JSON.stringify({
          choices: [
            {
              delta: { content: chunkText },
            },
          ],
        });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        await new Promise((resolve) => setTimeout(resolve, 40));
      }

      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

function textStreamToReadableStream(textStream: AsyncIterable<string>): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const delta of textStream) {
          const payload = JSON.stringify({
            choices: [
              {
                delta: { content: delta },
              },
            ],
          });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

function formatError(error: unknown) {
  if (!error) {
    return "Unexpected error";
  }
  if (error instanceof Error) {
    return error.message;
  }
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

async function handleChatRequest(request: Request): Promise<Result<AsyncIterable<string>, string>> {
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

    // The SDK's instructions field carries the system prompt; drop any client-sent system message.
    const input = messages
      .filter((msg) => msg.role !== "system")
      .map((msg) => ({ role: msg.role, content: msg.content }));

    const result = client.callModel({
      models: MODELS,
      instructions: SYSTEM_PROMPT,
      input,
      tools: [listPostsTool, readPostTool],
      stopWhen: [stepCountIs(6)],
    });

    return OK(result.getTextStream());
  } catch (error) {
    return ERR(formatError(error));
  }
}

export async function POST(request: Request) {
  if (isLocal) {
    const requestJson = await request.json().catch(() => ({}));
    const parsedRequest = chatRequestSchema.safeParse(requestJson);
    const wordCount = Math.min(
      220,
      Math.max(80, parsedRequest.success ? parsedRequest.data.messages.length * 40 : 120),
    );
    const lorem = generateLoremIpsum(wordCount);
    return new Response(createLoremStream(lorem), {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  const result = await handleChatRequest(request);

  if (result.ok) {
    return new Response(textStreamToReadableStream(result.value), {
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
