/**
 * LLM Chat App Frontend
 *
 * Handles the chat UI interactions and communication with the backend API.
 */

// DOM elements
const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const typingIndicator = document.getElementById("typing-indicator");

// Chat state
const chatHistory = [
	{
		role: "assistant",
		content:
			"Hello! I'm an assistant created by Abhinav Pola 🤖. How can I help you today?",
	},
];
let isProcessing = false;

// Auto-resize textarea as user types
userInput.addEventListener("input", function () {
	this.style.height = "auto";
	this.style.height = `${this.scrollHeight}px`;
});

// Send message on Enter (without Shift)
userInput.addEventListener("keydown", (e) => {
	if (e.key === "Enter" && !e.shiftKey) {
		e.preventDefault();
		sendMessage();
	}
});

// Send button click handler
sendButton.addEventListener("click", sendMessage);

/**
 * Sends a message to the chat API and processes the response
 */
async function sendMessage() {
	const message = userInput.value.trim();

	// Don't send empty messages
	if (message === "" || isProcessing) return;

	// Get the Turnstile token
	const token = turnstile.getResponse();
	if (!token) {
		addMessageToChat("assistant", "Please complete the verification challenge first.");
		return;
	}

	// Disable input while processing
	isProcessing = true;
	userInput.disabled = true;
	sendButton.disabled = true;

	// Add user message to chat
	addMessageToChat("user", message);

	// Clear input
	userInput.value = "";
	userInput.style.height = "auto";

	// Show typing indicator
	typingIndicator.classList.add("visible");

	// Add message to history
	chatHistory.push({ role: "user", content: message });

	try {
		// Create new assistant response element
		const assistantMessageEl = document.createElement("div");
		assistantMessageEl.className = "message assistant-message";
		assistantMessageEl.innerHTML = "<p></p>";
		chatMessages.appendChild(assistantMessageEl);

		// Scroll to bottom
		chatMessages.scrollTop = chatMessages.scrollHeight;

		// Send request to API
		const response = await fetch("/api/chat", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				messages: chatHistory,
				token: token,
			}),
		});

	// Handle errors
	if (!response.ok) {
		throw new Error("Failed to get response");
	}

	// Process streaming response
	if (!response.body) {
		throw new Error("Response body is null");
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let responseText = "";
	let buffer = "";

	while (true) {
		const { done, value } = await reader.read();

		if (done) {
			break;
		}

		// Decode chunk and add to buffer
		buffer += decoder.decode(value, { stream: true });

		// Split by \n\n (SSE message separator)
		const messages = buffer.split("\n\n");
		buffer = messages.pop() || ""; // Keep incomplete message in buffer

		for (const message of messages) {
			const line = message.trim();
			if (!line) continue;

			// Handle SSE "data: " prefix
			if (line.startsWith("data: ")) {
				try {
					const jsonData = JSON.parse(line.slice(6)); // Remove "data: " prefix
					// Extract content from OpenRouter response format
					if (jsonData.choices?.[0]?.delta?.content) {
						responseText += jsonData.choices[0].delta.content;
						assistantMessageEl.querySelector("p").textContent = responseText;

						// Scroll to bottom
						chatMessages.scrollTop = chatMessages.scrollHeight;
					}
				} catch (e) {
					console.error("Error parsing JSON:", e);
				}
			}
		}
	}

	// Add completed response to chat history
	chatHistory.push({ role: "assistant", content: responseText });
	} catch (error) {
		console.error("Error:", error);
		addMessageToChat(
			"assistant",
			"Sorry, there was an error processing your request.",
		);
	} finally {
		// Hide typing indicator
		typingIndicator.classList.remove("visible");

		// Reset Turnstile widget for next message
		if (window.turnstile) {
			turnstile.reset();
		}

		// Re-enable input
		isProcessing = false;
		userInput.disabled = false;
		sendButton.disabled = false;
		userInput.focus();
	}
}

/**
 * Helper function to add message to chat
 */
function addMessageToChat(role, content) {
	const messageEl = document.createElement("div");
	messageEl.className = `message ${role}-message`;
	messageEl.innerHTML = `<p>${content}</p>`;
	chatMessages.appendChild(messageEl);

	// Scroll to bottom
	chatMessages.scrollTop = chatMessages.scrollHeight;
}
