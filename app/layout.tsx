import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shared Brain Switchboard",
  description:
    "A sandbox board that shows which agent wrote what in a shared Notion memory, including a real handoff pickup.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
