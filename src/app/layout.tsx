import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import Script from "next/script";

import "./globals.css";

export const metadata: Metadata = {
  title: "Abhinav Pola",
  description: "A simple chat application powered by Cloudflare Workers.",
};

const isLocal = process.env.NODE_ENV === "development";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {isLocal ? null : <link rel="preconnect" href="https://challenges.cloudflare.com" />}
      </head>
      <body
        className={`${spaceGrotesk.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
      >
        {isLocal ? null : (
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            async
            defer
            strategy="afterInteractive"
          />
        )}
        {children}
      </body>
    </html>
  );
}
