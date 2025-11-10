import { Github, Linkedin } from "lucide-react";

import { ChatProvider } from "@/components/chat/chat-provider";

export default function Home() {
  return (
    <main className="mx-auto flex h-[100svh] max-w-4xl flex-col gap-6 overflow-hidden px-4 py-6 sm:py-10">
      <header className="flex items-center justify-between border-b border-border pb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Abhinav Pola
        </h1>
        <div className="flex items-center" style={{ gap: "0.75rem" }}>
          <a
            href="https://www.linkedin.com/in/abhinav-pola/"
            className="inline-flex text-muted-foreground transition hover:text-foreground"
            aria-label="LinkedIn"
            target="_blank"
            rel="noreferrer"
          >
            <Linkedin className="h-4 w-4" />
          </a>
          <a
            href="https://github.com/abhinavpola"
            className="inline-flex text-muted-foreground transition hover:text-foreground"
            aria-label="GitHub"
            target="_blank"
            rel="noreferrer"
          >
            <Github className="h-4 w-4" />
          </a>
        </div>
      </header>

      <div className="flex-1 min-h-0">
        <ChatProvider />
      </div>

      <footer className="border-t border-border pt-4 text-center text-sm text-muted-foreground">
        <p>Built with OpenRouter SDK and Cloudflare Workers</p>
      </footer>
    </main>
  );
}
