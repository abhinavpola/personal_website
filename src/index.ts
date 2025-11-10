import { OpenRouter } from "@openrouter/sdk";
import type { EventStream } from "@openrouter/sdk/lib/event-streams.js";
import type { ChatStreamingResponseChunkData } from "@openrouter/sdk/models/chatstreamingresponsechunk.js";
import type { SendChatCompletionRequestResponse } from "@openrouter/sdk/models/operations";
import type { Result } from "@openrouter/sdk/types";
import { ERR, OK } from "@openrouter/sdk/types/fp.js";
import type { ChatMessage, Env } from "./types";

const client = new OpenRouter({
	apiKey: process.env.OPENROUTER_API_KEY,
});

const MODELS = [
	"google/gemini-2.5-flash-lite",
	"z-ai/glm-4.5-air:free",
	"meta-llama/llama-3.3-70b-instruct:free",
];

// Default system prompt
const SYSTEM_PROMPT = `
	You are a helpful, friendly assistant created by Abhinav Pola. Abhinav Pola is a software engineer with experience at OpenRouter.ai and Google. He holds a B.S. in Computer Science and Astronomy from the University of Illinois at Urbana-Champaign (2018-2021).
At OpenRouter.ai, he worked on optimizing Cloudflare Workers APIs, building real-time evaluation pipelines, developing automation for provider onboarding, and improving user-facing features such as embeddings APIs and enterprise BYOK integrations. He also built CI and E2E testing systems from the ground up.
At Google, he built APIs and distributed data pipelines in C++, Go, and Java for YouTube, Nest, and Google Assistant, focusing on observability, debugging, and experiment analysis.
He has research experience in AI alignment (SPAR) and IoT systems (UIUC IoT Lab), with work spanning model evaluation, reinforcement learning, and robotics.
	Provide concise and accurate responses.
	`;

function eventStreamToReadableStream(
	eventStream: EventStream<ChatStreamingResponseChunkData>,
): ReadableStream<Uint8Array> {
	return new ReadableStream({
		async start(controller) {
			try {
				for await (const chunk of eventStream) {
					// Encode chunk as string if it's an object
					const data =
						typeof chunk === "string" ? chunk : JSON.stringify(chunk);
					controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
				}
				controller.close();
			} catch (error) {
				controller.error(error);
			}
		},
	});
}

export default {
	/**
	 * Main request handler for the Worker
	 */
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		// Handle static assets (frontend)
		if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
			return env.ASSETS.fetch(request);
		}

		// API Routes
		if (url.pathname === "/api/chat") {
			// Handle POST requests for chat
			if (request.method === "POST") {
				const result = await handleChatRequest(request);
				if (result.ok) {
					console.log("Chat request succeeded, streaming response");
					return new Response(
						eventStreamToReadableStream(
							result.value as EventStream<ChatStreamingResponseChunkData>,
						),
						{
							status: 200,
							headers: { "Content-Type": "text/event-stream" },
						},
					);
				} else {
					console.error("Chat request failed:", result.error);
					return new Response(JSON.stringify({ error: result.error }), {
						status: 500,
					});
				}
			}

			// Method not allowed for other request types
			return new Response("Method not allowed", { status: 405 });
		}

		// Handle 404 for unmatched routes
		return new Response("Not found", { status: 404 });
	},
} satisfies ExportedHandler<Env>;

/**
 * Handles chat API requests
 */
async function handleChatRequest(
	request: Request,
): Promise<Result<SendChatCompletionRequestResponse>> {
	try {
		// Parse JSON request body
		const { messages = [] } = (await request.json()) as {
			messages: ChatMessage[];
		};

		// Add system prompt if not present
		if (!messages.some((msg) => msg.role === "system")) {
			messages.unshift({ role: "system", content: SYSTEM_PROMPT });
		}

		const response = await client.chat.send({
			models: MODELS,
			messages,
			stream: true,
		});

		// Return streaming response
		return OK(response);
	} catch (error) {
		console.error("Error processing chat request:", error);
		return ERR(error);
	}
}
